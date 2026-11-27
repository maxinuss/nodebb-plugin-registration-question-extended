#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./release.sh            bumps the patch version, commits, tags, pushes, publishes to npm, and updates nbbpm
#   ./release.sh minor
#   ./release.sh major
#   ./release.sh none       publishes the current version without bumping it
#   DRY_RUN=1 ./release.sh  syncs the branch, validates the package, and simulates publishing

BRANCH="${BRANCH:-main}"
REMOTE="${REMOTE:-origin}"
NBBPM_URL="${NBBPM_URL:-https://packages.nodebb.org/api/v1/plugins}"
BUMP="${1:-patch}"
DRY_RUN="${DRY_RUN:-0}"

cd "$(dirname "$0")"

say()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mError: %s\033[0m\n' "$*" >&2; exit 1; }

command -v git >/dev/null || fail "git is not installed"
command -v npm >/dev/null || fail "npm is not installed"
command -v node >/dev/null || fail "node is not installed"

say "Checking the repository"
[ -d .git ] || fail "Run this script from the repository root"
[ "$(git rev-parse --abbrev-ref HEAD)" = "$BRANCH" ] || \
  fail "You must be on the '$BRANCH' branch"
[ -z "$(git status --porcelain)" ] || \
  fail "The working tree must be clean before releasing"

say "Checking npm authentication"
npm whoami >/dev/null 2>&1 || fail "You are not logged in to npm. Run: npm login"

case "$BUMP" in
  none|patch|minor|major) ;;
  *) fail "Usage: $0 [none|patch|minor|major]" ;;
esac

if [ "$DRY_RUN" = "1" ]; then
  say "DRY_RUN: skipping the version bump and push"
  BUMP="none"
fi

say "Syncing with $REMOTE/$BRANCH"
git fetch "$REMOTE" "$BRANCH"
git merge --ff-only "$REMOTE/$BRANCH"

if [ "$DRY_RUN" != "1" ] && [ "$BUMP" != "none" ]; then
  say "Bumping the version ($BUMP)"
  npm version "$BUMP" -m "chore(release): v%s"
fi

NAME="$(node -p "require('./package.json').name")"
VERSION="$(node -p "require('./package.json').version")"
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

say "Updating metadata in NodeBB Package Manager"
curl -fsS -X PUT "$NBBPM_URL/$NAME" || \
  fail "$NAME@$VERSION was published to npm, but the nbbpm update failed. Retry with: curl -X PUT $NBBPM_URL/$NAME"
printf '\n'

say "Release complete: $NAME@$VERSION (npm + nbbpm)"
