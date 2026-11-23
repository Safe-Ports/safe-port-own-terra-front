# Flujo de release — front

## Ramas
- `develop`: trabajo diario. Todo cambio entra por PR — **branch protection bloquea el push directo, incluso a `develop`**.
- `main`: lo que está (o va a estar) en producción. Se llega mergeando una rama `release/X.Y.Z` (ver abajo).

## Pull requests
- Todo PR usa la plantilla (`.github/pull_request_template.md`) y corre CI (`.github/workflows/ci.yml`: lint + tests + build) antes de poder mergearse.
- Requiere 1 aprobación. **@ABISUKI y Fernando se aprueban los PRs mutuamente** (GitHub no deja auto-aprobar el propio) — esto hasta que el equipo crezca y se pueda repartir distinto.

## Versionado y tags — automático
- Prefijo de este repo: **sin prefijo**, solo `vMAJOR.MINOR.PATCH`.
  - **patch**: fix sin cambio de comportamiento externo.
  - **minor**: feature nueva, compatible hacia atrás.
  - **major**: cambio grande de UX/flujo que amerita avisar al equipo antes de desplegar.
- **Ya no se crea el tag a mano.** El flujo es:
  1. Desde `develop`, crea una rama `release/X.Y.Z` (tú decides el número, igual que antes).
  2. Ábrela como PR hacia `main`, que se apruebe, mergéala.
  3. `.github/workflows/release-tag.yml` detecta el merge, lee `X.Y.Z` del nombre de la rama, y crea + pushea el tag `vX.Y.Z` solo — sin intervención manual.
- Antes de desplegar a prod, acuérdate de `git checkout main && git pull` para bajar el tag nuevo que el workflow ya creó.

## Deploy a producción
- Script: `scripts/deploy-prod-frontend.sh` (exige estar en `main`, árbol limpio y un tag exacto en el commit actual — si falta, el script se niega a correr).
- **Quién lo ejecuta: solo @ABISUKI o Fernando.** Los demás devs nunca corren este script, aunque el PR ya esté aprobado, mergeado y tageado — avisan a quien sí lo hace.
- No hay script de rollback propio — se revierte desde el historial de deploys en el dashboard de Cloudflare Pages.

## Deploy a dev
- `scripts/deploy-dev-frontend.sh` — este sí lo puede correr cualquiera del equipo, no requiere tag (usa el commit de `develop` directo). Pedir confirmación antes de usarlo si hay trabajo de otra persona a medias en dev.
