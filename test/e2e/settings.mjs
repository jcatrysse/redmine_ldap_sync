// Editing the sync settings of an LDAP server: the three tabs, the presets of
// "Base settings", the fields that follow the selected options, a rejected
// invalid value, and a saved change (restored at the end).
import { e2e } from '../../.codex/e2e/lib.mjs';

const t = await e2e('settings');
await t.login('admin');

await t.go('/admin/ldap_sync/1/edit');
await t.shot('ldap-settings-tab', 'Tab "LDAP settings" of E2E LDAP with the seeded values');

// preset: fills the fields in the browser, nothing is saved
await t.page.selectOption('#base_settings', { label: 'Active Directory' });
await t.page.waitForTimeout(700);
const classUser = await t.page.inputValue('#ldap_setting_class_user');
if (classUser !== 'user') t.problems.push(`preset Active Directory set Users objectclass to "${classUser}"`);
if ((await t.page.inputValue('#ldap_setting_groupname')) !== 'samaccountname') t.problems.push('preset did not set the group name attribute');
await t.shot('preset-active-directory', 'Base settings "Active Directory" fills objectclasses and attributes (user, group, samaccountname ...), not saved yet');

// fields follow the group membership and nested groups options
await t.go('/admin/ldap_sync/1/edit');
await t.page.selectOption('#ldap_setting_group_membership', 'on_members');
await t.page.selectOption('#ldap_setting_nested_groups', 'on_members');
if (!(await t.page.locator('#ldap_setting_user_groups').isVisible())) t.problems.push('"Groups (user)" not shown for membership on the member class');
if (await t.page.locator('#ldap_setting_member').isVisible()) t.problems.push('"Member users (group)" still shown for membership on the member class');
await t.shot('membership-on-members', 'Membership "on the member class" and nested groups "on the member class": the matching attributes are shown, the others hidden');

await t.go('/admin/ldap_sync/1/edit?tab=SynchronizationActions');
await t.page.selectOption('#ldap_setting_dyngroups', 'enabled_with_ttl');
if (!(await t.page.locator('#dyngroups-cache-ttl').isVisible())) t.problems.push('cache TTL field not shown for dynamic groups with TTL');
await t.shot('sync-actions-tab', 'Tab "Synchronization actions": fields to sync, options; dynamic groups "with TTL" shows the cache TTL field');

// invalid value: refused by the server, the form comes back with the error
await t.go('/admin/ldap_sync/1/edit');
await t.page.fill('#ldap_setting_account_flags', '$invalid');
await t.page.click('#commit-save');
await t.settle();
await t.sudo();
t.check('save invalid');
if (!(await t.page.locator('#errorExplanation').count())) t.problems.push('no error shown for an invalid attribute');
await t.shot('invalid-refused', 'Saving "$invalid" as account flags attribute: refused, the error is shown and nothing is saved');
await t.go('/admin/ldap_sync/1/edit');
if ((await t.page.inputValue('#ldap_setting_account_flags')) !== 'description') t.problems.push('the invalid value was saved');

// valid change, then restored
async function saveFixedGroup(value) {
  await t.go('/admin/ldap_sync/1/edit?tab=SynchronizationActions');
  await t.page.fill('#ldap_setting_fixed_group', value);
  await t.page.click('#commit-save');
  await t.settle();
  await t.sudo();
  t.check(`save fixed group ${value}`);
}
await saveFixedGroup('ldap.e2e');
if (!(await t.page.locator('#flash_notice').count())) t.problems.push('no success message after saving');
await t.shot('saved', 'Fixed group changed to "ldap.e2e" and saved: success message on the same tab');
await t.go('/admin/ldap_sync/1/edit?tab=SynchronizationActions');
if ((await t.page.inputValue('#ldap_setting_fixed_group')) !== 'ldap.e2e') t.problems.push('the change was not saved');
await t.shot('saved-value', 'The saved value is shown when the page is opened again');
await saveFixedGroup('ldap.users');

await t.done();
