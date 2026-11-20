# Protección de ramas

⚠️ **Este repo es PÚBLICO** (a diferencia de core-back/lands-back/properties-back/bot, que son privados) — confirmado con `curl` sin login a la API de GitHub. Un repo privado da 404 ahí; este respondió con los datos. **Si no es intencional, revísalo en Settings → General → Danger Zone → Change visibility antes de seguir** — el código del front (rutas, lógica de negocio, comentarios internos) queda visible a cualquiera en internet. No lo cambié yo: es una decisión de seguridad que te toca a ti, no algo que yo deba asumir.

Dando por hecho que sea intencional: GitHub **sí aplica** branch protection gratis en repos **públicos** en cualquier plan — a diferencia de los otros 4 repos (privados), acá **no hace falta esperar la decisión de GitHub Team para activar esto de verdad, ahora mismo**.

Activar en **Settings → Branches** de este repo, una regla para `develop` y otra para `main`:

1. **Add branch protection rule** → branch name pattern: `develop` (repetir para `main`).
2. ✅ **Require a pull request before merging**
   - Required approvals: **1**
   - ✅ Require review from Code Owners (usa `.github/CODEOWNERS`)
3. ✅ **Require status checks to pass before merging**
   - Seleccionar el check `test` (el job de `.github/workflows/ci.yml`)
4. ✅ **Do not allow bypassing the above settings** (incluye a admins — si no, la regla es decorativa)
5. Opcional, para que el merge a `main` quede tan acotado como el deploy: **Restrict who can push to matching branches** → solo @ABISUKI (y Fernando si aplica), solo en la regla de `main`.

También pendiente, aparte de esto: el token de `gh` (CLI) usado en las sesiones de Claude no tiene scope para crear PRs ni configurar branch protection por API (`public_repo`/`repo`). Si se quiere que Claude abra PRs en vez de pushear directo a `main`, hay que ampliar el scope en github.com/settings/tokens (o re-generar vía `gh auth login` con el scope `repo`).
