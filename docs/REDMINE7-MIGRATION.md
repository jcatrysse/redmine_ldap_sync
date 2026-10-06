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
| Runs on Redmine 7 as is | NEE |
| Upstream sync | NIET NODIG |
| After sync | n.v.t. |
| Complexity (1 trivial .. 5 rewrite) | 2 |
| Measured on | Redmine 7.0.1 (7.0-stable-GEOxyz + latest 7.0-stable), Rails 8.1.3.1, Ruby 3.3.6, PostgreSQL 16 and MariaDB 10.11 |
| Branch head when this file was written | `a695b45` |

## Already on this branch

- `f046a8b` Remove `unloadable`, gone from ActiveSupport since Rails 5.1
- `c3ff316` Fix FileStore#delete_unless for Rails 7+ cache internals
- `2908a61` Update test helper and fixtures for Rails 7.2+

## Work list for the migration session

In this order: things that break, security, the GEOxyz changes, the open items, then the checks.

**Open items from the analysis** (Dutch; where they conflict with a decision or a priority item above, those win)

1. Test against the real AD on staging: sync_all, sync on login, nested and dynamic groups (FileStore fix now really deletes stale cache entries); could not be exercised here (no LDAP server)
2. Icons tile on Redmine 7 (CSS background icons without .icon base CSS): add no-repeat/padding or use sprite_icon
3. Replace String#mb_chars (8x) before Rails 8.2
4. Test suite: core fixtures :all conflicts with plugin-only fixture path; needs fixture strategy + slapd, and test/performance requires rails/performance_test_help (gone since Rails 4)

**Checks**

5. Run the plugin's whole test suite on Redmine 7.0-stable-GEOxyz with PostgreSQL AND MariaDB, and once on 5.1-stable if the branch is meant to stay 5.1-compatible.
6. Check Redmine 7 webhooks against this plugin (see "Rules"), and note the result here even if nothing is needed.
7. Verify every feature of the plugin by hand on a running Redmine 7 (screenshots).

## GEOxyz changes to review or re-apply

These GEOxyz commits are on the branch GEOxyz runs today and therefore on this branch. Review each one against the code it now sits on (upstream merges and Redmine 7 core): drop it if upstream or core now does the same, rewrite it if it is not up to the quality rules below (tests, I18n, security, portability), keep it otherwise. Record the verdict per commit in this file.

| commit | date | subject |
|---|---|---|
| `b1b0fbf` | 2025-05-21 | Patch: support proxyAddresses and login as fallback for mail #5245 |
| `1896e51` | 2025-05-21 | Defect: resolve DRY RUN rake task issues #5209 |
| `b1eabfd` | 2025-05-21 | Patch: add warning on missing login or attributes #5208 |
| `7fe1f9e` | 2025-05-20 | Defect: prevent crash when rendering LDAP attributes in test view #5198 |
| `869560b` | 2025-04-26 | * Resolve compatibility issues |

## After the upgrade (production)

Actions the person doing the upgrade must take, or know about, for this plugin:

- Re-create the cron entry for `redmine:plugins:ldap_sync:sync_all` and run one sync against the real AD.

## How to test

```sh
./.codex/redmine_clone.sh 7.0-stable-GEOxyz      # or 5.1-stable / 6.1-stable / 7.0-stable
./.codex/test_setup.sh                                 # RMP_DB=mariadb for MariaDB, RMP_PROVISION_DB=0 if a server runs
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
   - the plugin's tests on Redmine 7.0-stable-GEOxyz with PostgreSQL and with MariaDB;
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
6. **Portability**: everything must run on Redmine's supported databases (PostgreSQL,
   MySQL/MariaDB; SQLite where the plugin already supports it). Migrations must be reversible and
   are run down and up on PostgreSQL and MariaDB.
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
     Redmine 5.1, same scenarios, `RMP_E2E_OUT=docs/e2e/before`.
   - Run the whole e2e set once on MariaDB as well (`RMP_DB=mariadb`, then `start_server.sh --reset`).
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
- **5.1 compatibility**: prefer fixes that also run on Redmine 5.1 so they can be merged early;
  say so when a fix cannot.
- **Git**: work on `redmine70-migration` only; never push to the default branch; never force-push
  a branch someone else uses. Descriptive commit messages (what and why). Push after every
  commit, together with the updated status in this file: a cloud session can stop at a usage
  limit, and work that is not pushed is lost with its container.
- **GitHub Actions**: manual only (`workflow_dispatch`). Do not add push, pull_request or schedule
  triggers.

## Definition of done

- All items of the work list are done or explicitly deferred with a reason, in this file.
- The plugin's tests are green on Redmine 7.0-stable-GEOxyz with PostgreSQL and MariaDB
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

