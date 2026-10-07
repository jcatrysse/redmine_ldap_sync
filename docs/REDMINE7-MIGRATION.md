# Redmine 7 migration: redmine_ldap_sync

Start a Claude Code (or Codex) session on this repository, branch `redmine70-migration`, with:

> Read CLAUDE.md and docs/REDMINE7-MIGRATION.md, then carry out the Redmine 7 migration of this
> plugin as described there, on branch redmine70-migration. That includes the plugin's tests on
> PostgreSQL and MariaDB, every function exercised end to end on a real running Redmine in a
> browser (with and without permissions, failure paths included) with screenshots you looked at,
> and an OpenAI review of the diff when OPENAI_API_KEY is set. Report to me in Dutch at the end.

This file is the plan and the memory of that work. Update it as you go: verdicts, results,
what is left. Written 2026-10-06 from a measured analysis (report at the bottom).

## Status

| | |
|---|---|
| Plugin id | `redmine_ldap_sync` |
| GEOxyz runs today | `master` |
| Upstream | eea/redmine_ldap_sync master @ 20eb736 (2025-01-30) |
| Runs on Redmine 7 as is | NEE (before this branch); JA on `redmine70-migration` |
| Upstream sync | NIET NODIG |
| After sync | n.v.t. |
| Complexity (1 trivial .. 5 rewrite) | 2 |
| Measured on | Redmine 7.0.1 (7.0-stable-GEOxyz + latest 7.0-stable), Rails 8.1.3.1, Ruby 3.3.6, PostgreSQL 16 and MariaDB 10.11 |
| Branch head when this file was written | `a695b45`; migration done up to `eeb58a2` (2026-10-06); Jan's decisions built up to `f67cd72` (2026-10-07) |

## Already on this branch

- `f046a8b` Remove `unloadable`, gone from ActiveSupport since Rails 5.1
- `c3ff316` Fix FileStore#delete_unless for Rails 7+ cache internals
- `2908a61` Update test helper and fixtures for Rails 7.2+

Done in the migration session (2026-10-06), one concern per commit, each with a test that fails without it:

| commit | what |
|---|---|
| `bdcd089` | Test suite runs: plugin fixtures only (core `fixtures :all`), nested-set fixture, `.codex/start_ldap.sh` (test slapd 2.4 from the Ubuntu 20.04 archive), `test_setup.sh` as root |
| `10bbbea` | **Breaker**: `Array#sum` of SortedSets (Rails 7.1 removed AS non-numeric sum): every `sync_users` raised TypeError |
| `17dc70f` | Tests on the Rails 6.1+ test API (assigns/assert_template, media_type, errors.of_kind?) |
| `e6b7938` | **Bug since 2019 (upstream 2b83c5a)**: `ldap_search` dropped the block: `sync_groups` created nothing, dynamic groups never read (7 tests fixed; the commit message also counts the :change output test, which already passed with slapd 2.4) |
| `3fbe9b2` | `email_is_taken` always false since Rails 6.1 (`added?` compares the value) |
| `6d82840` | GEOxyz #5245 reworked (see verdicts) |
| `b82b6e4` | Rake: dynamic groups were never loaded in a new rake process (`dyngroups_fresh?` inverted) |
| `c31f76b` | **Security**: CSRF check skipped for every `.js` request: enable/disable/update could be forged |
| `95c5163` | **Security**: sudo mode for update/enable/disable, like core's auth sources |
| `b3bed62` | `String#mb_chars` replaced (gone in Rails 8.2) |
| `12cf296` | Performance test without `rails/performance_test_help` (aborted every full minitest run) |
| `33f0128`, `cdbcf5f` | Icons: SVG sprite icons on Redmine 6+, CSS icons kept for 5.1, no `:has()` |
| `8a3bb3e`, `47151c3` | `DRY_RUN` wrote to the database (groups, custom values, memberships) and crashed on new users; ran the real sync in a rolled-back transaction. **Replaced** after Jan's decision n2-2, see below |
| `82bc649` | LDAP server without bind account (anonymous): edit page HTTP 500, rake aborted |
| `8cb716e` | Test tab: two PUTs per click (rails-ujs + GEOxyz handler), Dutch hard-coded error text |
| `3c2235c` | **Bug in production**: sync on login hooked `try_to_login`, the login form calls `try_to_login!`: web logins never synced (groups, fields, locks) |
| `75e0327`, `b6c66ab` | E2E scenarios, screenshots, MariaDB run, before pictures on 5.1 |
| `88b1add` | Jan q3: no debug lines in Test tab / rake output, error as one line, backtrace only in the log |
| `39379f8` | Jan (general): `User.try_to_login!` patched with `prepend` instead of `alias_method` |
| `f67cd72` | Jan (general): Redmine 7 only, 5.1 fallbacks removed, requires_redmine 7.0.0 |
| `7011f81` | Jan n2-2: old DRY_RUN restored (stub modules of GEOxyz 1896e51, no rollback) |
| `f745a26` | DRY_RUN fix 1: stubs prepended behind a switch (`LdapSync::DryRun.enable!`); `include` never reached `User#lock!`/`activate!`, accounts were really locked/activated |
| `e9a8d7d` | DRY_RUN fix 2: `archive!` stubbed (removed groups and roles, locked the account) |
| `b9f2447` | DRY_RUN fix 3: group memberships of existing users (reporting proxy, `member_of_group?`; proxy `<<`/`delete` with several groups) |
| `95676af` | DRY_RUN fix 4: `save` validates instead of nil: no crash on new users, report "Creating user" / real errors |
| `2bf8745` | DRY_RUN fix 5: `Group#save` stubbed: no groups and group fields created/updated |

