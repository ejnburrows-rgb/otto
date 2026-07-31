#!/bin/sh
# Installs the same guardrails into any other repository.
#
#   sh install.sh /path/to/other-repo  "Project Name"
#
# It writes the agent-instruction files that each tool loads on its own, and
# installs git hooks that block committing a credential or force-pushing.
# Safe to re-run. Never overwrites an existing file without saying so.

set -e
TARGET="${1:?usage: sh install.sh /path/to/repo \"Project Name\"}"
NAME="${2:-$(basename "$TARGET")}"
HERE=$(cd "$(dirname "$0")" && pwd)

[ -d "$TARGET/.git" ] || { echo "Not a git repository: $TARGET" >&2; exit 1; }

RULES=$(sed "s/{{PROJECT}}/$NAME/g" "$HERE/AGENT-RULES-TEMPLATE.md")

# One file per tool, because each reads a different filename automatically.
mkdir -p "$TARGET/.github"
for f in CLAUDE.md GEMINI.md AGENTS.md .cursorrules .github/copilot-instructions.md; do
  if [ -e "$TARGET/$f" ]; then
    echo "  kept   $f (already exists — merge by hand if you want the new text)"
  else
    printf '%s\n' "$RULES" > "$TARGET/$f"
    echo "  wrote  $f"
  fi
done

mkdir -p "$TARGET/.githooks"
for h in pre-commit pre-push; do
  cp "$HERE/../../.githooks/$h" "$TARGET/.githooks/$h"
  chmod +x "$TARGET/.githooks/$h"
  echo "  wrote  .githooks/$h"
done

# Turn the hooks on for this clone, and again automatically on every npm install.
( cd "$TARGET" && git config core.hooksPath .githooks )
echo "  hooks are on for this clone"

if [ -f "$TARGET/package.json" ] && ! grep -q '"prepare"' "$TARGET/package.json"; then
  echo ""
  echo "  ONE MANUAL STEP: add this to \"scripts\" in $TARGET/package.json so the"
  echo "  hooks switch themselves on for anyone else who clones it —"
  echo ""
  echo '      "prepare": "git config core.hooksPath .githooks || true",'
fi

echo ""
echo "Done. Guardrails installed in $TARGET"
