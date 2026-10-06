// Who reaches the plugin's pages: the admin menu entry, the list of LDAP
// servers and the edit page are for administrators only; everyone else is
// refused, anonymous users go to the login page, an unknown server is a 404,
// and a change without CSRF token is refused.
import { e2e } from '../../.codex/e2e/lib.mjs';

const t = await e2e('access');

await t.login('admin');
await t.go('/admin');
if (!(await t.page.locator('#admin-menu a.ldap-sync svg').count())) t.problems.push('admin menu entry has no SVG icon');
await t.shot('admin-menu', 'Admin menu entry "LDAP synchronization" with the Redmine 7 icon (no tiled image)');

await t.page.click('#admin-menu a.ldap-sync');
await t.settle();
t.check('open from admin menu');
if (!t.page.url().endsWith('/admin/ldap_sync')) t.problems.push(`admin menu went to ${t.page.url()}`);
await t.shot('index', 'List of LDAP servers: E2E LDAP enabled, E2E LDAP down (not configured) greyed, Test/Disable/Enable icons');

await t.go('/admin/ldap_sync/1');
if (!t.page.url().endsWith('/admin/ldap_sync/1/edit')) t.problems.push(`show did not redirect to edit: ${t.page.url()}`);
await t.go('/admin/ldap_sync/999/edit', { status: 404 });
await t.shot('unknown-404', 'An LDAP server that does not exist: 404');

// CSRF: a PUT in js format without token (what a foreign page could send) is refused
const csrf = await t.page.evaluate(async () => {
  const r = await fetch('/admin/ldap_sync/1/disable.js', { method: 'PUT' });
  return r.status;
});
if (csrf !== 422) t.problems.push(`PUT disable.js without token: HTTP ${csrf}, expected 422`);
t.check('PUT disable.js without token', { requests: ['422 fetch /admin/ldap_sync/1/disable.js'] });
// core ends the session on an invalid token
await t.login('admin');
await t.go('/admin/ldap_sync');
if (!(await t.page.locator('#ldap-config-1.enabled').count())) t.problems.push('E2E LDAP was disabled by a request without token');
await t.shot('csrf-refused', `PUT /admin/ldap_sync/1/disable.js without CSRF token: HTTP ${csrf} (core logs the session out); E2E LDAP is still enabled`);

for (const user of ['manager', 'reporter', 'outsider']) {
  await t.login(user);
  await t.go('/admin/ldap_sync', { status: 403 });
  await t.go('/admin/ldap_sync/1/edit', { status: 403 });
  if (await t.page.locator('a.ldap-sync').count()) t.problems.push(`${user} sees the admin menu entry`);
  await t.shot(`refused-${user}`, `${user} (not administrator): the LDAP sync pages answer 403`);
}

await t.anonymous();
await t.go('/admin/ldap_sync');
if (!/\/login/.test(t.page.url())) t.problems.push(`anonymous was not sent to login: ${t.page.url()}`);
await t.shot('anonymous-login', 'Anonymous: /admin/ldap_sync redirects to the login page');

await t.done();
