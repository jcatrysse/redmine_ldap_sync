#!/usr/bin/env bash
#
# Starts the test LDAP server the plugin's tests and the e2e scenarios use:
# slapd on ldap://localhost:3389 with test/fixtures/ldap/slapd.conf and
# test/fixtures/ldap/test-ldap.ldif (base dc=redmine,dc=org, admin
# cn=admin,dc=redmine,dc=org / password), as script/ci.sh start_ldap does.
#
#   ./.codex/start_ldap.sh          # start (restarts with fresh data)
#   ./.codex/start_ldap.sh --stop
#
# The fixtures were written for OpenLDAP 2.4 (back_hdb, ppolicy.schema, the 2.4
# dynlist overlay). By default this fetches slapd 2.4.49 from the Ubuntu 20.04
# archive and runs it from a private directory (nothing is installed). With
# RMP_LDAP_SYSTEM=1 it uses the system slapd (2.5+) instead: back_mdb, ppolicy
# as a module; there the 280-character "Loremipsum..." group does not fit in
# back_mdb's keys and the 2.5+ dynlist does not fill `member` of groupOfURLs the
# way the tests expect, so some tests fail for reasons of the server, not the plugin.
#
# Needs ldap-utils (ldapadd, ldapsearch); the 2.4 slapd also needs libgssapi3-heimdal.
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LDAPBASE="${RMP_LDAP_DIR:-${TMPDIR:-/tmp}/redmine_ldap_sync_slapd}"
DIST="${RMP_LDAP_DIST:-${TMPDIR:-/tmp}/redmine_ldap_sync_slapd24}"
LDAPCONF="$PLUGIN_ROOT/test/fixtures/ldap"
URI='ldap://localhost:3389/'

stop() {
  if [ -f "$LDAPBASE/slapd.pid" ]; then
    kill "$(cat "$LDAPBASE/slapd.pid")" 2>/dev/null || true
    for _ in $(seq 1 20); do [ -f "$LDAPBASE/slapd.pid" ] || break; sleep 0.25; done
  fi
  pkill -f "slapd .*-f $LDAPBASE/slapd.conf" 2>/dev/null || true
}

stop
[ "${1:-}" = --stop ] && { echo "slapd stopped."; exit 0; }

command -v ldapadd >/dev/null 2>&1 || { echo "ERROR: ldapadd not found (apt-get install ldap-utils)." >&2; exit 1; }

if [ "${RMP_LDAP_SYSTEM:-0}" = 1 ]; then
  PATH="$PATH:/usr/sbin"
  SLAPD="$(command -v slapd || true)"
  [ -n "$SLAPD" ] || { echo "ERROR: slapd not found (apt-get install slapd)." >&2; exit 1; }
  if [ -f /etc/openldap/schema/core.schema ]; then SCHEMABASE=/etc/openldap/schema; else SCHEMABASE=/etc/ldap/schema; fi
  MODULEDIR="$(dirname "$(find /usr/lib* -name 'back_mdb.so' 2>/dev/null | head -n 1)")"
else
  if [ ! -x "$DIST/root/usr/sbin/slapd" ]; then
    pool=http://archive.ubuntu.com/ubuntu/pool/main
    mkdir -p "$DIST/root"
    for deb in o/openldap/slapd_2.4.49+dfsg-2ubuntu1_amd64.deb \
               o/openldap/libldap-2.4-2_2.4.49+dfsg-2ubuntu1_amd64.deb \
               d/db5.3/libdb5.3_5.3.28+dfsg1-0.6ubuntu2_amd64.deb; do
      curl -sSfL -o "$DIST/$(basename "$deb")" "$pool/$deb"
      dpkg-deb -x "$DIST/$(basename "$deb")" "$DIST/root"
    done
  fi
  SLAPD="$DIST/root/usr/sbin/slapd"
  SCHEMABASE="$DIST/root/etc/ldap/schema"
  MODULEDIR="$DIST/root/usr/lib/ldap"
  export LD_LIBRARY_PATH="$DIST/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

rm -rf "$LDAPBASE"
mkdir -p "$LDAPBASE/db"
sed -e "s|/var/run/slapd/slapd.pid|$LDAPBASE/slapd.pid|" \
    -e "s|/var/run/slapd/slapd.args|$LDAPBASE/slapd.args|" \
    -e "s|/var/lib/ldap|$LDAPBASE/db|" \
    -e "s|/etc/ldap/schema|$SCHEMABASE|" \
    "$LDAPCONF/slapd.conf" > "$LDAPBASE/slapd.conf"
if [ ! -f "$SCHEMABASE/ppolicy.schema" ]; then
  # OpenLDAP 2.5+: the pwdPolicy schema comes with the ppolicy module
  sed -i -e '/ppolicy.schema/d' -e 's/^moduleload[[:space:]]*dynlist.la/&\nmoduleload ppolicy.la/' "$LDAPBASE/slapd.conf"
fi
if [ -n "$MODULEDIR" ] && [ ! -f "$MODULEDIR/back_hdb.so" ]; then
  sed -i -e 's/^moduleload[[:space:]]*back_hdb.la/moduleload back_mdb.la/' \
         -e 's/^database[[:space:]]*hdb/database        mdb/' "$LDAPBASE/slapd.conf"
fi
[ -n "$MODULEDIR" ] && sed -i "1i modulepath $MODULEDIR" "$LDAPBASE/slapd.conf"

"$SLAPD" -f "$LDAPBASE/slapd.conf" -h "$URI" > "$LDAPBASE/slapd.log" 2>&1 || {
  echo "ERROR: slapd did not start:" >&2; cat "$LDAPBASE/slapd.log" >&2; exit 1; }

for _ in $(seq 1 40); do
  ldapsearch -x -H "$URI" -b '' -s base >/dev/null 2>&1 && break
  sleep 0.25
done

# -c: go on past an entry the server refuses (see RMP_LDAP_SYSTEM above), and say so.
ldapadd -c -x -D 'cn=admin,dc=redmine,dc=org' -w password -H "$URI" -f "$LDAPCONF/test-ldap.ldif" > "$LDAPBASE/ldapadd.log" 2>&1 || true
refused="$(grep -c '^ldap_add:' "$LDAPBASE/ldapadd.log" || true)"
[ "$refused" = 0 ] || echo "WARNING: slapd refused $refused entr(y/ies) of the fixture, see $LDAPBASE/ldapadd.log"
echo "slapd is running on $URI" \
     "($(ldapsearch -x -H "$URI" -b dc=redmine,dc=org -LLL dn 2>/dev/null | grep -c '^dn:') entries), data in $LDAPBASE"