## Work list for the migration session

In this order: things that break, security, the GEOxyz changes, the open items, then the checks.

**Open items from the analysis** (Dutch; where they conflict with a decision or a priority item above, those win)

1. Test against the real AD on staging: sync_all, sync on login, nested and dynamic groups (FileStore fix now really deletes stale cache entries). **Done against the plugin's test LDAP (slapd 2.4 with the fixture LDIF: static, nested, dynamic groups, locked users) in unit tests and e2e; still to do against the real AD on staging** (no AD here), see "After the upgrade".
2. Icons tile on Redmine 7. **Done** (`33f0128`, `cdbcf5f`): sprite_icon on 6+, CSS icons on 5.1.
3. Replace String#mb_chars. **Done** (`b3bed62`).
4. Test suite. **Done** (`bdcd089`, `17dc70f`, `12cf296`): plugin fixtures only, test slapd via `.codex/start_ldap.sh`, performance test runs. `test/ui/*` (old Capybara/Selenium UI tests, excluded by the harness as before) were not revived: the e2e scenarios cover the same pages.

**Checks**

5. Whole test suite. **Done**, see "Results".
6. Webhooks. **Checked, nothing needed**: Redmine 7 webhooks cover issue, news, time entry, wiki page and version; this plugin changes none of those payloads. It changes group memberships and admin flags, which core evaluates when it sends (visibility for the webhook owner), so payloads stay consistent.
7. Every feature in a browser. **Done**, see "Inventory" and docs/e2e.

## GEOxyz changes to review or re-apply

These GEOxyz commits are on the branch GEOxyz runs today and therefore on this branch. Review each one against the code it now sits on (upstream merges and Redmine 7 core): drop it if upstream or core now does the same, rewrite it if it is not up to the quality rules below (tests, I18n, security, portability), keep it otherwise. Record the verdict per commit in this file.

| commit | date | subject | verdict |
|---|---|---|---|
| `b1b0fbf` | 2025-05-21 | Patch: support proxyAddresses and login as fallback for mail #5245 | **Rewritten** (`6d82840`). It overwrote non-synced mail and user-typed values on every sync (3 upstream tests failed) and never found proxyAddresses (not requested from LDAP). Now: only when the sync creates a user, mail = primary `SMTP:` proxy address (fetched) or the login if it is a mail address; firstname/lastname fallbacks as before; synced mail lower-cased as before. The init.rb/infectors.rb loading part kept (works on 5.1 and 7.0, eager load OK). See open question 1. |
| `1896e51` | 2025-05-21 | Defect: resolve DRY RUN rake task issues #5209 | **Replaced** (`8a3bb3e`, `47151c3`): the stubs still crashed on every new user and let group/membership writes through. Dry run now = real sync in a rolled-back transaction. See open question 3. |
| `b1eabfd` | 2025-05-21 | Patch: add warning on missing login or attributes #5208 | **Kept** as is: warnings show in rake output and the Test tab (seen in e2e); covered by the sync_users output tests. |
| `7fe1f9e` | 2025-05-20 | Defect: prevent crash when rendering LDAP attributes in test view #5198 | **Kept**: the Test tab renders attributes of users and groups (e2e test_tab, functional test_should_test). |
| `869560b` | 2025-04-26 | * Resolve compatibility issues | **Kept**, with a fix: controller param handling and `group_data.to_h` are right; the JS rewrite kept, but the link still had data-remote, so two PUTs per click, and the error text was hard-coded Dutch (`8cb716e`). |

## After the upgrade (production)

Actions the person doing the upgrade must take, or know about, for this plugin:

- Re-create the cron entry for `redmine:plugins:ldap_sync:sync_all` and run one sync against the real AD.
  First `DRY_RUN=1 rake redmine:plugins:ldap_sync:sync_all` (the old dry run, fixed: it no longer
  writes users, groups, memberships, roles or admin flags; changes are reported as "Creating ...",
  "!! Added to groups ...", "!! Locked/Archived user ..."), read it, then the real run.
