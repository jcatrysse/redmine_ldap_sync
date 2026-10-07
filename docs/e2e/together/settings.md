# settings

Run 2026-10-07T16:46:14.906Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| `settings-ldap-settings-tab.png` | admin | `/admin/ldap_sync/1/edit` | Tab "LDAP settings" of E2E LDAP with the seeded values |
| `settings-preset-active-directory.png` | admin | `/admin/ldap_sync/1/edit` | Base settings "Active Directory" fills objectclasses and attributes (user, group, samaccountname ...), not saved yet |
| `settings-membership-on-members.png` | admin | `/admin/ldap_sync/1/edit` | Membership "on the member class" and nested groups "on the member class": the matching attributes are shown, the others hidden |
| `settings-sync-actions-tab.png` | admin | `/admin/ldap_sync/1/edit?tab=SynchronizationActions` | Tab "Synchronization actions": fields to sync, options; dynamic groups "with TTL" shows the cache TTL field |
| `settings-invalid-refused.png` | admin | `/admin/ldap_sync/1` | Saving "$invalid" as account flags attribute: refused, the error is shown and nothing is saved |
| `settings-saved.png` | admin | `/admin/ldap_sync/1/edit?tab=SynchronizationActions` | Fixed group changed to "ldap.e2e" and saved: success message on the same tab |
| `settings-saved-value.png` | admin | `/admin/ldap_sync/1/edit?tab=SynchronizationActions` | The saved value is shown when the page is opened again |
