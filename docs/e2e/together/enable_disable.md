# enable_disable

Run 2026-10-07T16:37:39.759Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| `enable_disable-disabled.png` | admin | `/admin/ldap_sync` | Disable on E2E LDAP: success message, the row is greyed, the link now says Enable |
| `enable_disable-enabled.png` | admin | `/admin/ldap_sync` | Enable on E2E LDAP: enabled again |
| `enable_disable-enable-invalid-refused.png` | admin | `/admin/ldap_sync` | Enable on E2E LDAP down (no sync settings): refused with an error, stays disabled |
| `enable_disable-disabled-from-edit.png` | admin | `/admin/ldap_sync/1/edit` | Disable from the edit page: back on the edit page, link now Enable |
