#!/usr/bin/env zsh
# run_all.sh — Run all hair_salon E2E flows in order.
#
# HAIR 03 requires 2 PENDING orders to already exist in the DB.
# Maestro evalScript's http.post is non-functional under GraalVM (type coercion
# bug in GraalJsHttp prevents JS objects from being mapped to Map<String,Object>).
# We work around this by seeding the orders via curl before running flow 03.
#
# Usage:
#   ./run_all.sh              # run all 22 flows
#   ./run_all.sh 01 02 03     # run specific flow numbers only

set -uo pipefail

SCRIPT_DIR="${0:A:h}"
ENV_FILE="$SCRIPT_DIR/.env"
FLOWS_DIR="$SCRIPT_DIR/flows"
BASE_URL="http://localhost:6868/api"

# ── Load env vars ─────────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env not found at $ENV_FILE" >&2
  exit 1
fi

typeset -A ENV_VARS
while IFS="=" read -r key val || [[ -n "$key" ]]; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  ENV_VARS[$key]="$val"
done < "$ENV_FILE"

SHOP_ID="${ENV_VARS[SHOP_ID]}"
PHONE="${ENV_VARS[PHONE]}"
PASSWORD="${ENV_VARS[PASSWORD]}"

# ── Build maestro env args ────────────────────────────────────────────────────
MAESTRO_ARGS=()
for key in "${(k)ENV_VARS[@]}"; do
  MAESTRO_ARGS+=(-e "$key=${ENV_VARS[$key]}")
done

MAESTRO="$HOME/.maestro/bin/maestro"

# ── Output file ───────────────────────────────────────────────────────────────
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
OUTPUT_FILE="/tmp/hair_salon_run_${TIMESTAMP}.txt"
echo "Output: $OUTPUT_FILE"
echo "Starting hair_salon run — $(date)" | tee "$OUTPUT_FILE"

# ── Flow list (number → filename) ────────────────────────────────────────────
typeset -A FLOW_FILES
FLOW_FILES[01]="01_auth.yaml"
FLOW_FILES[02]="02_pos_golden_path.yaml"
FLOW_FILES[03]="03_order_complete_cancel.yaml"
FLOW_FILES[04]="04_customer_crud.yaml"
FLOW_FILES[05]="05_appointment_crud.yaml"
FLOW_FILES[06]="06_staff_management.yaml"
FLOW_FILES[07]="07_expense_flow.yaml"
FLOW_FILES[08]="08_product_list.yaml"
FLOW_FILES[09]="09_revenue_report.yaml"
FLOW_FILES[10]="10_notifications.yaml"
FLOW_FILES[11]="11_activity_log.yaml"
FLOW_FILES[12]="12_settings_config.yaml"
FLOW_FILES[13]="13_security_blocked_features.yaml"
FLOW_FILES[14]="14_order_history.yaml"
FLOW_FILES[15]="15_appointment_checkin_pos.yaml"
FLOW_FILES[16]="16_customer_loyalty.yaml"
FLOW_FILES[17]="17_staff_performance_queue.yaml"
FLOW_FILES[18]="18_feedback_submission.yaml"
FLOW_FILES[19]="19_my_work_screen.yaml"
FLOW_FILES[20]="20_print_templates_bank_accounts.yaml"
FLOW_FILES[21]="21_bank_transfer_payment_walkin.yaml"
FLOW_FILES[22]="22_service_categories.yaml"

