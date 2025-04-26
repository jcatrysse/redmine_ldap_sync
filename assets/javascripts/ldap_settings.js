/*
 * Copyright (C) 2011-2013  The Redmine LDAP Sync Authors
 *
 * This file is part of Redmine LDAP Sync.
 *
 * Redmine LDAP Sync is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Redmine LDAP Sync is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Redmine LDAP Sync.  If not, see <http://www.gnu.org/licenses/>.
 */
$(document).ready(function () {
  "use strict";

  function show_options(elem, ambit) {
    var selected = $(elem).val();
    var prefix = '#ldap_attributes div.' + ambit;

    $(prefix).hide();

    // Remove "required" for hidden elements
    $(prefix + ' input').removeAttr('required');

    if (selected) {
      $(prefix + '.' + selected).show();

      // Add "required" for visible inputs
      $(prefix + '.' + selected + ' input').each(function () {
        if ($('label[for="' + this.id + '"]').hasClass('required')) {
          $(this).attr('required', 'required');
        }
      });
    }
  }

  function show_dyngroups_ttl(elem) {
    if ($(elem).val() === 'enabled_with_ttl') {
      $('#dyngroups-cache-ttl').show();
    } else {
      $('#dyngroups-cache-ttl').hide();
    }
  }

  // Initialize options on page load
  show_options($('#ldap_setting_group_membership'), 'membership');
  show_options($('#ldap_setting_nested_groups'), 'nested');
  show_dyngroups_ttl($('#ldap_setting_dyngroups'));

  // Event bindings using .on()
  $('#ldap_setting_group_membership').on('change keyup', function () {
    show_options(this, 'membership');
  });

  $('#ldap_setting_nested_groups').on('change keyup', function () {
    show_options(this, 'nested');
  });

  $('#base_settings').on('change keyup', function () {
    var id = $(this).val();
    if (!base_settings[id]) return;

    var hash = base_settings[id];
    Object.entries(hash).forEach(([key, value]) => {
      if (key !== 'name' && value !== $('#ldap_setting_' + key).val()) {
        $('#ldap_setting_' + key)
            .val(value)
            .change()
            .effect('highlight', { easing: 'easeInExpo' }, 500);
      }
    });
  });

  $('#ldap_setting_dyngroups').on('change keyup', function () {
    show_dyngroups_ttl(this);
  });

  // Handle "Enter" key for ldap_test inputs
  $('input[name^="ldap_test"]').on('keydown', function (e) {
    if (e.which === 13) {
      $('#commit-test').click();
      e.preventDefault();
    }
  });

  // Append the current tab on form submit
  $('form[id^="edit_ldap_setting"]').on('submit', function () {
    var current_tab = $('a[id^="tab-"].selected').attr('id').substring(4);
    $(this).append(
        $('<input>')
            .attr('type', 'hidden')
            .attr('name', 'tab')
            .val(current_tab)
    );
  });

  // AJAX events for "commit-test"
  $('#commit-test')
      .on('click', function (e) {
        e.preventDefault();
        var formData = $('form[id^="edit_ldap_setting"]').serialize();
        var url = $(this).attr('href') || $(this).data('url');

        $.ajax({
          url: url,
          method: 'PUT',
          data: formData,
          success: function (response) {
            $('#test-result').text(response);
          },
          error: function (xhr, status, error) {
            console.error('AJAX Error:', error);
            $('#test-result').text('Er is een fout opgetreden.');
          },
        });
      });
});
