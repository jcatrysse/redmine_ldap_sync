// Enabling and disabling the sync of an LDAP server from the list and from the
// edit page; a server whose settings are not valid cannot be enabled.
import { e2e } from '../../.codex/e2e/lib.mjs';

const t = await e2e('enable_disable');
await t.login('admin');

await t.go('/admin/ldap_sync');
await t.page.click('#ldap-config-1 a[href$="/disable"]');
await t.settle();
await t.sudo();
t.check('disable');
if (!(await t.page.locator('#ldap-config-1.disabled').count())) t.problems.push('E2E LDAP not disabled');
if (!(await t.page.locator('#flash_notice').count())) t.problems.push('no success message after disable');
await t.shot('disabled', 'Disable on E2E LDAP: success message, the row is greyed, the link now says Enable');

await t.page.click('#ldap-config-1 a[href$="/enable"]');
await t.settle();
await t.sudo();
t.check('enable');
if (!(await t.page.locator('#ldap-config-1.enabled').count())) t.problems.push('E2E LDAP not enabled again');
await t.shot('enabled', 'Enable on E2E LDAP: enabled again');

// not configured: refused
await t.page.click('#ldap-config-2 a[href$="/enable"]');
await t.settle();
await t.sudo();
t.check('enable invalid');
if (!(await t.page.locator('#flash_error').count())) t.problems.push('no error when enabling a server without valid settings');
if (!(await t.page.locator('#ldap-config-2.disabled').count())) t.problems.push('E2E LDAP down was enabled with invalid settings');
await t.shot('enable-invalid-refused', 'Enable on E2E LDAP down (no sync settings): refused with an error, stays disabled');

// from the edit page
await t.go('/admin/ldap_sync/1/edit');
await t.page.click('.contextual a[href$="/disable"]');
await t.settle();
await t.sudo();
t.check('disable from edit');
if (!/\/admin\/ldap_sync\/1\/edit/.test(t.page.url())) t.problems.push(`after disable from edit: ${t.page.url()}`);
await t.shot('disabled-from-edit', 'Disable from the edit page: back on the edit page, link now Enable');
await t.page.click('.contextual a[href$="/enable"]');
await t.settle();
await t.sudo();
t.check('enable from edit');
await t.go('/admin/ldap_sync');
if (!(await t.page.locator('#ldap-config-1.enabled').count())) t.problems.push('E2E LDAP not enabled at the end');

await t.done();
