// The rake tasks (cron): sync_groups, sync_users, sync_all, with DRY_RUN,
// LOG_LEVEL and an administrators group, run against the same Redmine and the
// test LDAP; the result is checked in the browser. Outputs: docs/e2e/rake_sync-*.txt.
import { e2e } from '../../.codex/e2e/lib.mjs';
import sup from './support.cjs';

sup.resetLdapData();
const t = await e2e('rake_sync');
await t.login('admin');

// DRY_RUN: tells what it would do, changes nothing
let before = sup.counts();
let out = sup.rake('sync_all', { DRY_RUN: '1' }, 'rake_sync-dry_run.txt');
let after = sup.counts();
if (JSON.stringify(before) !== JSON.stringify(after)) t.problems.push(`DRY_RUN changed data: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
if (!/Dry-run execution/.test(out) || !/Creating group 'Therß'/.test(out)) t.problems.push('DRY_RUN output lacks the dry-run banner or the groups it would create');
if (/\(exit [1-9]/.test(out) || !/\[edavis\] creating user|-- Creating user 'edavis'/.test(out)) t.problems.push('DRY_RUN sync_all failed or did not report the users');
await sup.showText(t.page, `DRY_RUN=1 rake sync_all: before ${JSON.stringify(before)}, after ${JSON.stringify(after)}`, out);
await t.shot('dry-run', 'DRY_RUN=1 rake sync_all: lists the groups and users it would create; users, groups, memberships and custom values unchanged');

// sync_groups: creates the LDAP groups with their synced custom field
out = sup.rake('sync_groups', {}, 'rake_sync-sync_groups.txt');
if (/\(exit [1-9]/.test(out)) t.problems.push('sync_groups failed');
await t.go('/groups');
for (const g of ['Therß', 'Säyeldas', 'IT отдел Системные', 'MicroUsers', 'TweetUsers']) {
  if (!(await t.page.locator('table.groups td.name', { hasText: g }).count())) t.problems.push(`group ${g} not created by sync_groups`);
}
await t.shot('groups', 'After rake sync_groups: the LDAP groups (static and dynamic, Unicode names) exist in Redmine');
const therId = sup.rails("puts Group.find_by(lastname: 'Therß').id").split('\n').pop();
await t.go(`/groups/${therId}/edit`);
if ((await t.page.locator('input[id^="group_custom_field_values_"]').first().inputValue()) !== 'Therß Team Group') t.problems.push('group custom field not synced');
await t.shot('group-field', 'Group Therß: custom field Description synced from LDAP ("Therß Team Group")');

// sync_users with an administrators group and LOG_LEVEL=change; tweetmicro
// exists and is active in Redmine but disabled on LDAP
sup.rails("u = User.new(firstname: 'Rae', lastname: 'Croll', mail: 'tweetmicro@fakemail.com'); u.login = 'tweetmicro'; " +
  "u.auth_source = AuthSourceLdap.find_by(name: 'E2E LDAP'); u.save!; puts u.status");
sup.rails("s = LdapSetting.find_by_auth_source_ldap_id(AuthSourceLdap.find_by(name: 'E2E LDAP').id); s.admin_group = 'Therß'; s.save or abort(s.errors.full_messages.join); puts :ok");
out = sup.rake('sync_users', { LOG_LEVEL: 'change' }, 'rake_sync-sync_users.txt');
if (/\(exit [1-9]/.test(out)) t.problems.push('sync_users failed');
if (!/\[loadgeek\] creating user/i.test(out) || !/\[tweetmicro\] locked active user/i.test(out) || !/granted admin privileges/.test(out)) t.problems.push('sync_users output lacks the created user or the admin grant');
await sup.showText(t.page, 'LOG_LEVEL=change rake sync_users (admin group Therß)', out);
await t.shot('sync-users-output', 'rake sync_users with LOG_LEVEL=change: one line per change (users created, groups added, admin granted, locked)');

await t.go('/users');
for (const u of ['LoadGeek', 'edavis', 'example1', 'tweetsave']) {
  if (!(await t.page.locator('table.list td', { hasText: u }).count())) t.problems.push(`user ${u} not created by sync_users`);
}
await t.shot('users', 'After rake sync_users: LDAP users created and active; LoadGeek and microunit administrators (members of Therß)');
await t.go('/users?set_filter=1&f[]=status&op[status]==&v[status][]=3');
if (!(await t.page.locator('table.list td', { hasText: 'tweetmicro' }).count())) t.problems.push('tweetmicro not in the locked users');
await t.shot('locked', 'Locked users: tweetmicro, active in Redmine before, locked by sync_users because it is disabled on LDAP');
const locked = sup.rails("puts User.find_by_login('tweetmicro')&.status").split('\n').pop();
if (locked !== '3') t.problems.push(`tweetmicro status ${locked}, expected locked (3)`);
const admin = sup.rails("puts User.find_by_login('loadgeek')&.admin?").split('\n').pop();
if (admin !== 'true') t.problems.push('loadgeek did not become administrator');

const saveId = sup.rails("puts User.find_by_login('tweetsave').id").split('\n').pop();
await t.go(`/users/${saveId}/edit?tab=groups`);
if (!(await t.page.locator('#tab-content-groups', { hasText: 'TweetUsers' }).count())) t.problems.push('tweetsave not in dynamic group TweetUsers');
await t.shot('dynamic-group', 'User tweetsave: member of the dynamic group TweetUsers (groupOfURLs) after the rake run');

// administrators group removed: admin flag revoked on the next run
sup.rails("s = LdapSetting.find_by_auth_source_ldap_id(AuthSourceLdap.find_by(name: 'E2E LDAP').id); s.admin_group = ''; s.save or abort(s.errors.full_messages.join); puts :ok");
// with an administrators group that loadgeek is not in
sup.rails("s = LdapSetting.find_by_auth_source_ldap_id(AuthSourceLdap.find_by(name: 'E2E LDAP').id); s.admin_group = 'Rill'; s.save or abort(s.errors.full_messages.join); puts :ok");
out = sup.rake('sync_all', { LOG_LEVEL: 'change' }, 'rake_sync-sync_all.txt');
if (!/revoked admin privileges/.test(out)) t.problems.push('admin privilege not revoked on sync_all');
if (sup.rails("puts User.find_by_login('loadgeek')&.admin?").split('\n').pop() !== 'false') t.problems.push('loadgeek still administrator');
sup.rails("s = LdapSetting.find_by_auth_source_ldap_id(AuthSourceLdap.find_by(name: 'E2E LDAP').id); s.admin_group = ''; s.save or abort(s.errors.full_messages.join); puts :ok");
await sup.showText(t.page, 'LOG_LEVEL=change rake sync_all (admin group Rill)', out);
await t.shot('sync-all-output', 'rake sync_all with administrators group Rill: loadgeek loses the admin flag; the server that is down is skipped (sync not enabled)');

// a sync that is disabled does nothing
before = sup.counts();
sup.rails("s = LdapSetting.find_by_auth_source_ldap_id(AuthSourceLdap.find_by(name: 'E2E LDAP').id); s.disable!; puts :ok");
sup.resetLdapData();
out = sup.rake('sync_all', {}, 'rake_sync-disabled.txt');
after = sup.counts();
sup.rails("s = LdapSetting.find_by_auth_source_ldap_id(AuthSourceLdap.find_by(name: 'E2E LDAP').id); s.active = true; s.save or abort(s.errors.full_messages.join); puts :ok");
if (!/disabled: skipping/.test(out)) t.problems.push('disabled sync did not say it skips');
if (after.users !== 4) t.problems.push(`disabled sync created users: ${JSON.stringify(after)}`);
await sup.showText(t.page, `Sync disabled: rake sync_all (users after: ${after.users})`, out);
await t.shot('disabled-skips', 'With the sync of E2E LDAP disabled, rake sync_all skips it and creates nothing');

await t.done();
