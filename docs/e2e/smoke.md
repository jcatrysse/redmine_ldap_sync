# smoke

Run 2026-10-06T20:06:35.880Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](smoke-01.png) | admin | `/` | / (HTTP 200) |
| ![](smoke-02.png) | admin | `/projects/e2e-project` | /projects/e2e-project (HTTP 200) |
| ![](smoke-03.png) | admin | `/projects/e2e-project/issues` | /projects/e2e-project/issues (HTTP 200) |
| ![](smoke-04.png) | admin | `/issues/1` | /issues/1 (HTTP 200) |
| ![](smoke-05.png) | admin | `/projects/e2e-project/issues/new` | /projects/e2e-project/issues/new (HTTP 200) |
| ![](smoke-06.png) | admin | `/projects/e2e-project/settings` | /projects/e2e-project/settings (HTTP 200) |
| ![](smoke-07.png) | admin | `/my/page` | /my/page (HTTP 200) |
| ![](smoke-08.png) | admin | `/my/account` | /my/account (HTTP 200) |
| ![](smoke-09.png) | admin | `/admin` | /admin (HTTP 200) |
| ![](smoke-10.png) | admin | `/admin/plugins` | /admin/plugins (HTTP 200) |
| ![](smoke-11.png) | admin | `/admin/ldap_sync/base_settings` | /admin/ldap_sync/base_settings (HTTP 406) |
| ![](smoke-12.png) | admin | `/admin/ldap_sync` | /admin/ldap_sync (HTTP 200) |
| ![](smoke-13.png) | admin | `/admin/ldap_sync/1/edit` | /admin/ldap_sync/1/edit (HTTP 200) |
| ![](smoke-14.png) | admin | `/admin/ldap_sync/1/edit` | /admin/ldap_sync/1 (HTTP 200) |
