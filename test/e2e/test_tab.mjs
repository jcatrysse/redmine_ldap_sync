// The Test tab of an LDAP server: runs the settings in the form against LDAP
// without saving, for some users and groups, and shows the result as text.
// Failure paths: invalid settings, a server that does not answer.
import { e2e } from '../../.codex/e2e/lib.mjs';

const t = await e2e('test_tab');
await t.login('admin');

async function runTest(users, groups) {
  const sent = [];
  const onRequest = r => { if (r.url().includes('/test')) sent.push(`${r.method()} ${r.url().replace(t.BASE, '')}`); };
  t.page.on('request', onRequest);
  await t.page.fill('#ldap_test_test_users', users);
  await t.page.fill('#ldap_test_test_groups', groups);
  await t.page.evaluate(() => { document.querySelector('#test-result').textContent = ''; });
  await t.page.click('#commit-test');
  await t.page.waitForFunction(() => document.querySelector('#test-result').textContent.trim().length > 30, null, { timeout: 30000 })
    .catch(() => t.problems.push('no test result'));
  await t.settle();
  t.page.off('request', onRequest);
  if (sent.length !== 1) t.problems.push(`one click sent ${sent.length} test request(s): ${sent.join(', ')}`);
  return t.page.locator('#test-result').textContent();
}

await t.go('/admin/ldap_sync/1/edit?tab=Test');
await t.shot('form', 'Test tab of E2E LDAP before running: fields for users and groups, "Not executed"');

let result = await runTest('loadgeek, tweetmicro, nobody', 'Therß, nogroup');
t.check('run test');
for (const expected of ['User "loadgeek"', 'Therß', 'Users enabled', 'Users locked by flag', 'tweetmicro', 'Dynamic groups', 'MicroUsers']) {
  if (!result.includes(expected)) t.problems.push(`test result lacks "${expected}"`);
}
if (!/nobody/.test(result)) t.problems.push('test result does not mention the unknown user');
if (/Group closure on parents|Something inside|Net::LDAP::Entry/.test(result)) t.problems.push('debug lines in the test result');
await t.shot('result', 'Result: the attributes and groups of loadgeek, tweetmicro locked by its flag, the unknown user and group reported, group lists incl. dynamic groups; log messages without debug lines');

// a change in the form is tested without being saved
await t.page.click('#tab-LdapSettings');
await t.page.fill('#ldap_setting_groupname_pattern', '^T');
await t.page.click('#tab-Test');
result = await runTest('loadgeek', '');
t.check('run test with pattern');
if (/Bluil/.test(result.split('Groups')[1] || '')) t.problems.push('group name pattern ^T from the form was not applied in the test');
await t.shot('result-unsaved-pattern', 'Group name pattern "^T" typed in the form (not saved): only groups starting with T are listed');
await t.go('/admin/ldap_sync/1/edit?tab=LdapSettings');
if ((await t.page.inputValue('#ldap_setting_groupname_pattern')) !== '') t.problems.push('the test saved the group name pattern');

// invalid settings: the test reports the validation errors
await t.page.fill('#ldap_setting_account_flags', '$invalid');
await t.page.click('#tab-Test');
result = await runTest('loadgeek', '');
t.check('run test with invalid settings');
if (!/Validation errors/.test(result)) t.problems.push('invalid settings not reported by the test');
await t.shot('invalid-settings', 'Invalid account flags attribute in the form: the test lists the validation error instead of running');

// a server that does not answer, with settings from the "Open LDAP (with posixGroups)" preset
await t.go('/admin/ldap_sync/2/edit?tab=LdapSettings');
await t.page.selectOption('#base_settings', { label: 'Open LDAP (with posixGroups)' });
await t.page.click('#tab-Test');
result = await runTest('someone', '');
t.check('run test against a server that is down');
if (!/refused|Connection|LDAP Error|Errno/i.test(result)) t.problems.push(`no connection error for the server that is down: ${result.slice(0, 200)}`);
if (/:\d+:in [`']/.test(result)) t.problems.push('backtrace in the test result');
await t.shot('server-down', 'E2E LDAP down (nothing listens on port 3390) with the "Open LDAP (with posixGroups)" preset: the test shows the connection error as one line, no backtrace');

await t.done();
