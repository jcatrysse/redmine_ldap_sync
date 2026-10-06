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
require File.expand_path('../../test_helper', __FILE__)

class LdapSettingsControllerTest < ActionController::TestCase
  fixtures :auth_sources, :users, :settings, :custom_fields

  setup do
    Setting.clear_cache
    @auth_source = auth_sources(:auth_sources_001)
    @ldap_setting = LdapSetting.find_by_auth_source_ldap_id(@auth_source.id)
    @request.session[:user_id] = 1
  end

  def test_should_get_index
    get :index
    assert_response :success
    assert_select "tr.ldap_setting", 2

    assert_select "table tr", 3
    assert_select "a", :text => 'LDAP test server', :count => 1
    assert_select "td", :text => '127.0.0.1', :count => 1
    assert_select "td", :text => '127.0.0.1', :count => 1
  end

  def test_should_get_base_settings_js
    get :base_settings, :format => 'js'
    assert_response :success
    assert_equal 'text/javascript', response.media_type
    assert_match /\Avar base_settings = \{.*"active_directory/m, response.body
  end

  def test_should_redirect_to_get_edit_on_get_show
    get :show, params: { id: 1 }
    assert_redirected_to edit_ldap_setting_path(1)
  end

  def test_should_get_edit
    get :edit, params: { id: @auth_source.id }
    assert_response :success
  end

  def test_should_get_404
    get :edit, params: { id: 999 }
    assert_response :not_found
  end

  def test_should_disable_ldap_setting
    # Given that
    assert @ldap_setting.active?, "LdapSetting must be enabled"
    assert_equal 'member', @ldap_setting.member_group

    # When we do
    get :disable, params: { id: @ldap_setting.id }
    assert_redirected_to ldap_settings_path
    assert_match /success/, flash[:notice]

    # We should have
    ldap_setting = LdapSetting.find_by_auth_source_ldap_id(@ldap_setting.id)
    assert_equal 'member', ldap_setting.member_group, 'LdapSetting is not the same'
    assert !ldap_setting.active?, "LdapSetting must be disabled"
  end

  def test_should_disable_an_invalid_ldap_setting
    # Given that
    ldap_setting = LdapSetting.find_by_auth_source_ldap_id(2)
    assert ldap_setting.active?

    # When we do
    get :disable, params: { id: ldap_setting.id }
    assert_redirected_to ldap_settings_path
    assert_match /success/, flash[:notice]

    # We should have
    ldap_setting = LdapSetting.find_by_auth_source_ldap_id(2)
    assert_nil ldap_setting.member_group, 'LdapSetting is not the same'
    assert !ldap_setting.active?, "LdapSetting must be disabled"
  end

  def test_should_enable_ldap_setting
    # Given that
    @ldap_setting.active = false; @ldap_setting.save
    ldap_setting = LdapSetting.find_by_auth_source_ldap_id(@ldap_setting.id)
    assert !ldap_setting.active?, "LdapSetting must be disabled"
    assert_equal 'member', ldap_setting.member_group

    # When we do
    get :enable, params: { id: ldap_setting.id }
    assert_redirected_to ldap_settings_path
    assert_match /success/, flash[:notice]

    # We should have
    ldap_setting = LdapSetting.find_by_auth_source_ldap_id(ldap_setting.id)
    assert_equal 'member', ldap_setting.member_group, 'LdapSetting is not the same'
    assert ldap_setting.active?, "LdapSetting must be enabled"
  end

  def test_should_not_enable_ldap_setting_with_errors
    # Given that
    @ldap_setting.active = false; @ldap_setting.save
    @ldap_setting.send(:attribute=, :dyngroups, 'invalid')
    @ldap_setting.send(:settings=, @ldap_setting.send(:attributes))

    @ldap_setting = LdapSetting.find_by_auth_source_ldap_id(@ldap_setting.id)
    assert !@ldap_setting.active?, 'LdapSetting must be disabled'
    assert_equal 'member', @ldap_setting.member_group

    # When we do
    get :enable, params: { id: @ldap_setting.id }
    assert_redirected_to ldap_settings_path
    assert_match /invalid settings/, flash[:error]

    # We should have
    ldap_setting = LdapSetting.find_by_auth_source_ldap_id(@ldap_setting.id)
    assert_equal 'member', ldap_setting.member_group, 'LdapSetting is not the same'
    assert !ldap_setting.active?, "LdapSetting must be disabled"
  end

  def test_should_fail_with_error
    put :update, params: { 
      id: @ldap_setting.id, 
      ldap_setting: {
        auth_source_ldap_id: @auth_source_id,
        active: true,
        groupname: 'cn',
        groups_base_dn: 'groups_base_dn',
        class_group: 'group',
        class_user: nil,                     # Missing required field
        group_membership: 'on_members',
        groupid: 'groupid',
        nested_groups: '',
        user_groups: 'memberof',
        sync_on_login: '',
        dyngroups: ''
      } 
    }
    assert_select '#errorExplanation li', { :text => /Users objectclass/ }, 'An error must be reported for :class_user'
    assert_response :success
    assert_equal 'person', LdapSetting.find_by_auth_source_ldap_id(@ldap_setting.id).class_user
  end

  def test_should_update_ldap_setting
    put :update, params: { 
      id: @ldap_setting.id, 
      ldap_setting: {
        auth_source_ldap_id: @auth_source_id,
        active: true,
        account_disabled_test: '',
        account_flags: '',
        attributes_to_sync: '',
        class_group: 'group',
        class_user: 'user',
        create_groups: '',
        create_users: '',
        fixed_group: '',
        group_memberid: '',
        group_membership: 'on_members',
        group_parentid: '',
        group_search_filter: '',
        groupid: 'groupid',
        groupname: 'cn',
        groupname_pattern: '',
        groups_base_dn: 'groups_base_dn',
        member: '',
        member_group: '',
        nested_groups: '',
        parent_group: '',
        required_group: '',
        user_fields_to_sync: [],
        group_fields_to_sync: [],
        user_ldap_attrs: {},
        group_ldap_attrs: {},
        user_groups: 'memberof',
        user_memberid: '',
        sync_on_login: '',
        dyngroups: ''
      }
    }
    assert_redirected_to ldap_settings_path
    ldap_setting = LdapSetting.find_by_auth_source_ldap_id(@ldap_setting.id)
    assert ldap_setting.valid?, ldap_setting.errors.full_messages.join(', ')
    assert_equal 'user', ldap_setting.class_user
    assert_equal 'memberof', ldap_setting.user_groups
    assert_match /success/, flash[:notice]
  end

  def test_should_test
    put :test, params: { 
      id: @ldap_setting.id,
      format: 'text', 
      ldap_setting: @ldap_setting.send(:attributes),
      ldap_test: { test_users: 'example1', test_groups: 'Therß' }
    }

    assert_response :success
    assert_equal 'text/plain', response.media_type

    assert_match /User \"example1\":/,          response.body
    assert_match /Group \"Therß\":/,            response.body
    assert_match /Users enabled:/,              response.body
    assert_match /Users locked by flag:/,       response.body
    assert_match /Admin users:/,                response.body
    assert_match /Groups:/,                     response.body
    assert_match /LDAP attributes on a user:/,  response.body
    assert_match /LDAP attributes on a group:/, response.body

    assert_no_match /ldap_test\.rb/, response.body, 'Should not throw an error'
  end

  def test_should_validate_on_test
    @ldap_setting.dyngroups = 'invalid'

    put :test, params: { 
      id: @ldap_setting.id, 
      format: 'text',
      ldap_setting: @ldap_setting.send(:attributes),
      ldap_test: { :test_users => 'example1', :test_groups => 'Therß' }
    }

    assert_response :success
    assert_equal 'text/plain', response.media_type

    assert_match /Validation errors .* Dynamic groups/m,   response.body

    assert_no_match /ldap_test\.rb/, response.body, 'Should not throw an error'
  end

  def test_should_refuse_changes_without_authenticity_token_in_js_format
    @ldap_setting.active = false; @ldap_setting.save
    ActionController::Base.allow_forgery_protection = true

    put :enable, params: { id: @ldap_setting.id, format: 'js' }
    assert_response 422
    assert !LdapSetting.find_by_auth_source_ldap_id(@ldap_setting.id).active?, 'LdapSetting must stay disabled'

    put :update, params: { id: @ldap_setting.id, format: 'js', ldap_setting: { admin_group: 'Rynever' } }
    assert_response 422
    assert_not_equal 'Rynever', LdapSetting.find_by_auth_source_ldap_id(@ldap_setting.id).admin_group
  ensure
    ActionController::Base.allow_forgery_protection = false
  end

  def test_should_get_base_settings_js_with_forgery_protection
    ActionController::Base.allow_forgery_protection = true
    get :base_settings, :format => 'js'
    assert_response :success
    assert_equal 'text/javascript', response.media_type
  ensure
    ActionController::Base.allow_forgery_protection = false
  end

  def test_should_require_sudo_mode_to_change_a_setting
    Redmine::SudoMode.stubs(:enabled?).returns(true)

    put :disable, params: { id: @ldap_setting.id }
    assert_response :success
    assert_select 'input[name=sudo_password]'
    assert LdapSetting.find_by_auth_source_ldap_id(@ldap_setting.id).active?, 'LdapSetting must stay enabled'

    put :update, params: { id: @ldap_setting.id, ldap_setting: { admin_group: 'Rynever' } }
    assert_response :success
    assert_select 'input[name=sudo_password]'
    assert_not_equal 'Rynever', LdapSetting.find_by_auth_source_ldap_id(@ldap_setting.id).admin_group

    put :disable, params: { id: @ldap_setting.id, sudo_password: 'admin' }
    assert_redirected_to ldap_settings_path
    assert !LdapSetting.find_by_auth_source_ldap_id(@ldap_setting.id).active?, 'LdapSetting must be disabled'
  end

  def test_should_get_edit_of_an_ldap_server_with_anonymous_bind
    assert_nil auth_sources(:auth_sources_002).account

    get :edit, params: { id: 2, tab: 'Test' }
    assert_response :success
    assert_select 'input[name=?]', 'ldap_test[test_users]'
    assert_select 'input[name=?]', 'ldap_test[bind_user]', 0
  end

  def test_execute_link_of_the_test_tab_should_be_handled_by_the_plugin_script_only
    get :edit, params: { id: @auth_source.id, tab: 'Test' }
    assert_response :success
    # ldap_settings.js sends the form; data-remote/data-method made rails-ujs send a second PUT
    assert_select 'a#commit-test[href=?]', '/admin/ldap_sync/1/test.text'
    assert_select 'a#commit-test[data-remote], a#commit-test[data-method]', 0
  end
end
