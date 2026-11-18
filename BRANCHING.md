# Protección de ramas — pendiente de activar

GitHub **no aplica** branch protection en repos privados del plan Free (se puede configurar la regla, pero no se hace cumplir). Para que sea real hace falta **GitHub Team** ($4/usuario/mes). Esto está pendiente de decisión — mientras tanto, el gate real es la disciplina del equipo: PR + revisión de @ABISUKI + CI en verde.

El día que se confirme GitHub Team, activar esto en **Settings → Branches** de este repo, una regla para `develop` y otra para `main`:

1. **Add branch protection rule** → branch name pattern: `develop` (repetir para `main`).
2. ✅ **Require a pull request before merging**
   - Required approvals: **1**
   - ✅ Require review from Code Owners (usa `.github/CODEOWNERS`)
3. ✅ **Require status checks to pass before merging**
   - Seleccionar el check `test` (el job de `.github/workflows/ci.yml`)
4. ✅ **Do not allow bypassing the above settings** (incluye a admins — si no, la regla es decorativa)
5. Opcional, para que el merge a `main` quede tan acotado como el deploy: **Restrict who can push to matching branches** → solo @ABISUKI (y Fernando si aplica), solo en la regla de `main`.

También pendiente, aparte de esto: el token de `gh` (CLI) usado en las sesiones de Claude no tiene scope para crear PRs ni configurar branch protection por API (`public_repo`/`repo`). Si se quiere que Claude abra PRs en vez de pushear directo a `main`, hay que ampliar el scope en github.com/settings/tokens (o re-generar vía `gh auth login` con el scope `repo`).