# ── Determine which flows to run ──────────────────────────────────────────────
if [[ $# -gt 0 ]]; then
  RUN_FLOWS=("$@")
else
  RUN_FLOWS=(01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22)
fi

# ── Seed function: create 2 PENDING orders via curl ──────────────────────────
seed_pending_orders() {
  echo "  [seed] Logging in as $PHONE for shop $SHOP_ID …"

  LOGIN_RESP=$(curl -sf -X POST \
    "$BASE_URL/auth/login/force" \
    -H "Content-Type: application/json" \
    -H "X-Tenant-ID: $SHOP_ID" \
    -d "{\"username\":\"$PHONE\",\"password\":\"$PASSWORD\",\"rememberMe\":false}" \
    2>/dev/null) || {
    echo "  [seed] WARNING: login/force request failed (is backend running?)" >&2
    return 1
  }

  TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['accessToken'])" 2>/dev/null) || {
    echo "  [seed] WARNING: could not parse accessToken from: $LOGIN_RESP" >&2
    return 1
  }
  echo "  [seed] Login OK, token acquired."

  local -a AUTH_HEADERS
  AUTH_HEADERS=(
    -H "Content-Type: application/json"
    -H "X-Tenant-ID: $SHOP_ID"
    -H "Authorization: Bearer $TOKEN"
  )

  # Get first available product
  PRODUCTS_RESP=$(curl -sf "$BASE_URL/products?size=1" "${AUTH_HEADERS[@]}" 2>/dev/null) || {
    echo "  [seed] WARNING: products request failed" >&2
    return 1
  }
  PRODUCT_ID=$(echo "$PRODUCTS_RESP" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d['data']['content'][0]['id'])" 2>/dev/null) || {
    echo "  [seed] WARNING: no products found: $PRODUCTS_RESP" >&2
    return 1
  }
  echo "  [seed] Using product ID: $PRODUCT_ID"

  # Create 2 PENDING orders
  for LABEL in "E2E Test A" "E2E Test B"; do
    echo "  [seed] Creating order: $LABEL …"

    CART_RESP=$(curl -sf -X POST "$BASE_URL/carts" \
      -d '{}' "${AUTH_HEADERS[@]}" 2>/dev/null) || {
      echo "  [seed] WARNING: cart creation failed" >&2; return 1; }
    CART_ID=$(echo "$CART_RESP" | python3 -c \
      "import sys,json; d=json.load(sys.stdin); print(d['data']['cartId'])" 2>/dev/null) || {
      echo "  [seed] WARNING: no cartId in: $CART_RESP" >&2; return 1; }

    curl -sf -X POST "$BASE_URL/carts/$CART_ID/items" \
      -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}" \
      "${AUTH_HEADERS[@]}" > /dev/null 2>/dev/null || {
      echo "  [seed] WARNING: add item failed" >&2; return 1; }

    KITCHEN_RESP=$(curl -sf -X POST "$BASE_URL/carts/$CART_ID/send-to-kitchen" \
      -d "{\"tableLabel\":\"$LABEL\"}" "${AUTH_HEADERS[@]}" 2>/dev/null) || {
      echo "  [seed] WARNING: send-to-kitchen failed" >&2; return 1; }
    echo "  [seed] Order created: $LABEL ($(echo "$KITCHEN_RESP" | python3 -c \
      "import sys,json; d=json.load(sys.stdin); print(d.get('success','?'))" 2>/dev/null))"
  done

  # Logout so the app can log in cleanly (no DEVICE_CONFLICT)
  curl -sf -X POST "$BASE_URL/auth/logout" -d '{}' "${AUTH_HEADERS[@]}" > /dev/null 2>/dev/null || true
  echo "  [seed] Logged out. Seeding complete."
}

# ── Run flows ─────────────────────────────────────────────────────────────────
PASS=0
FAIL=0

