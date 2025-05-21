# encoding: utf-8
#
# Only active during the rake task (running_rake? == true)
# Fills in required Redmine fields when LDAP leaves them blank.

module LdapSync
  module Patches
    module EntityManagerPatch
      # we only need to override a single helper that collects the raw values
      def get_user_fields(username, user_data = nil, options = {})
        # call the original helper first -------------------------------
        fields = super

        # nothing to do during on-the-fly login ------------------------
        #return fields unless running_rake?

        # --------------------------------------------------------------
        # 1.  MAIL  – try proxyAddresses → login → leave blank
        # --------------------------------------------------------------
        if fields['mail'].blank?
          proxy = Array(
            user_data&.[]('proxyAddresses') ||
            user_data&.[]('proxyaddresses')
          ).find { |p| p.to_s.start_with?('SMTP:') }

          fields['mail'] =
            (proxy ? proxy.sub(/^SMTP:/i, '') : username).to_s.downcase
        else
          fields['mail'] = fields['mail'].to_s.downcase
        end

        # --------------------------------------------------------------
        # 2.  FIRST / LAST NAME – derive from login if empty
        # --------------------------------------------------------------
        if fields['firstname'].blank?
          fields['firstname'] = username.split('@').first
        end

        if fields['lastname'].blank?
          fields['lastname'] = 'LDAP-User'
        end

        fields
      end
    end
  end
end
