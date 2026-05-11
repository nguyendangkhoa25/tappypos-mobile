#!/usr/bin/env bash
# Reads e2e/.env and passes all KEY=VALUE pairs to maestro as -e flags.
# Usage: e2e/maestro.sh <flow-files>
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

ARGS=()
while IFS='=' read -r key val || [[ -n "$key" ]]; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  ARGS+=(-e "$key=$val")
done < "$ENV_FILE"

exec "$HOME/.maestro/bin/maestro" test "${ARGS[@]}" "$@"