- **Expect more changes than before on the first run**: `sync_groups` (and the group part of
  `sync_all`) did nothing on GEOxyz master because of the ldap_search bug, and dynamic groups were
  never loaded by rake. The first run will create the LDAP groups that have no members yet, sync
  group custom fields and add dynamic-group memberships.
- **Sync on login becomes active for web logins** (it never ran on the login form, `3c2235c`). With
  the current setting, users get their LDAP groups (and fields) at each login, the required group /
  account flags are enforced at login, and accounts disabled on AD are refused. Check the
  "Synchronization actions" settings on staging before the upgrade (open question 4).
- Administrators are asked for their password (sudo mode, on by default in Redmine 7) when saving,
  enabling or disabling LDAP sync settings.
- No schema change; the 14 plugin migrations only touch settings (down/up verified).
- Test against the real AD on staging: sync_all, login with sync on login, nested and dynamic groups,
  proxyAddresses fallback for users without `mail`. Not possible here (no AD).
- Sync on login stays on (Jan q2, 2026-10-07: "Aan laten, eerst nakijken op staging"): on staging,
  check "Synchronize on login", "Users must be members of" and the account flags with a few real
  AD accounts (one in the required group, one not, one disabled in AD) before the upgrade.
- Error details of the Test tab are in the Rails log now ("LDAP sync test failed: ..."), no longer on
  the page.

## Results after Jan's decisions (2026-10-07)

PostgreSQL 16 only, Redmine 7.0.1 (`7.0-stable-GEOxyz`), test slapd 2.4.

| run | result |
|---|---|
| plugin tests, plugin alone | 157 runs, 700 assertions, 0 failures, 0 errors, 0 skips |
| plugin tests with 37 other GEOxyz plugins (`redmine70-migration` of each: 30 public, 7 private) | 157 runs, 700 assertions, 0 failures, 0 errors, 0 skips |
| e2e, plugin alone (docs/e2e) | 9 scripts, 76 screenshots, 0 problems |
| e2e with 35 other GEOxyz plugins (docs/e2e/together) | all 7 scenarios of this plugin 0 problems; 6 problems from other plugins, below |

**Together with the other GEOxyz plugins** (findings for those plugins, none involves this one):
- `redmine_issue_field_visibility` (alias_method on `IssueQuery#initialize_available_filters`) with
  `redmine_agile` (prepend): SystemStackError, `rake redmine:load_default_data` aborts. Left out of the run.
- `redmine_tint_issues` (alias_method on `Issue#css_classes`) with `redmine_agile` (prepend):
  SystemStackError, HTTP 500 on the issue list, issue page and My page. Left out of the run.
- `redmine_mail_digest` (alias_method `project_settings_tabs_with_issue_digest`) among the prepends
  of ~13 plugins: Project > Settings HTTP 500 ("super: no superclass method project_settings_tabs").
- `redmine_view_issue_description`: issue page 403 for roles without its permission (reporter,
  outsider): by design of that plugin.
- This plugin's own patch of `User.try_to_login!` is prepended now (`39379f8`): logins of local and
  LDAP users work with all of them installed (login_sync, core_pages).

## Results (2026-10-06)

Environment: Redmine 7.0.1 (`7.0-stable-GEOxyz` @ 8067e23), Rails 8.1.3.1, Ruby 3.3.6; Redmine 5.1.13
(`5.1-stable`) with Ruby 3.2.6; PostgreSQL 16.15, MariaDB 10.11.14; test LDAP: OpenLDAP slapd 2.4.49
with the plugin's fixture LDIF (`./.codex/start_ldap.sh`).

