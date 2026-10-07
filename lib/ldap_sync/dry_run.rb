# encoding: utf-8
# Copyright (C) 2011-2013  The Redmine LDAP Sync Authors
#
# This file is part of Redmine LDAP Sync.
#
# Redmine LDAP Sync is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# Redmine LDAP Sync is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with Redmine LDAP Sync.  If not, see <http://www.gnu.org/licenses/>.

# DRY_RUN of the rake tasks: the stubs in DryRun::User and DryRun::Group
# replace the writes of the sync and print what would be done. They are
# prepended (User defines lock!/activate! itself, an included module never
# reached them) and only act while the dry run is enabled.
module LdapSync::DryRun
  def self.enable!
    ::User.prepend(User::InstanceMethods) unless ::User < User::InstanceMethods
    ::User.singleton_class.prepend(User::ClassMethods) unless ::User.singleton_class < User::ClassMethods
    ::Group.prepend(Group::InstanceMethods) unless ::Group < Group::InstanceMethods
    @enabled = true
  end

  def self.disable!
    @enabled = false
  end

  def self.enabled?
    @enabled == true
  end
end
