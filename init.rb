# frozen_string_literal: true
require 'redmine'

Redmine::Plugin.register :redmine_ldap_sync do
  name        'Redmine LDAP Sync'
  author      'Ricardo Santos, Taine Woo'
  author_url  'https://github.com/eea'
  description 'Syncs users and groups with LDAP'
  url         'https://github.com/eea/redmine_ldap_sync'
  version     '2.4.0'
  requires_redmine version_or_higher: '2.1.0'

  settings default: HashWithIndifferentAccess.new
  menu :admin_menu,
       :ldap_sync,
       { controller: 'ldap_settings', action: 'index' },
       caption: :label_ldap_synchronization,
       html:    { class: 'icon icon-ldap-sync' }
end

# --------------------------------------------------
# 1.  First load the modules
# --------------------------------------------------
require_relative 'lib/ldap_sync/core_ext'
require_relative 'lib/ldap_sync/infectors/auth_source_ldap'
require_relative 'lib/ldap_sync/infectors/user'
require_relative 'lib/ldap_sync/infectors/group'

if defined?(AuthSourceLdap) &&
   !(AuthSourceLdap < LdapSync::Infectors::AuthSourceLdap)
  AuthSourceLdap.include LdapSync::Infectors::AuthSourceLdap
end

# --------------------------------------------------
# 2.  After that we load the auto-includer & hooks
# --------------------------------------------------
require_relative 'lib/ldap_sync/infectors'
require_relative 'lib/ldap_sync/hooks'

# --------------------------------------------------
# 3.  Activate the EntityManager-patch
# --------------------------------------------------
require_relative 'lib/ldap_sync/patches/entity_manager_patch'

ActiveSupport.on_load(:after_initialize) do
  if defined?(LdapSync::EntityManager) &&
     !(LdapSync::EntityManager < LdapSync::Patches::EntityManagerPatch)
    LdapSync::EntityManager.prepend LdapSync::Patches::EntityManagerPatch
  end
end