for NUM in "${RUN_FLOWS[@]}"; do
  NUM_PADDED=$(printf '%02d' "$NUM")
  FLOW_FILE="${FLOW_FILES[$NUM_PADDED]:-}"
  if [[ -z "$FLOW_FILE" ]]; then
    echo "WARNING: no flow defined for number $NUM — skipping" | tee -a "$OUTPUT_FILE"
    continue
  fi

  FLOW_PATH="$FLOWS_DIR/$FLOW_FILE"
  if [[ ! -f "$FLOW_PATH" ]]; then
    echo "WARNING: flow file not found: $FLOW_PATH — skipping" | tee -a "$OUTPUT_FILE"
    continue
  fi

  # Pre-seed PENDING orders before flow 03
  if [[ "$NUM_PADDED" == "03" ]]; then
    echo "Seeding PENDING orders for HAIR 03 …" | tee -a "$OUTPUT_FILE"
    if ! seed_pending_orders 2>&1 | tee -a "$OUTPUT_FILE"; then
      echo "[WARNING] Seeding failed — HAIR 03 will likely fail at order-row-0 assertion" | tee -a "$OUTPUT_FILE"
    fi
  fi

  # Pre-cleanup for HAIR 04: delete the "Hair Test Maestro" customer left from a previous run.
  # Without this, the pre-cleanup inside the flow tries to delete the customer via UI,
  # which requires a tab-more roundtrip that is unreliable when coming from a sub-screen.
  if [[ "$NUM_PADDED" == "04" ]]; then
    echo "  [pre-04] Cleaning up test customer …" | tee -a "$OUTPUT_FILE"
    LRESP=$(curl -sf -X POST "$BASE_URL/auth/login/force" \
      -H "Content-Type: application/json" -H "X-Tenant-ID: $SHOP_ID" \
      -d "{\"username\":\"$PHONE\",\"password\":\"$PASSWORD\",\"rememberMe\":false}" 2>/dev/null)
    LTOKEN=$(echo "$LRESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['accessToken'])" 2>/dev/null || echo "")
    if [[ -n "$LTOKEN" ]]; then
      AH=(-H "Content-Type: application/json" -H "X-Tenant-ID: $SHOP_ID" -H "Authorization: Bearer $LTOKEN")
      CUST_RESP=$(curl -sf "$BASE_URL/customers?search=Hair+Test+Maestro&size=5" "${AH[@]}" 2>/dev/null || echo "")
      CUST_ID=$(echo "$CUST_RESP" | python3 -c \
        "import sys,json; d=json.load(sys.stdin); c=d.get('data',{}).get('content',[]); print(c[0]['id'] if c else '')" 2>/dev/null || echo "")
      if [[ -n "$CUST_ID" ]]; then
        DEL=$(curl -sf -X DELETE "$BASE_URL/customers/$CUST_ID" "${AH[@]}" 2>/dev/null || echo "")
        echo "  [pre-04] Deleted customer $CUST_ID: $(echo "$DEL" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("success","?"))' 2>/dev/null)" | tee -a "$OUTPUT_FILE"
      else
        echo "  [pre-04] No test customer found — nothing to delete." | tee -a "$OUTPUT_FILE"
      fi
      curl -sf -X POST "$BASE_URL/auth/logout" -d '{}' "${AH[@]}" > /dev/null 2>/dev/null || true
    else
      echo "  [pre-04] WARNING: could not login for customer cleanup" | tee -a "$OUTPUT_FILE"
    fi
  fi

  # Pre-cleanup for HAIR 05: delete all "Khách Hair Test" appointments for today.
  # Without this, old cancelled/confirmed appointments from previous runs appear
  # in the list alongside the newly created one, making appointment-card-0 unreliable.
  if [[ "$NUM_PADDED" == "05" ]]; then
    echo "  [pre-05] Cleaning up old test appointments …" | tee -a "$OUTPUT_FILE"
    TODAY=$(date '+%Y-%m-%d')
    LRESP=$(curl -sf -X POST "$BASE_URL/auth/login/force" \
      -H "Content-Type: application/json" -H "X-Tenant-ID: $SHOP_ID" \
      -d "{\"username\":\"$PHONE\",\"password\":\"$PASSWORD\",\"rememberMe\":false}" 2>/dev/null)
    LTOKEN=$(echo "$LRESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['accessToken'])" 2>/dev/null || echo "")
    if [[ -n "$LTOKEN" ]]; then
      AH=(-H "Content-Type: application/json" -H "X-Tenant-ID: $SHOP_ID" -H "Authorization: Bearer $LTOKEN")
      APPT_RESP=$(curl -sf "$BASE_URL/appointments?date=$TODAY&size=50" "${AH[@]}" 2>/dev/null || echo "")
      # Delete ALL appointments for today so the freshly-created appointment is always
      # appointment-card-0 (gIdx=0, aIdx=0). Pre-existing appointments from previous
      # runs (e.g. "Khách Hair Check-In" from flow 15) would otherwise occupy earlier
      # hour groups, pushing the flow-05 appointment to appointment-card-100 or higher.
      # ${=IDS} forces word-splitting in zsh (unlike $IDS which treats the whole string as one element)
      IDS=$(echo "$APPT_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
content=d.get('data',{}).get('content',[])
ids=[str(a['id']) for a in content]
print(' '.join(ids))
" 2>/dev/null || echo "")
      if [[ -n "$IDS" ]]; then
        for AID in ${=IDS}; do
          DR=$(curl -sf -X DELETE "$BASE_URL/appointments/$AID" "${AH[@]}" 2>/dev/null || echo "")
          echo "  [pre-05] Deleted appointment $AID: $(echo "$DR" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("success","?"))' 2>/dev/null)" | tee -a "$OUTPUT_FILE"
        done
      else
        echo "  [pre-05] No test appointments found for $TODAY." | tee -a "$OUTPUT_FILE"
      fi
      curl -sf -X POST "$BASE_URL/auth/logout" -d '{}' "${AH[@]}" > /dev/null 2>/dev/null || true
    else
      echo "  [pre-05] WARNING: could not login for appointment cleanup" | tee -a "$OUTPUT_FILE"
    fi
  fi

  # Pre-cleanup for HAIR 06: hard-delete test staff account "hair_nv_test_e2e.*"
  # from the DB before each run. The API DELETE endpoint is a soft-delete
  # (sets deleted=true); a soft-deleted row with the same username still violates
  # the unique constraint uq_users_username_tenant unless the constraint has the
  # partial filter "AND deleted <> true" (fixed by V002 migration). Using a direct
  # psql hard-delete is the most robust approach for local test data cleanup.
  if [[ "$NUM_PADDED" == "06" ]]; then
    echo "  [pre-06] Cleaning up test staff account …" | tee -a "$OUTPUT_FILE"
    # Hard-delete all rows (active or soft-deleted) matching the test username prefix.
    # psql outputs "DELETE N" where N is the row count.
    DEL_OUT=$(psql -U postgres -d tappy-pos -c \
      "DELETE FROM users WHERE username LIKE 'hair_nv_test_e2e.%' AND tenant_id = '$SHOP_ID'" 2>/dev/null || echo "DELETE 0")
    ROWS=$(echo "$DEL_OUT" | grep -oE 'DELETE [0-9]+' | grep -oE '[0-9]+' || echo "0")
    if [[ "$ROWS" == "0" || -z "$ROWS" ]]; then
      echo "  [pre-06] No test staff found — nothing to delete." | tee -a "$OUTPUT_FILE"
    else
      echo "  [pre-06] Hard-deleted $ROWS test staff row(s) from DB." | tee -a "$OUTPUT_FILE"
    fi
  fi

  # Pre-cleanup for HAIR 15: delete all "Khách Hair Check-In" appointments for today.
  # Flow 15 creates an appointment and checks it in. Old checked-in/cancelled appointments
  # from previous runs accumulate in the list, making appointment-card-0 unreliable.
  if [[ "$NUM_PADDED" == "15" ]]; then
    echo "  [pre-15] Cleaning up 'Khách Hair Check-In' appointments …" | tee -a "$OUTPUT_FILE"
    TODAY=$(date '+%Y-%m-%d')
    LRESP=$(curl -sf -X POST "$BASE_URL/auth/login/force" \
      -H "Content-Type: application/json" -H "X-Tenant-ID: $SHOP_ID" \
      -d "{\"username\":\"$PHONE\",\"password\":\"$PASSWORD\",\"rememberMe\":false}" 2>/dev/null)
    LTOKEN=$(echo "$LRESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['accessToken'])" 2>/dev/null || echo "")
    if [[ -n "$LTOKEN" ]]; then
      AH=(-H "Content-Type: application/json" -H "X-Tenant-ID: $SHOP_ID" -H "Authorization: Bearer $LTOKEN")
      APPT_RESP=$(curl -sf "$BASE_URL/appointments?date=$TODAY&size=50" "${AH[@]}" 2>/dev/null || echo "")
      IDS=$(echo "$APPT_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
content=d.get('data',{}).get('content',[])
ids=[str(a['id']) for a in content if 'Khách Hair Check-In' in (a.get('customerName') or a.get('guestName') or '')]
print(' '.join(ids))
" 2>/dev/null || echo "")
      if [[ -n "$IDS" ]]; then
        for AID in ${=IDS}; do
          DR=$(curl -sf -X DELETE "$BASE_URL/appointments/$AID" "${AH[@]}" 2>/dev/null || echo "")
          echo "  [pre-15] Deleted appointment $AID: $(echo "$DR" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("success","?"))' 2>/dev/null)" | tee -a "$OUTPUT_FILE"
        done
      else
        echo "  [pre-15] No 'Khách Hair Check-In' appointments found for $TODAY." | tee -a "$OUTPUT_FILE"
      fi
      curl -sf -X POST "$BASE_URL/auth/logout" -d '{}' "${AH[@]}" > /dev/null 2>/dev/null || true
    else
      echo "  [pre-15] WARNING: could not login for appointment cleanup" | tee -a "$OUTPUT_FILE"
    fi
  fi

  echo -n "Running HAIR $NUM_PADDED ($FLOW_FILE) … " | tee -a "$OUTPUT_FILE"
  START_TS=$(date +%s)

  # Write maestro output to a temp file to cleanly separate stdout from exit code.
  # Hard cap of 480s (8 min) per flow — prevents XCUITest driver freezes from
  # turning a single hung flow into a 70+ minute wall-clock block.
  TMPOUT=$(mktemp)
  timeout 480 "$MAESTRO" test "${MAESTRO_ARGS[@]}" "$FLOW_PATH" > "$TMPOUT" 2>&1
  EXIT_CODE=$?
  FLOW_OUTPUT=$(cat "$TMPOUT")
  rm -f "$TMPOUT"

  END_TS=$(date +%s)
  DURATION=$(( END_TS - START_TS ))
  MINUTES=$(( DURATION / 60 ))
  SECONDS=$(( DURATION % 60 ))

  # Extract failure reason from maestro output (last Assertion/Element error line)
  FAILURE_REASON=$(echo "$FLOW_OUTPUT" | grep -E "(Assertion is false|Element not found|Error)" | tail -1 || true)

  if [[ $EXIT_CODE -eq 0 ]]; then
    RESULT="[Passed] HAIR $NUM_PADDED ($FLOW_FILE) (${MINUTES}m ${SECONDS}s)"
    PASS=$(( PASS + 1 ))
  else
    RESULT="[Failed] HAIR $NUM_PADDED ($FLOW_FILE) (${MINUTES}m ${SECONDS}s)${FAILURE_REASON:+ ($FAILURE_REASON)}"
    FAIL=$(( FAIL + 1 ))
  fi

  echo "$RESULT" | tee -a "$OUTPUT_FILE"
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo "" | tee -a "$OUTPUT_FILE"
echo "═══════════════════════════════════════════════" | tee -a "$OUTPUT_FILE"
echo "Results: $PASS passed, $FAIL failed" | tee -a "$OUTPUT_FILE"
echo "Output saved to: $OUTPUT_FILE"

if [[ $FAIL -eq 0 ]]; then
  exit 0
else
  exit 1
fi
