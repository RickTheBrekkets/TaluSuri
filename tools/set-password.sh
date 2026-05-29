#!/usr/bin/env bash
# TaluSuri — set a password for an existing Supabase auth user (e.g. old magic-link
# accounts that have no password under the new email+password login).
#
# Uses the Admin API — no email sent, instant. Needs the SECRET service_role key,
# which is read from the environment so it is never hardcoded or committed.
#
#   export SUPABASE_SERVICE_ROLE_KEY='...'        # Supabase → Settings → API → service_role (secret)
#   tools/set-password.sh user@example.com 'newPassword123'
#
# Optional: export SUPABASE_URL to override the default project URL.
set -euo pipefail

URL="${SUPABASE_URL:-https://jhfhbonsdfxrebfpqusv.supabase.co}"
KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
EMAIL="${1:-}"
PASSWORD="${2:-}"

if [[ -z "$KEY" ]]; then echo "Set SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API → service_role)." >&2; exit 1; fi
if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then echo "Usage: $0 <email> <new-password>" >&2; exit 1; fi
if ! command -v jq >/dev/null; then echo "jq required (apt-get install jq)." >&2; exit 1; fi

auth=(-H "apikey: $KEY" -H "Authorization: Bearer $KEY")

# Find the user id by email (admin list is paginated; 200/page is plenty here).
id=$(curl -s "${auth[@]}" "$URL/auth/v1/admin/users?per_page=200" \
  | jq -r --arg e "$EMAIL" '.users[] | select(.email==$e) | .id')

if [[ -z "$id" || "$id" == "null" ]]; then echo "No user found for $EMAIL." >&2; exit 1; fi

code=$(curl -s -o /tmp/setpw.out -w '%{http_code}' -X PUT "$URL/auth/v1/admin/users/$id" \
  "${auth[@]}" -H "Content-Type: application/json" \
  -d "$(jq -nc --arg p "$PASSWORD" '{password:$p}')")

if [[ "$code" == "200" ]]; then echo "OK — password set for $EMAIL ($id). Log in with email + the new password."
else echo "Failed (HTTP $code):" >&2; cat /tmp/setpw.out >&2; exit 1; fi
