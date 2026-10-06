# test_tab

Run 2026-10-06T20:16:29.651Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| `test_tab-form.png` | admin | `/admin/ldap_sync/1/edit?tab=Test` | Test tab of E2E LDAP before running: fields for users and groups, "Not executed" |
| `test_tab-result.png` | admin | `/admin/ldap_sync/1/edit?tab=Test` | Result: the attributes and groups of loadgeek, tweetmicro locked by its flag, the unknown user and group reported, group lists incl. dynamic groups |
| `test_tab-result-unsaved-pattern.png` | admin | `/admin/ldap_sync/1/edit?tab=Test` | Group name pattern "^T" typed in the form (not saved): only groups starting with T are listed |
| `test_tab-invalid-settings.png` | admin | `/admin/ldap_sync/1/edit?tab=Test` | Invalid account flags attribute in the form: the test lists the validation error instead of running |
| `test_tab-server-down.png` | admin | `/admin/ldap_sync/2/edit?tab=Test` | E2E LDAP down (nothing listens on port 3390) with the "Open LDAP (with posixGroups)" preset: the test shows the connection error |