**Baseline before any change** (branch at `bbbc06f`): minitest aborted with LoadError
(`rails/performance_test_help`); without the performance test 138 runs, 138 errors ("No fixture files
found for attachments"). With the fixture fix only, GEOxyz master on Redmine 5.1 had 20 failing tests
of 138, Redmine 7.0 21 (+24 errors from `Array#sum`): all of them pre-existing bugs listed above.

**Plugin tests** (`./.codex/test_plugin.sh`, all files in one process):

| Redmine | database | result |
|---|---|---|
| 7.0-stable-GEOxyz | PostgreSQL 16 | 155 runs, 696 assertions, 0 failures, 0 errors, 0 skips |
| 7.0-stable-GEOxyz | MariaDB 10.11 | 155 runs, 696 assertions, 0 failures, 0 errors, 0 skips |
| 5.1-stable | PostgreSQL 16 | 155 runs, 665 assertions, 0 failures, 0 errors, 0 skips |
| 7.0 + bless_this_redmine_sso + redmine_impersonate (their `redmine70-migration`) | PostgreSQL 16 | 154 runs, 0 failures (before the last added test) |

Migrations: 14 down to 0 and up again on PostgreSQL and MariaDB. `rails zeitwerk:check`: "All is good!".
Production server boots with eager loading (start_server.sh).

**End to end** (`./.codex/e2e.sh`, production mode, docs/e2e): smoke 14 + core flows 6 + 6 plugin
scenarios with 40 screenshots, 0 problems, on PostgreSQL (screenshots committed) and on MariaDB
(report tables in docs/e2e/mariadb, 60 screenshots, 0 problems). Same set with the two
authentication-related GEOxyz plugins installed: 0 problems. Same scenarios on Redmine 5.1 with this
branch: 0 problems (the SVG-icon check is for 6+ only). Before pictures (GEOxyz master on 5.1): docs/e2e/before.
Every screenshot was opened and looked at.

**Review**: own adversarial review of the whole diff; OpenAI review (gpt-5) twice:
docs/reviews/openai-2026-10-06-b6c66ab.md (3 findings: 1 fixed, 2 rejected with a test/explanation),
docs/reviews/openai-2026-10-06-cdbcf5f.md (1 finding, rejected with e2e evidence). Nothing open.

## Inventory of functions

| function | how a user reaches it | scenario | screenshots |
|---|---|---|---|
| Admin menu entry "LDAP synchronization" | Administration (admin only) | access.mjs | access-admin-menu |
| List of LDAP servers with Test/Enable/Disable | /admin/ldap_sync | access.mjs, enable_disable.mjs | access-index |
| Refusal for non-admins, login for anonymous, 404 | same URLs as manager/reporter/outsider/anonymous | access.mjs | access-refused-*, access-anonymous-login, access-unknown-404 |
| CSRF protection of changes | PUT without token | access.mjs + functional test | access-csrf-refused |
| Edit settings: tabs, presets ("Base settings"), dependent fields, save, invalid value | /admin/ldap_sync/:id/edit | settings.mjs | settings-* |
| Sudo mode on save/enable/disable | password prompt (Redmine 7 default) | functional test (a fresh login is already in sudo mode) | - |
| Enable / disable, refusal of invalid settings | list and edit page | enable_disable.mjs | enable_disable-* |
| Test tab: users, groups, unsaved form values, invalid settings, server down | edit page, tab Test | test_tab.mjs | test_tab-* |
| base_settings.js (presets) | loaded by the edit page | settings.mjs (preset), functional test | settings-preset-active-directory |
| Sync on login: creation on the fly, groups (static, nested, dynamic, Unicode), fields, fixed group, locked on LDAP, wrong password, incomplete user | login form | login_sync.mjs | login_sync-* |
| rake sync_groups (groups + group custom fields, dynamic groups) | cron / CLI | rake_sync.mjs | rake_sync-groups, rake_sync-group-field, docs/e2e/rake_sync-sync_groups.txt |
| rake sync_users (create, lock, admin group, LOG_LEVEL) | cron / CLI | rake_sync.mjs | rake_sync-sync-users-output, -users, -locked, -dynamic-group |
| rake sync_all, admin flag revoked, disabled sync skipped | cron / CLI | rake_sync.mjs | rake_sync-sync-all-output, -disabled-skips |
| DRY_RUN (old stubs, fixed; no changes) on empty and on synced data | `DRY_RUN=1` | rake_sync.mjs + 7 unit tests | rake_sync-dry-run, rake_sync-dry-run-existing, docs/e2e/rake_sync-dry_run*.txt |
| ACTIVATE_USERS | `ACTIVATE_USERS=1` | unit tests (activate_users flag) | - |
| Stylesheet hook (view_layouts_base_html_head) | every page | smoke (no missing assets) | smoke-* |
| Login and core pages with the plugin (and the other GEOxyz plugins) installed: Project > Settings, issue list, issue page, private project | admin, manager, reporter, outsider | core_pages.mjs | core_pages-* |
| Test tab output without debug lines / backtrace (Jan q3) | Test tab | test_tab.mjs | test_tab-result, test_tab-server-down |
| Webhooks | n/a, see work list 6 | - | - |

## Findings recorded, not changed (upstream behaviour)

- ~~Debug lines and backtrace in the Test tab / rake output~~: removed by Jan's decision q3 (`88b1add`).
- "Validation errors on the ldap settings:" / "on the test:" in the .text.erb views are not translated.
- The bind password on the Test tab is a text field (shown in clear).
- `account_locked_test` is Ruby code evaluated by the plugin (admin-only setting, by design).
- After an "incomplete" LDAP user completes the registration form, custom fields are synced at the
  next login, not right away.
- A user locked in Redmine with sync on login sees "Invalid user or password" instead of core's
  "account locked" message (the plugin returns nothing for inactive users, as it always did on the API path).
- The 280-character "Loremipsum..." group of the test LDIF cannot be created in Redmine (name > 255);
  the sync reports it and goes on.
- A dry run refreshes the LDAP caches in tmp/ldap_cache with current LDAP data (no Redmine data).

## Decided by Jan (2026-10-07)

Final; answered by Jan in the coordinating session (docs/DECISIONS-2026-10-07.md).

General, for every GEOxyz plugin:
- GEOxyz goes straight to Redmine 7: no backports to 5.1; `redmine70-migration` is what goes live.
  Redmine 5.1 compatibility is no longer a requirement, no code paths that exist only for 5.1.
  Built: `f67cd72` (icon fallbacks, PNGs, pre-6.1/7.1 branches removed; requires_redmine 7.0.0).
- PostgreSQL 16 only: tests and e2e on PostgreSQL; MariaDB runs no longer required (the MariaDB
  results above are kept as information). SQL stays portable where that costs nothing.
- deface without version constraint: not applicable (this plugin does not use deface).
- A core method that other plugins also patch is patched with `prepend`, never `alias_method`.
  This plugin aliased `User.try_to_login!`; built: `39379f8` (prepend, with a test).
- GitHub Actions stay manual only (`workflow_dispatch`): unchanged.

For this plugin:
1. **redmine_ldap_sync-q1** (open question 1): "Mag de plugin bij bestaande gebruikers nog
   mailadres en naam invullen als LDAP ze niet heeft?" Jan chose A: "Alleen bij nieuwe gebruikers"
   (Lokaal aangepaste adressen en namen blijven staan, en het registratieformulier voor onvolledige
   gebruikers werkt weer.). Already built in `6d82840`; kept.
2. **redmine_ldap_sync-q2** (open question 4): "Synchronisatie bij het aanmelden werkt nu echt. Aan
   laten of uitzetten?" Jan chose A: "Aan laten, eerst nakijken op staging" (De instelling doet wat
   ze belooft; wie niet in de verplichte groep zit of in AD is uitgeschakeld, kan niet meer
   aanmelden.). Already built in `3c2235c` (now prepended, `39379f8`); kept. Staging check under
   "After the upgrade".
