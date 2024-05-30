require 'redmine'

Redmine::Plugin.register :redmine_ldap_sync do
  name 'Redmine LDAP Sync'
  author 'Ricardo Santos'
  author_url 'https://github.com/thorin'
  description 'Syncs users and groups with ldap'
  url 'https://github.com/thorin/redmine_ldap_sync'
  version '2.1.1.devel'
  requires_redmine :version_or_higher => '2.1.0'

  settings :default => HashWithIndifferentAccess.new()
  menu :admin_menu, :ldap_sync, { :controller => 'ldap_settings', :action => 'index' }, :caption => :label_ldap_synchronization,
                    :html => {:class => 'icon icon-ldap-sync'}
end


Rails.application.config.after_initialize do
  require_relative 'lib/ldap_sync/core_ext'
  require_relative 'lib/ldap_sync/infectors'
end

# hooks
require_relative 'lib/ldap_sync/hooks'

require 'sorted_set'
