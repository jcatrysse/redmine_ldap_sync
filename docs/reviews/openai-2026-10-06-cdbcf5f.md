# OpenAI review cdbcf5f

Model `gpt-5`, range `b1b0fbf..cdbcf5f`, 36 file(s), 1 request(s), 43127 tokens.

Add a `Resolution:` line under every finding: fixed in <commit>, or why not.

## Part 1 of 1

Blocker, assets/javascripts/ldap_settings.js: the AJAX request on the Test tab does not send a CSRF token
- Problem: The click handler for the “Execute” link sends a raw jQuery $.ajax PUT to /admin/ldap_sync/:id/test.text without adding the Rails authenticity token header. In this change, the controller no longer skips CSRF verification for the test action (it only skips for base_settings), and the link in _test.html.erb was changed to remove data-remote/data-method. Without rails-ujs handling or an explicit X-CSRF-Token header, Rails 7/8 will reject the request with 422 Unprocessable Entity.
- Failure scenario: As admin, go to Administration > LDAP synchronization > E2E LDAP > tab “Test” and click “Execute”. The request is a PUT without token; Rails responds 422. The page shows “422 Unprocessable Entity” (or nothing, depending on the length check); no test result is returned.
- Fix: Include the CSRF token in the AJAX request, e.g.:
  - Read it from the meta tag and set the header:
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    $.ajax({
      url, type: 'PUT', data: $('#ldap-test').serialize(),
      headers: token ? { 'X-CSRF-Token': token } : {},
      ...
    });
  - Or restore rails-ujs handling by keeping data-remote and data-method on the link and preventing the default navigation in the handler (so only one request is sent), letting rails-ujs attach the token automatically.

Resolution: not a bug, no change. The handler sends `$('form[id^="edit_ldap_setting"]').serialize()`, and that form (labelled_form_for) contains the hidden `authenticity_token` field, which Rails accepts as the CSRF token for a PUT; Redmine's application.js also adds the X-CSRF-Token header to jQuery requests. Shown on a real Redmine 7 in production mode with forgery protection on: test/e2e/test_tab.mjs gets the full result (docs/e2e/test_tab-result.png) with exactly one PUT per click and no 422, on PostgreSQL and MariaDB, and on Redmine 5.1. No further finding accepted: review loop closed.

