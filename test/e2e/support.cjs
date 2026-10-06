// Helpers for this plugin's scenarios (not a scenario itself: e2e.sh runs *.mjs).
// They run commands against the same Redmine as the browser: rails runner and
// rake in RMP_SERVER_ENV (production), in REDMINE_DIR.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REDMINE_DIR = process.env.REDMINE_DIR || 'redmine';
const ENV = { ...process.env, RAILS_ENV: process.env.RMP_SERVER_ENV || 'production' };
const OUT = process.env.RMP_E2E_OUT || 'docs/e2e';

function bundle(args, env = {}) {
  try {
    return execFileSync('bundle', ['exec', ...args], {
      cwd: REDMINE_DIR, env: { ...ENV, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    return `${e.stdout || ''}${e.stderr || ''}\n(exit ${e.status})`;
  }
}

// Runs Ruby code with rails runner and returns its stdout.
function rails(code) {
  return bundle(['rails', 'runner', code]).trim();
}

// Runs one of the plugin's rake tasks, writes the output to docs/e2e/<file> and returns it.
function rake(task, env, file) {
  const out = bundle(['rake', `redmine:plugins:ldap_sync:${task}`], env);
  if (file) fs.writeFileSync(path.join(OUT, file), `$ ${Object.entries(env).map(([k, v]) => `${k}=${v} `).join('')}rake redmine:plugins:ldap_sync:${task}\n${out}`);
  return out;
}

const COUNTS = "puts [User.where(type: 'User').count, Group.givable.count, " +
  "ActiveRecord::Base.connection.select_value('SELECT COUNT(*) FROM groups_users').to_i, CustomValue.count, " +
  "User.where(status: User::STATUS_LOCKED).count].join(' ')";

// users, groups, memberships, custom values, locked users
function counts() {
  const [users, groups, memberships, customValues, locked] = rails(COUNTS).split('\n').pop().split(' ').map(Number);
  return { users, groups, memberships, customValues, locked };
}

// Removes what an earlier run created from LDAP, so a scenario starts the same every time.
function resetLdapData() {
  return rails("src = AuthSourceLdap.find_by(name: 'E2E LDAP'); " +
    'User.where(auth_source_id: src.id).find_each(&:destroy); ' +
    "Group.givable.where.not(lastname: ['E2E team']).find_each(&:destroy); " +
    'FileUtils.rm_rf(Rails.root.join("tmp/ldap_cache")); puts :ok');
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// Shows command output in the browser so it can be screenshotted like a page.
async function showText(page, title, text) {
  await page.setContent(`<html><body style="font-family:sans-serif;margin:16px"><h3>${escapeHtml(title)}</h3>` +
    `<pre style="white-space:pre-wrap;font-size:12px">${escapeHtml(text)}</pre></body></html>`);
}

module.exports = { rails, rake, counts, resetLdapData, showText };
