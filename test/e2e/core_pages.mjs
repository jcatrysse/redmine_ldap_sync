// With the plugin (and, in the "together" run, every other GEOxyz plugin)
// installed: local users still log in (the sync-on-login patch of
// User.try_to_login! is prepended and must not break other plugins' patches),
// and Project > Settings, the issue list and an issue page answer as core
// decides: 200 where allowed, 403/404 where not.
import { e2e } from '../../.codex/e2e/lib.mjs';

const t = await e2e('core_pages');
const P = '/projects/e2e-project';
const expected = {
  admin:    { settings: 200, issues: 200, issue: 200, privateIssues: 200 },
  manager:  { settings: 200, issues: 200, issue: 200, privateIssues: 200 },
  reporter: { settings: 403, issues: 200, issue: 200, privateIssues: 403 },
  outsider: { settings: 403, issues: 200, issue: 200, privateIssues: 403 },
};
const issueId = (await (async () => { await t.login('admin'); await t.go(`${P}/issues`); return t.page.locator('table.issues tr.issue td.id a').first().innerText(); })()).trim();

for (const [user, want] of Object.entries(expected)) {
  await t.login(user);
  await t.go(`${P}/settings`, { status: want.settings });
  await t.shot(`settings-${user}`, `${user}: Project > Settings answers ${want.settings}`);
  await t.go(`${P}/issues`, { status: want.issues });
  await t.shot(`issues-${user}`, `${user}: issue list answers ${want.issues}`);
  await t.go(`/issues/${issueId}`, { status: want.issue });
  await t.shot(`issue-${user}`, `${user}: issue #${issueId} answers ${want.issue}`);
  await t.go('/projects/e2e-private/issues', { status: want.privateIssues });
  await t.shot(`private-${user}`, `${user}: issues of the private project answer ${want.privateIssues}`);
}

await t.done();
