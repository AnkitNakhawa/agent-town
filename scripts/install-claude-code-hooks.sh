#!/bin/bash
set -euo pipefail

SERVER_URL="${AGENT_TOWN_URL:-http://localhost:4317}"
APPLY=false
TARGET_FILE=".claude/settings.local.json"

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    --*) echo "Unknown flag: $arg" >&2; exit 1 ;;
    *) TARGET_FILE="$arg" ;;
  esac
done

HOOK_JSON_FILE=$(mktemp)
trap 'rm -f "$HOOK_JSON_FILE"' EXIT

cat > "$HOOK_JSON_FILE" <<JSON
{
  "hooks": {
    "SessionStart": [{"matcher": "*", "hooks": [{"type": "http", "url": "${SERVER_URL}/api/hooks/claude-code", "timeout": 5}]}],
    "UserPromptSubmit": [{"matcher": "*", "hooks": [{"type": "http", "url": "${SERVER_URL}/api/hooks/claude-code", "timeout": 5}]}],
    "PreToolUse": [{"matcher": "*", "hooks": [{"type": "http", "url": "${SERVER_URL}/api/hooks/claude-code", "timeout": 5}]}],
    "PermissionRequest": [{"matcher": "*", "hooks": [{"type": "http", "url": "${SERVER_URL}/api/hooks/claude-code", "timeout": 60}]}],
    "Stop": [{"matcher": "*", "hooks": [{"type": "http", "url": "${SERVER_URL}/api/hooks/claude-code", "timeout": 5}]}]
  }
}
JSON

if [ "$APPLY" = false ]; then
  cat <<EOF
Agent Town — Claude Code hooks (opt-in)

This script does NOT modify any files unless you pass --apply.
It reports your agent's status and requests approval decisions
through the running Agent Town server at ${SERVER_URL}.

Copy the JSON below into your project's .claude/settings.json
(or .claude/settings.local.json to keep it out of git), merging
it into any existing "hooks" key rather than replacing the file:

EOF
  cat "$HOOK_JSON_FILE"
  cat <<EOF

To merge it in automatically instead (writes to
${TARGET_FILE} in the current directory by default,
asks for confirmation first, and preserves any existing hooks):

  $0 --apply [path-to-settings.json]

This is always project-scoped — it will never touch your global
~/.claude/settings.json.
EOF
  exit 0
fi

if [[ "$TARGET_FILE" == "$HOME/.claude/settings.json" ]]; then
  echo "Refusing to --apply to your global settings.json. Pass a project-local path instead." >&2
  exit 1
fi

mkdir -p "$(dirname "$TARGET_FILE")"
if [ ! -f "$TARGET_FILE" ]; then
  echo "{}" > "$TARGET_FILE"
fi

echo "About to merge the Agent Town hook config into: $TARGET_FILE"
echo "Current contents:"
cat "$TARGET_FILE"
echo
read -r -p "Proceed? [y/N] " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Aborted, no changes made."
  exit 1
fi

node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';

const targetPath = process.argv[1];
const incoming = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const existing = JSON.parse(readFileSync(targetPath, 'utf8'));

existing.hooks = existing.hooks ?? {};
for (const [event, matchers] of Object.entries(incoming.hooks)) {
  const current = existing.hooks[event] ?? [];
  const alreadyInstalled = JSON.stringify(current).includes('/api/hooks/claude-code');
  existing.hooks[event] = alreadyInstalled ? current : current.concat(matchers);
}

writeFileSync(targetPath, JSON.stringify(existing, null, 2) + '\n');
" "$TARGET_FILE" "$HOOK_JSON_FILE"

echo "Done. Wrote merged hooks config to $TARGET_FILE"
echo "Restart any active Claude Code session in this project for the hooks to take effect."
