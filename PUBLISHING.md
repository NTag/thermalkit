# Publishing thermalkit

The release workflow uses npm's **Trusted Publishing** (OIDC), so there's no `NPM_TOKEN` secret to manage. Setup is a one-time thing.

## One-time setup

### 1. First publish (manual, locally)

Trusted publishers can only be configured on an existing npm package, so the very first version has to be published manually:

```bash
cd thermalkit/
npm ci                # clean install from the lockfile
npm run typecheck     # optional but quick sanity check
npm run build         # produces dist/  ← REQUIRED, dist/ is gitignored
npm pack --dry-run    # optional: shows exactly what files will ship
npm login             # one-time
npm publish --access public
```

Notes:
- `package.json` has a `"prepublishOnly": "npm run build"` script that will *also* run the build at publish time if you forget — but running it explicitly first gives you a chance to fix errors before the actual publish.
- You'll be prompted for npm 2FA during `npm publish`.
- We drop `--provenance` for this first manual publish because local environments usually don't have an OIDC source. The CI workflow handles provenance on every release from then on.

### 2. Configure the Trusted Publisher on npmjs.com

1. Go to **https://www.npmjs.com/package/thermalkit/access** (sign in as the owner).
2. Scroll to **"Trusted Publishers"** → **"Add Publisher"**.
3. Choose **GitHub Actions** and fill in:
   - **Organization or username:** `NTag`
   - **Repository:** `thermalkit`
   - **Workflow filename:** `release.yml`
   - **Environment:** (leave blank)
4. Save.

From this moment forward, the workflow in `.github/workflows/release.yml` can publish without a token.

## Releasing a new version

Bump the version, push the tag, watch GitHub Actions:

```bash
# in thermalkit/ working dir, on a clean main branch
npm version patch         # 0.1.0 → 0.1.1 (or `minor` / `major`)
                          # bumps package.json AND creates a `v0.1.1` git tag

git push --follow-tags    # pushes the bump commit + the tag

# Now go to https://github.com/NTag/thermalkit/actions and watch
# the "Release" workflow run. Should finish in <2 min, publish to npm,
# and attach a provenance attestation visible on the package page.
```

## What the workflow does

1. Checks out the tag.
2. Installs Node 24 + latest npm (Trusted Publishing needs npm ≥ 11.5.1; Node 24 ships it but we upgrade defensively).
3. `npm ci` → install deps from lockfile.
4. `npm run typecheck` → strict TS check.
5. `npm run build` → rolldown bundles JS, tsc emits `.d.ts`.
6. Sanity-checks `package.json` version matches the git tag.
7. `npm publish --provenance --access public` — OIDC token is sourced automatically because the workflow has `permissions: id-token: write`.

## When something goes wrong

| Symptom | Probable cause |
|---|---|
| `404 You must be logged in to publish packages` on first publish | Run `npm login` and retry. |
| `403 Forbidden` from the workflow | Trusted Publisher not configured on npmjs.com yet, or workflow filename mismatch. |
| `version already published` | Forgot to `npm version` before tagging. |
| `EOTP One-time password required` locally | npm 2FA prompt — type your authenticator code. The workflow doesn't need 2FA (OIDC bypasses it). |
| `Provenance generation failed` | Either OIDC not set up yet, or running the workflow on a fork (forks can't issue OIDC tokens for the parent repo). |

## Useful commands

```bash
npm pack --dry-run                 # see exactly what files would ship
npm view thermalkit                # what's currently published
npm dist-tag ls thermalkit         # current dist-tags
npm deprecate thermalkit@0.1.0 "use 0.1.1"   # mark a version deprecated
```
