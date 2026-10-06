# Plugin data for the end-to-end checks, run by .codex/start_server.sh after the
# generic seed. Idempotent. Needs the test LDAP server from .codex/start_ldap.sh
# (ldap://localhost:3389, dc=redmine,dc=org) for the sync itself; the pages work
# without it.
#
#   "E2E LDAP"       the test slapd, sync enabled with the settings of the
#                    plugin's own test fixtures (create users and groups,
#                    sync on login, nested and dynamic groups, fixed group)
#   "E2E LDAP down"  a port where nothing listens, sync not configured
#   user custom fields "Preferred Language" and "Uid Number", group custom
#   field "Description", synced from LDAP

def e2e_custom_field(klass, name, attrs = {})
  klass.find_by(name: name) || klass.create!({ name: name, field_format: 'string' }.merge(attrs))
end

language = e2e_custom_field(UserCustomField, 'Preferred Language')
uid_number = e2e_custom_field(UserCustomField, 'Uid Number')
description = e2e_custom_field(GroupCustomField, 'Description')

ldap = AuthSourceLdap.find_by(name: 'E2E LDAP') || AuthSourceLdap.new(name: 'E2E LDAP')
ldap.attributes = { host: '127.0.0.1', port: 3389, base_dn: 'dc=redmine,dc=org',
                    account: 'cn=admin,dc=redmine,dc=org', account_password: 'password',
                    attr_login: 'uid', attr_firstname: 'givenName', attr_lastname: 'sn',
                    attr_mail: 'mail', onthefly_register: true }
ldap.save!

down = AuthSourceLdap.find_by(name: 'E2E LDAP down') || AuthSourceLdap.new(name: 'E2E LDAP down')
down.attributes = { host: '127.0.0.1', port: 3390, base_dn: 'dc=example,dc=net',
                    attr_login: 'uid', attr_firstname: 'givenName', attr_lastname: 'sn',
                    attr_mail: 'mail', onthefly_register: false }
down.save!

settings = (Setting.plugin_redmine_ldap_sync || {}).to_h.with_indifferent_access
settings[ldap.id] ||= {
  active: true, groups_base_dn: 'ou=Group,dc=redmine,dc=org',
  class_user: 'person', class_group: 'groupOfNames', users_search_scope: 'subtree',
  groupname: 'cn', groupname_pattern: '', group_search_filter: '',
  group_membership: 'on_groups', member: 'member', user_memberid: 'dn',
  user_groups: 'o', groupid: 'gidNumber',
  nested_groups: 'on_parents', member_group: 'member', group_memberid: 'dn',
  parent_group: 'o', group_parentid: 'gidNumber',
  account_flags: 'description', account_locked_test: "flags.include? '[disabled]'",
  required_group: '', fixed_group: 'ldap.users', admin_group: '',
  create_groups: '1', create_users: '1', sync_on_login: 'user_fields_and_groups',
  dyngroups: 'enabled', dyngroups_cache_ttl: '',
  user_fields_to_sync: ['firstname', 'lastname', 'mail', language.id.to_s, uid_number.id.to_s],
  user_ldap_attrs: { language.id.to_s => 'preferredLanguage', uid_number.id.to_s => 'uidNumber' },
  group_fields_to_sync: [description.id.to_s],
  group_ldap_attrs: { description.id.to_s => 'description' }
}.with_indifferent_access
settings.delete(down.id)
Setting.plugin_redmine_ldap_sync = settings

puts "LDAP seed: auth sources #{AuthSourceLdap.order(:id).pluck(:id, :name).inspect}, " \
     "sync #{LdapSetting.find_by_auth_source_ldap_id(ldap.id).valid? ? 'valid' : 'INVALID'}"