3. **redmine_ldap_sync-q3** (open question 5): "De debugregels en technische foutmeldingen uit de
   Test-tab en de synchronisatie-uitvoer halen?" Jan chose A: "Ja, in een kleine opvolging"
   (Leesbaardere uitvoer; één test moet dan op de foutmelding zelf controleren in plaats van op de
   bestandsnaam.). Built in `88b1add`.

Round 2, decided by Jan on 2026-10-07 (evening), docs/DECISIONS-2026-10-07.md:
4. **redmine_ldap_sync-n2-1** (open question 2, sudo mode): Jan chose "Wachtwoord vragen" (Zo
   gebouwd, gelijk aan de LDAP-instellingen van Redmine zelf.). Kept as built (`95c5163`).
5. **redmine_ldap_sync-n2-2** (open question 3, DRY_RUN): Jan chose "Oude proefrun herstellen" (De
   oude manier blijft, en de fouten erin worden één voor één opgelost.). Built: old stubs restored
   (`7011f81`) and their errors fixed one per commit, each with a test that fails without it:
   `f745a26`, `e9a8d7d`, `b9f2447`, `95676af`, `2bf8745` (see "Already on this branch"). The admin
   flag path (`set_admin!`/`unset_admin!` through `update_attribute` -> `save`) was already covered by
   the `save` stub; it has a regression test now. What the old stubs still do not cover: the LDAP
   caches in tmp/ldap_cache are written with current LDAP data (no Redmine data).

## Open questions for Jan

None.

## How to test

```sh
./.codex/redmine_clone.sh 7.0-stable-GEOxyz      # or 5.1-stable / 6.1-stable / 7.0-stable
./.codex/test_setup.sh                                 # RMP_DB=mariadb for MariaDB, RMP_PROVISION_DB=0 if a server runs
./.codex/start_ldap.sh                                 # test LDAP on localhost:3389 (the tests and e2e need it)
./.codex/test_plugin.sh                                # minitest + rspec of this plugin
```

```sh
./.codex/start_server.sh       # real Redmine (production mode) with this plugin, seeded users and projects
./.codex/e2e.sh                # browser: smoke over the plugin's pages, core issue flows, test/e2e/*.mjs
./.codex/openai_review.sh      # independent OpenAI review of the diff, only when OPENAI_API_KEY is set
```
Write one scenario per function in `test/e2e/<function>.mjs` (example at the top of
`.codex/e2e/lib.mjs`); screenshots and a table per scenario land in `docs/e2e/`. Users:
`admin`, `manager` (every permission), `reporter` (no plugin permissions), `outsider` (no
membership); password `Redmine7Test!`. Needs Node with Playwright and Chromium
(`npm install -g playwright && npx playwright install --with-deps chromium`).

