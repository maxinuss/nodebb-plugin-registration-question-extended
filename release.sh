#!/usr/bin/env bash
set -euo pipefail

# Uso:
#   ./release.sh            sube patch, commitea, tagea, pushea, publica en npm y actualiza nbbpm
#   ./release.sh minor
#   ./release.sh major
#   ./release.sh none       publica la versión actual sin bump
#   DRY_RUN=1 ./release.sh  valida y simula npm publish (sin cambios)

BRANCH="${BRANCH:-main}"
REMOTE="${REMOTE:-origin}"
NBBPM_URL="${NBBPM_URL:-https://packages.nodebb.org/api/v1/plugins}"
BUMP="${1:-patch}"
DRY_RUN="${DRY_RUN:-0}"

cd "$(dirname "$0")"

say()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mError: %s\033[0m\n' "$*" >&2; exit 1; }

command -v git >/dev/null || fail "git no está instalado"
command -v npm >/dev/null || fail "npm no está instalado"
command -v node >/dev/null || fail "node no está instalado"

say "Comprobando repositorio"
[ -d .git ] || fail "Ejecutá este script en la raíz del repo"
[ "$(git rev-parse --abbrev-ref HEAD)" = "$BRANCH" ] || \
  fail "Tenés que estar en la rama '$BRANCH'"
[ -z "$(git status --porcelain)" ] || \
  fail "Hay cambios sin commitear. Limpiá el working tree primero."

say "Comprobando autenticación de npm"
npm whoami >/dev/null 2>&1 || fail "No estás logueado en npm. Ejecutá: npm login"

case "$BUMP" in
  none|patch|minor|major) ;;
  *) fail "Uso: $0 [none|patch|minor|major]" ;;
esac

if [ "$DRY_RUN" = "1" ]; then
  say "DRY_RUN: no se sube versión ni se hace push"
  BUMP="none"
fi

say "Sincronizando con $REMOTE/$BRANCH"
git fetch "$REMOTE" "$BRANCH"
git merge --ff-only "$REMOTE/$BRANCH"

if [ "$DRY_RUN" != "1" ] && [ "$BUMP" != "none" ]; then
  say "Subiendo versión ($BUMP)"
  npm version "$BUMP" -m "chore(release): v%s"
fi

NAME="$(node -p "require('./package.json').name")"
VERSION="$(node -p "require('./package.json').version")"
TAG="v$VERSION"

say "Validando $NAME@$VERSION"
node --check library.js
node --check static/lib/admin.js
node --check static/lib/main.js
for f in package.json plugin.json languages/*/registration-question.json; do
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$f"
done

if [ "$(node -p "require('./package.json').scripts?.test || ''")" != "" ]; then
  say "Ejecutando tests"
  npm test
fi

if npm view "$NAME@$VERSION" version >/dev/null 2>&1; then
  fail "$NAME@$VERSION ya está publicado en npm"
fi

if [ "$DRY_RUN" = "1" ]; then
  say "Revisando contenido del paquete"
  npm pack --dry-run
  say "Simulando publicación"
  npm publish --dry-run --access public
  say "DRY_RUN completado: $NAME@$VERSION"
  exit 0
fi

if ! git rev-parse "$TAG" >/dev/null 2>&1; then
  say "Creando tag $TAG"
  git tag -a "$TAG" -m "Release $VERSION"
fi

say "Push de commits y tag"
git push "$REMOTE" "$BRANCH"
git push "$REMOTE" "$TAG"

say "Revisando contenido del paquete"
npm pack --dry-run

say "Publicando en npm"
npm publish --access public

say "Actualizando metadata en NodeBB Package Manager"
curl -fsS -X PUT "$NBBPM_URL/$NAME" || \
  fail "npm publicó $NAME@$VERSION, pero falló la actualización de nbbpm. Reintentá con: curl -X PUT $NBBPM_URL/$NAME"
printf '\n'

say "Listo: $NAME@$VERSION (npm + nbbpm)"
