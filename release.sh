#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./release.sh            bumps the patch version, commits, tags, pushes, publishes to npm, and updates nbbpm
#   ./release.sh minor
#   ./release.sh major
#   ./release.sh none       publishes the current version without bumping it
#   ./release.sh sync       waits for the current version on npm and refreshes nbbpm
#   DRY_RUN=1 ./release.sh  syncs the branch, validates the package, and simulates publishing

BRANCH="${BRANCH:-main}"
REMOTE="${REMOTE:-origin}"
NBBPM_URL="${NBBPM_URL:-https://packages.nodebb.org/api/v1/plugins}"
BUMP="${1:-patch}"
DRY_RUN="${DRY_RUN:-0}"
SYNC_TIMEOUT_SECONDS="${SYNC_TIMEOUT_SECONDS:-300}"

cd "$(dirname "$0")"

say()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mError: %s\033[0m\n' "$*" >&2; exit 1; }

command -v npm >/dev/null || fail "npm is not installed"
command -v node >/dev/null || fail "node is not installed"

case "$BUMP" in
  none|patch|minor|major|sync) ;;
  *) fail "Usage: $0 [none|patch|minor|major|sync]" ;;
esac

if [ "$DRY_RUN" != "1" ]; then
  command -v curl >/dev/null || fail "curl is not installed"
  [[ "$SYNC_TIMEOUT_SECONDS" =~ ^[1-9][0-9]*$ ]] || \
    fail "SYNC_TIMEOUT_SECONDS must be a positive integer"
fi

wait_for() {
  local deadline=$((SECONDS + SYNC_TIMEOUT_SECONDS))
  local remaining
  until "$@"; do
    remaining=$((deadline - SECONDS))
    (( remaining > 0 )) || return 1
    sleep "$((remaining < 10 ? remaining : 10))"
  done
}

npm_has_current_version() {
  local latest
  latest="$(npm view "$NAME" dist-tags.latest --registry=https://registry.npmjs.org/ \
    --prefer-online --fetch-retries=0 --fetch-timeout=10000 2>/dev/null)" || return 1
  [ "$latest" = "$VERSION" ]
}

nodebb_has_current_version() {
  curl -fsS --max-time 10 -H 'Cache-Control: no-cache' "$NBBPM_URL/$NAME" | \
    node -e '
      const data = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
      process.exitCode = data.code === "ok" && data.payload?.latest === process.argv[1] ? 0 : 1;
    ' "$VERSION" 2>/dev/null
}

refresh_nodebb() {
  if nodebb_has_current_version; then
    return 0
  fi
  curl -fsS --max-time 10 -X PUT "$NBBPM_URL/$NAME" >/dev/null || return 1
  nodebb_has_current_version
}

sync_release() {
  say "Waiting for npm to list $NAME@$VERSION as latest"
  wait_for npm_has_current_version || \
    fail "npm does not list $NAME@$VERSION as latest yet. Retry with: ./release.sh sync"

  say "Refreshing NodeBB Package Manager and waiting for $VERSION"
  wait_for refresh_nodebb || \
    fail "NodeBB Package Manager does not list $NAME@$VERSION as latest yet. Retry with: ./release.sh sync"

  say "Release complete: $NAME@$VERSION (npm + nbbpm)"
}

if [ "$BUMP" = "sync" ]; then
  [ "$DRY_RUN" != "1" ] || fail "The sync command does not support DRY_RUN"
else
  command -v git >/dev/null || fail "git is not installed"

  say "Checking the repository"
  [ -d .git ] || fail "Run this script from the repository root"
  [ "$(git rev-parse --abbrev-ref HEAD)" = "$BRANCH" ] || \
    fail "You must be on the '$BRANCH' branch"
  [ -z "$(git status --porcelain)" ] || \
    fail "The working tree must be clean before releasing"

  say "Checking npm authentication"
  npm whoami >/dev/null 2>&1 || fail "You are not logged in to npm. Run: npm login"

  say "Syncing with $REMOTE/$BRANCH"
  git fetch "$REMOTE" "$BRANCH"
  git merge --ff-only "$REMOTE/$BRANCH"

  if [ "$DRY_RUN" = "1" ]; then
    say "DRY_RUN: skipping the version bump and push"
  elif [ "$BUMP" != "none" ]; then
    say "Bumping the version ($BUMP)"
    npm version "$BUMP" -m "chore(release): v%s"
  fi
fi

NAME="$(node -p "require('./package.json').name")"
VERSION="$(node -p "require('./package.json').version")"

if [ "$BUMP" = "sync" ]; then
  sync_release
  exit 0
fi

TAG="v$VERSION"

say "Validating $NAME@$VERSION"
node --check library.js
node --check static/lib/admin.js
node --check static/lib/main.js
for f in package.json plugin.json languages/*/registration-question.json; do
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$f"
done

if [ "$(node -p "require('./package.json').scripts?.test || ''")" != "" ]; then
  say "Running tests"
  npm test
fi

if npm view "$NAME@$VERSION" version >/dev/null 2>&1; then
  fail "$NAME@$VERSION is already published on npm"
fi

if [ "$DRY_RUN" = "1" ]; then
  say "Checking package contents"
  npm pack --dry-run
  say "Simulating publication to npm"
  npm publish --dry-run --access public
  say "DRY_RUN complete: $NAME@$VERSION"
  exit 0
fi

if ! git rev-parse "$TAG" >/dev/null 2>&1; then
  say "Creating tag $TAG"
  git tag -a "$TAG" -m "Release $VERSION"
fi

say "Pushing commits and tag"
git push "$REMOTE" "$BRANCH"
git push "$REMOTE" "$TAG"

say "Checking package contents"
npm pack --dry-run

say "Publishing to npm"
npm publish --access public

sync_release