On GitHub the same runs by hand only: Actions > "Redmine tests (manual)" > Run workflow (tick
"e2e" for the browser run; screenshots come back as an artifact).

The coordinator's harness (`plugin-check.sh` in the migration kit, kept outside this repo) adds a
browser smoke test of every page the plugin adds and runs all GEOxyz plugins together; the
results quoted in the analysis come from it.

## How the migration session works (same for every plugin)

1. **Start**: `git fetch && git checkout redmine70-migration && git pull`. Read this whole file,
   including the analysis report at the bottom. Do not reopen decisions recorded here.
2. **Baseline, before you change anything**:
   - the plugin's tests on Redmine 7.0-stable-GEOxyz with PostgreSQL;
   - a real running Redmine with this plugin (`./.codex/start_server.sh`) and the browser run
     (`./.codex/e2e.sh`: smoke over every page the plugin adds, plus the core issue flows).
   Write the numbers here. Something already broken now is a finding, not your regression.
3. **Inventory of functions**: list every function of the plugin in this file, in a table
   "function | how a user reaches it | scenario | screenshot". Take them from the README,
   `init.rb` (permissions, menus, settings, project modules), routes, hooks and view
   overrides, macros, mail handling, API endpoints, rake tasks and cron jobs. This table is the
   coverage list for step 8; a function that is not in it will not be tested.
4. **GEOxyz changes**: go through the table above, one item at a time. Each kept or re-made change
   is its own commit with a test that proves it. Record the verdict in the table.
5. **Work list**: then the numbered list, in order. One concern per commit.
6. **Portability**: PostgreSQL 16 (Jan, 2026-10-07: GEOxyz runs PostgreSQL only); keep SQL
   portable where it costs nothing. Migrations must be reversible and are run down and up.
7. **Together**: run with the other GEOxyz plugins installed (the migration kit's harness, or
   `RMP_EXTRA_PLUGINS`). A failure that only appears in combination is a finding to record here.
8. **End to end, visually, every function**: on the real Redmine from `start_server.sh`
   (production mode, the way GEOxyz runs it), write one scenario per function in
   `test/e2e/<function>.mjs` with `.codex/e2e/lib.mjs` and run them with `./.codex/e2e.sh`.
   - Each function as the users that matter: `admin`, `manager` (every permission, the
     plugin's included), `reporter` (member without the plugin's permissions), `outsider`
     (no membership, private project must stay invisible).
   - The failure paths too: setting off, permission absent, empty state, invalid input, the
     value that used to raise. A refusal that is shown is evidence as much as a success.
   - One screenshot per function and per path, with a caption saying what it proves. Open
     every screenshot and look at it: a picture nobody looked at proves nothing. Commit them
     in `docs/e2e/` and list them in the inventory table.
   - Functions without a page (mail in and out, REST API, rake tasks, cron, webhooks): exercise
     them against the same running instance (mails land in `redmine/tmp/mails`, `t.mails()`
     reads them; API through `t.page.request`) and record command and result.
   - Before pictures where behaviour or layout changes: the branch GEOxyz runs today, on
     Redmine 5.1, same scenarios, `RMP_E2E_OUT=docs/e2e/before` (for comparison only; 5.1 is not a target).
9. **Independent review**: first your own, adversarial: re-read the whole diff as if someone
   else wrote it and you are paid to reject it. Then, **when `OPENAI_API_KEY` is set in the
   session**, `./.codex/openai_review.sh`: it sends the diff of this branch to an OpenAI model
   and writes `docs/reviews/openai-<date>-<sha>.md`. Every finding gets a `Resolution:` line
   there (fixed in <commit>, with a test, or why not). Fix, re-run the tests and the e2e set,
   and run the review again until it has nothing new that you accept. Without the key: write
   "OpenAI review: skipped, no OPENAI_API_KEY" in the report; never send code anywhere else.
10. **After the upgrade**: anything the production upgrade must do for this plugin (data fixes,
    settings, cron, files, removed features) goes into the section "After the upgrade".
11. **Finish**: update "Status", the inventory and the work list in this file, push
    `redmine70-migration`, and report: what changed, test numbers on both databases, e2e
    numbers (scenarios, screenshots, problems), the review result, what is left, what needs Jan.

### Stop and ask Jan when
- a GEOxyz change would be lost or behave differently for users;
- a new gem, a new setting with user impact, or a schema change not required by Redmine 7 seems needed;
- the change would send data to an external service (the OpenAI review of the code diff is the
  one exception Jan approved, and only when the key is present);
- upstream and GEOxyz disagree on behaviour and both are defensible.

## Rules

