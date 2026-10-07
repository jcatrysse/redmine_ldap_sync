# encoding: utf-8
module LdapSync::DryRun::User
  module ClassMethods
    def create(attributes = nil, &block)
      return super unless LdapSync::DryRun.enabled?

      user = User.new(attributes)
      user.email_address ||= DryRunEmailAddress.new
      user.groups = DryRunGroupsProxy.new(user)
      yield user if block_given?
      user
    end
  end

  module InstanceMethods
    def lock!
      return super unless LdapSync::DryRun.enabled?

      puts "   !! Locked user '#{login}'"
      true
    end

    def activate!
      return super unless LdapSync::DryRun.enabled?

      puts "   !! Activated user '#{login}'"
      true
    end

    # archive! removes all groups and roles and locks the account
    def archive!
      return super unless LdapSync::DryRun.enabled?

      puts "   !! Archived user '#{login}'"
      true
    end

    def update_attributes(attrs = {}); end

    # group changes are printed and kept in memory only
    def groups
      return super unless LdapSync::DryRun.enabled?

      @dry_run_groups ||= DryRunGroupsProxy.new(self).concat(super.to_a)
    end

    def member_of_group?(groupname)
      return super unless LdapSync::DryRun.enabled?

      groups.any? {|g| g.lastname == groupname }
    end

    def save(*args, **options, &block)
      return super unless LdapSync::DryRun.enabled?
    end
  end

  class DryRunEmailAddress
    include ActiveModel::Model
    attr_accessor :address
  end

  class DryRunGroupsProxy < Array
    def initialize(user)
      @user = user
      super()
    end

    def <<(groups)
      names = Array(groups).map(&:lastname)
      puts "   !! Added to groups '#{names.join("', '")}'" unless names.empty?
      concat(Array(groups))
    end

    def delete(*groups)
      names = groups.flatten.map(&:lastname)
      puts "   !! Removed from groups '#{names.join("', '")}'" unless names.empty?
      groups.flatten.each {|g| super(g) }
    end
  end

  # applied by LdapSync::DryRun.enable!
end
