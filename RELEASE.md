# Flujo de release — front

## Ramas
- `develop`: trabajo diario. Cualquiera abre PR hacia acá.
- `main`: lo que está (o va a estar) en producción. Solo se llega por merge de `develop`, y ese merge lo hace **@ABISUKI**.

## Pull requests
- Todo PR usa la plantilla (`.github/pull_request_template.md`) y corre CI (`.github/workflows/ci.yml`: lint + tests + build) antes de poder mergearse.
- La revisión/aprobación final es de **@ABISUKI** (ver `.github/CODEOWNERS`).

## Versionado y tags
- Prefijo de este repo: **sin prefijo**, solo `vMAJOR.MINOR.PATCH`.
  - **patch**: fix sin cambio de comportamiento externo.
  - **minor**: feature nueva, compatible hacia atrás.
  - **major**: cambio grande de UX/flujo que amerita avisar al equipo antes de desplegar.
- El tag se crea **sobre el commit de `main`** recién mergeado:
  ```
  git checkout main && git pull
  git tag -a vX.Y.Z -m "Resumen del release"
  git push origin main --tags
  ```

## Deploy a producción
- Script: `scripts/deploy-prod-frontend.sh` (exige estar en `main`, árbol limpio y un tag exacto en el commit actual — si falta, el script se niega a correr).
- **Quién lo ejecuta: solo @ABISUKI o Fernando.** Los demás devs nunca corren este script, aunque el PR ya esté aprobado, mergeado y tageado — avisan a quien sí lo hace.
- No hay script de rollback propio — se revierte desde el historial de deploys en el dashboard de Cloudflare Pages.

## Deploy a dev
- `scripts/deploy-dev-frontend.sh` — este sí lo puede correr cualquiera del equipo, no requiere tag (usa el commit de `develop` directo). Pedir confirmación antes de usarlo si hay trabajo de otra persona a medias en dev.