- **Target**: Redmine 7.0-stable-GEOxyz (https://github.com/jcatrysse/redmine), Rails 8.1, Ruby 3.3+.
  Core sources for comparison: branches `5.1-stable`, `6.1-stable`, `7.0-stable`, `7.0-stable-GEOxyz`.
- **Evidence**: never report a test, lint, browser check or review as passed without having seen
  it. Quote the summary lines; list the screenshots. "Should work" is not a result, and a green
  test suite is not proof that a feature works in the browser.
- **Tests**: never skip, delete or weaken a test. A test that encodes Redmine 5 markup or
  behaviour is updated to Redmine 7, with the reason in the commit. Every fix gets a test that
  fails without it.
- **Minimal diffs** in the plugin's own style. No reformatting, no unrelated refactoring.
  Something wrong elsewhere: write it down here, do not fix it in passing.
- **Security**: authorization on every action and entry point; `safe_attributes`, never
  `to_unsafe_hash` into `update`; no SQL built from params; no secrets in logs; no `html_safe` on
  user input.
- **Webhooks (new in Redmine 7)**: core sends issue payloads (core `issues/show.api.rsb`, rendered
  as the webhook owner) to webhook endpoints, past plugin hooks and controller patches. If the
  plugin hides, adds or changes issue data, make webhooks consistent with that or record why not.
- **Redmine 7 conventions**: SVG icons through `sprite_icon` (the `icon icon-*` CSS is gone),
  Propshaft assets under `assets/` (`/assets/plugin_assets/<id>/...`), the new header and user menu,
  `ContextMenus::*Controller`, Loofah-based text formatting, Chart.js as an ES module, sudo mode
  (on by default: `t.sudo()` in a scenario). The breaker list is in the migration kit's CHECKLIST.md.
- **Locales**: keep the locales the plugin ships in sync; translate a new key by matching the
  closest existing key in the same file, not from scratch; do not add new languages.
- **Redmine 7 only** (Jan, 2026-10-07): no 5.1 compatibility, no backports, no code paths that
  exist only for 5.1.
- **PostgreSQL only** (Jan, 2026-10-07): tests and e2e on PostgreSQL 16; keep SQL portable where it
  costs nothing; a MariaDB-only problem is a note here, not a blocker.
- **prepend, not alias_method** (Jan, 2026-10-07) for core methods that other plugins patch too.
- **Git**: work on `redmine70-migration` only; never push to the default branch; never force-push
  a branch someone else uses. Descriptive commit messages (what and why). Push after every
  commit, together with the updated status in this file: a cloud session can stop at a usage
  limit, and work that is not pushed is lost with its container.
- **GitHub Actions**: manual only (`workflow_dispatch`). Do not add push, pull_request or schedule
  triggers.

## Definition of done

- All items of the work list are done or explicitly deferred with a reason, in this file.
- The plugin's tests are green on Redmine 7.0-stable-GEOxyz with PostgreSQL
  (numbers in this file); boot, production-like eager load, migrations up/down OK.
- Every function in the inventory exercised end to end on a real running Redmine, with and
  without permissions and on its failure paths; `./.codex/e2e.sh` green; screenshots looked at,
  committed in `docs/e2e/` and listed.
- Review done: your own, and the OpenAI review when the key is present, every finding resolved
  in `docs/reviews/`.
- No new failure when run together with the other GEOxyz plugins.
- "After the upgrade" lists every action production needs; "Status" is current.


## Analysis report (2026-10-06, Dutch)

# redmine_ldap_sync
- Gebruikte branch: master @ b1b0fbf (2025-05-21) - plugin id redmine_ldap_sync, versie 2.4.0
- Upstream: eea/redmine_ldap_sync (fork van tainewoo, oorspronkelijk thorin) - upstream HEAD master @ 20eb736 (2025-01-30)
- Fork t.o.v. upstream: 5 eigen commits (869560b, 7fe1f9e, b1eabfd, 1896e51, b1b0fbf + merge cbfd0a5), 0 upstream-commits ontbreken (20eb736 is voorouder van master)
- Andere relevante branches: origin/claude/redmine7-rails8-compat (2ec4b43, `unloadable` weg; hergebruikt via cherry-pick), origin/old_master (2024-05-31), 1.2-stable/1.3-stable (2013). Upstream eea: master, old_master, 1.2/1.3-stable - geen Redmine 6/7-branch.
- Gemfile: `sorted_set`. 14 migraties (alleen settings + cache-map). Tests: 138 minitests (unit/functional) + perf + ui; vereisen een test-LDAP (slapd op poort 3389).

## 1. Werkt out of the box op Redmine 7?   NEE
- `FAIL boot`: `undefined local variable or method 'unloadable' for class AuthSourceLdap` - lib/ldap_sync/infectors/auth_source_ldap.rb:468. `unloadable` verdween met de classic autoloader in Rails 7.0 (werkte dus nog op 5.1/Rails 6.1). Redmine start niet.
- Resultaat: results/1006-084850-s3-redmine_ldap_sync_origin_master

## 2. Upstream sync?   NIET NODIG
- eea/master bevat niets wat GEOxyz mist; laatste upstream-commit 2025-01-30 ("fix no method inject"), getest tot Redmine 5.0. Geen trial-merge nodig.
- Onderhouden forks: geen gevonden met Redmine 6/7-support. Alternatief (andere plugin, geen drop-in): "LDAP Sync Groups Plugin for Redmine" (vadikonline1, v1.0.1 2026-04-16, claimt 4.0-6.1).

## 3. Werkt na sync op Redmine 7?   n.v.t.

## 4. Complexiteit en blokkers   score 2
- Blokkers:
  - lib/ldap_sync/infectors/auth_source_ldap.rb:468 - `unloadable` -> NameError bij boot - gefixt in f046a8b (cherry-pick van 2ec4b43). Let op: de commit-tekst zegt "gone since Rails 5.1"; correct is Rails 7.0.
  - lib/ldap_sync/core_ext/file_store.rb:26 - `delete_entry(key, options)`: op Rails 8.1 is de signatuur `(key, **options)` -> ArgumentError zodra de cache voor nested groups / dynamic groups een verouderde entry heeft; bovendien verwacht FileStore het pad, niet de key, dus er werd nooit iets gewist. Runtime bewezen (ArgumentError), fix geverifieerd (stale entry weg, andere blijft) - gefixt in c3ff316. Op 5.1 met Ruby 3 vermoedelijk ook al stuk (niet geverifieerd).
  - test/test_helper.rb:38,46 `self.fixture_path=` (weg in Rails 7.2) en test/fixtures/settings.yml:3 `Time.now.to_s(:db)` - testsuite laadt niet - gefixt in 2908a61 (test-only, zelfde gedrag).
- Stille breuken:
  - Iconen: `icon icon-ldap-sync` (admin-menu), `icon-enable/disable/test` gebruiken CSS-achtergrondafbeeldingen; Redmine 7 heeft de `.icon`-basis-CSS niet meer (#43206) -> afbeelding tegelt over de hele link (zichtbaar in admin-menu en "Enable"). Cosmetisch, open.
  - `String#mb_chars` (8x in lib/) geeft deprecation op Rails 8.1, verdwijnt in Rails 8.2.
  - test/performance/auth_source_ldap_performance_test.rb vraagt `rails/performance_test_help` (weg sinds Rails 4) en breekt de hele harness-minitest-run af. Niet aangeraakt.
  - Testsuite blijft rood ook zonder perf-test: core test_helper doet `fixtures :all`, plugin vervangt het fixture-pad -> "No fixture files found for attachments" (138 errors). Plugin-pad toevoegen i.p.v. vervangen geeft dubbele id's. Vraagt herontwerp van de fixtures + een slapd.
- Niet uitgeoefend (geen LDAP-server hier): echte user/group-sync, attributen, login-time sync, on-the-fly aanmaak, nested/dynamic groups, net-ldap 0.20 tegen een server. Wel geverifieerd: admin-UI (index, edit, preset "Active Directory", opslaan, Test-tab -> nette "Connection refused", Enable/Disable), rake `sync_users` -> Errno::ECONNREFUSED op de LDAP-laag, `sync_groups` -> "No attributes to sync: skipping", DRY_RUN start.
- Overlap met Redmine 7 core: geen (core heeft alleen LDAP-authenticatie, geen sync).
- Open werk voor ansif:
  - Op staging tegen de echte AD testen: `rake redmine:plugins:ldap_sync:sync_all`, login met sync_on_login, nested groups, dynamic groups (de FileStore-fix wist nu effectief verouderde cache-entries).
  - Iconen: `background-repeat:no-repeat; padding-left` in assets/stylesheets/ldap_sync.css of omzetten naar `sprite_icon`.
  - `mb_chars` vervangen door gewone String-methodes vóór Rails 8.2.
  - Beslissen over de testsuite (fixtures-strategie + slapd in CI) of laten.

## Branch redmine70-migration
- Basis: origin/master @ b1b0fbf
- Commits: f046a8b Remove `unloadable`, gone from ActiveSupport since Rails 5.1 (cherry-pick 2ec4b43); c3ff316 Fix FileStore#delete_unless for Rails 7+ cache internals; 2908a61 Update test helper and fixtures for Rails 7.2+
- Eindresultaat harness (results/1006-101121-s3-redmine_ldap_sync_redmine70-migration): OK bundle, OK boot 2.4.0, OK eager load, OK migraties dev+test, OK rollback naar 0 en terug, FAIL minitest (LoadError rails/performance_test_help, zie boven), OK smoke 64/64 (4 plugin-routes; edit/show 404 = geen auth source in seed)
- Rollback migraties: OK

