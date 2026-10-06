# encoding: utf-8
#
# GEOxyz #5245: fills in the required Redmine fields when LDAP leaves them blank,
# so that the sync can create the user:
#   mail      -> primary SMTP address in proxyAddresses -> login, if that is a mail address
#   firstname -> login (the part before '@')
#   lastname  -> 'LDAP-User'
# Only when a user is created by the sync (include_required); an existing user
# keeps what Redmine has. A synced mail address is always stored in lower case.

module LdapSync
  module Patches
    module EntityManagerPatch
      MAIL_LOGIN = /\A[^@\s]+@[^@\s]+\z/

      def get_user_fields(username, user_data = nil, options = {})
        fields = super

        fields['mail'] = fields['mail'].to_s.downcase if fields['mail'].present?
        return fields unless options.try(:fetch, :include_required, false)

        if fields['mail'].blank?
          mail = primary_smtp_address(username, user_data) || (username if MAIL_LOGIN.match?(username.to_s))
          fields['mail'] = mail.downcase if mail
        end
        fields['firstname'] = username.split('@').first if fields['firstname'].blank?
        fields['lastname'] = 'LDAP-User' if fields['lastname'].blank?

        fields
      end

      private

      def primary_smtp_address(username, user_data)
        addresses = user_data && (user_data[:proxyaddresses] || user_data['proxyAddresses'])
        if addresses.blank?
          addresses = with_ldap_connection {|ldap| find_user(ldap, username, 'proxyAddresses') }
        end
        primary = Array(addresses).find {|a| a.to_s.start_with?('SMTP:') }
        primary && primary.to_s.sub(/\ASMTP:/, '')
      end
    end
  end
end
