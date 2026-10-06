// Sync on login: an LDAP user logs in to Redmine; the user is created on the
// fly with the synced fields, the LDAP groups (static, nested, dynamic) and the
// fixed group. Failure paths: an account locked on LDAP, a wrong password, and
// an LDAP user without mail who must complete the registration form.
import { e2e } from '../../.codex/e2e/lib.mjs';
import sup from './support.cjs';

sup.resetLdapData();
const t = await e2e('login_sync');

async function tryLogin(login, password) {
  await t.anonymous();
  await t.go('/login');
  await t.page.fill('#username', login);
  await t.page.fill('#password', password);
  await t.page.click('#login-submit');
  await t.settle();
}

await t.login('loadgeek', 'password');
await t.go('/my/account');
if ((await t.page.inputValue('#user_mail')) !== 'loadgeek@fakemail.com') t.problems.push('mail not synced on login');
await t.shot('created-on-login', 'LDAP user loadgeek logs in for the first time: account created with name and mail from LDAP');

await t.login('admin');
const id = sup.rails("puts User.find_by_login('loadgeek').id").split('\n').pop();
await t.go(`/users/${id}/edit?tab=groups`);
const groups = await t.page.locator('#tab-content-groups').innerText();
for (const g of ['ldap.users', 'Therß', 'Iardum', 'IT отдел Системные']) if (!groups.includes(g)) t.problems.push(`loadgeek not in group ${g}`);
await t.shot('groups-after-login', 'Admin, user loadgeek, tab Groups: LDAP groups (incl. nested and Unicode names) and the fixed group ldap.users');
await t.go(`/users/${id}/edit`);
await t.shot('fields-after-login', 'Admin, user loadgeek: custom fields Preferred Language and Uid Number synced from LDAP, authentication mode E2E LDAP');

await tryLogin('tweetmicro', 'password');
if (!(await t.page.locator('#flash_error').count())) t.problems.push('tweetmicro (locked on LDAP) was not refused');
t.check('locked login');
await t.shot('locked-on-ldap-refused', 'tweetmicro is disabled on LDAP (account flag "[disabled]"): login refused');

await tryLogin('loadgeek', 'wrong');
if (!(await t.page.locator('#flash_error').count())) t.problems.push('wrong password not refused');
t.check('wrong password');
await t.shot('wrong-password-refused', 'loadgeek with a wrong password: refused');

await tryLogin('incomplete', 'password');
t.check('incomplete login');
await t.shot('incomplete-register', 'incomplete has no mail on LDAP: Redmine asks to complete the account');
if (await t.page.locator('#user_mail').count()) {
  await t.page.fill('#user_mail', 'incomplete@fakemail.com');
  if (await t.page.locator('#user_firstname').count() && !(await t.page.inputValue('#user_firstname'))) await t.page.fill('#user_firstname', 'Incomplete');
  await t.page.locator('#user_mail').press('Enter');
  await t.settle();
  t.check('incomplete register');
  await t.go('/my/account');
  if ((await t.page.inputValue('#user_mail').catch(() => '')) !== 'incomplete@fakemail.com') t.problems.push('the mail typed by the incomplete user was not kept');
  await t.shot('incomplete-completed', 'After completing: logged in, the typed mail address is kept (GEOxyz #5245 overwrote it with the login before)');
} else {
  t.problems.push('no registration form for the incomplete user');
}

await t.done();
