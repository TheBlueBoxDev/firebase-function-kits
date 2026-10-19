---
name: firebase-resize-images-migration
description: Migrate a project from the deprecated firebase/storage-resize-images extension to the self-managed @thebluebox/resize-images Function Kit. Use when inventorying an installed Resize Images extension, installing its npm kit locally, exporting configuration, validating the wrapper, or planning a safe per-environment cutover.
---

# Firebase Resize Images migration

Apply the repository's
[migration guide](https://github.com/TheBlueBoxDev/firebase-function-kits/blob/main/docs/migrations/resize-images.md)
one Firebase project and environment at a time. The rules below are
self-contained so the skill still works when its directory is installed alone.

## Establish scope first

- Read repository instructions and inspect the current branch and worktree.
- Identify the Firebase root, project ID, account, extension instance, and kit
  instance.
- State which environments are in scope. Do not include production because a
  test or development project was authorized.
- Preserve any user restriction on push, deploy, live tests, or extension
  removal throughout the task.

## Use the package reproducibly

- Use `@thebluebox/resize-images` with the exact version approved for the
  migration. Do not silently resolve `latest`, `next`, or a caret range.
- Install with `functions:kits:install --template installation
  --no-configure`. Do not use the `migration` template because the package owns
  `setGlobalOptions()`.
- Require the published package's `npm-shrinkwrap.json`. Stop if Firebase CLI
  reports it missing; do not bypass the check with `--force`.
- Set the generated wrapper to Node.js 22 and the exact dependency version.
  This matches the official Resize Images `0.3.6` runtime and the package's
  tested baseline; it is not a default for other kits.
- Before preparing a stable release, check the official runtime support
  schedule and test a supported successor before the current runtime is
  decommissioned.
- Keep `src/index.ts` as a simple package re-export. Remove a generated duplicate
  `setGlobalOptions()` call.
- Keep the shared package's optional features intact even when the current
  project disables them.
- Content filtering is optional. With `CONTENT_FILTER_LEVEL=OFF` and an empty
  `CUSTOM_FILTER_PROMPT`, Genkit/Vertex AI are not loaded. If filtering is
  enabled, install compatible `genkit` and `@genkit-ai/vertexai` peer
  dependencies in the wrapper before deploying.
- After installing dependencies, run `npm audit --omit=dev`, record each
  advisory, dependency path, applicability/reachability, and available
  compatible fix. Do not run `npm audit fix` in the consuming wrapper; fixes
  belong in a reviewed Function Kit release.

## Preserve installed behavior

- Inventory the installed extension before editing configuration.
- Export configuration with `ext:export --mode functions` and compare every
  generated parameter with the installed instance.
- Treat separate Firebase projects as separate migrations and config files.
- Inspect generated env files for secrets before adding them to Git. The current
  kit declares no secret parameters, but still perform the inspection.
- Preserve the migration baseline of `cpu: "gcf_gen1"` and `concurrency: 1`
  unless the user explicitly requests performance tuning after validation.
- Interpret `CONTENT_FILTER_LEVEL=OFF` as no Vertex AI filtering at runtime;
  do not remove the capability from the package.

## Validate without affecting cloud resources

- Run `npm ci` and the wrapper build.
- Start the Functions Emulator only to verify function discovery and trigger
  metadata unless an isolated Storage emulator test is configured.
- Verify the expected bucket, region, memory, paths, sizes, output policy, and
  content-filter setting.
- Ensure Git ignores generated `node_modules/` and `lib/` directories and that
  the worktree contains no credentials or unrelated changes.
- Run Firebase commands as `env -u DEBUG firebase ...`; debug output can expose
  inherited credential-bearing environment variables.
- After deployment, inspect the Eventarc trigger identity and target Cloud Run
  service IAM policy. An active function in `functions:list` does not prove
  event delivery; verify an authorized matching upload, resulting variants,
  `resizedImage=true`, and Eventarc/Cloud Run logs for 401/403 or
  `run.routes.invoke` failures.
- Do not assume Firebase CLI always creates `roles/run.invoker`; behavior
  depends on CLI version, runtime, and trigger configuration. If logs confirm
  the missing permission, grant the role to the trigger service account on
  only the kit's Cloud Run service, never project-wide.

## Protect the cutover

- Never push, deploy, uninstall the extension, modify live resources, or test
  against a live bucket without explicit authorization for that action and
  Firebase project.
- Do not run the extension and kit simultaneously under normal uploads. Both
  consume Storage finalization events and can duplicate processing.
- Prepare a cutover and rollback plan before requesting deployment approval.
- Remove the extension only after representative live output from the new
  function has been accepted.
- To uninstall a remote extension instance, run `ext:uninstall` with
  `--immediate`; do not treat deleting a local manifest entry as remote
  uninstallation:

  ```bash
  env -u DEBUG firebase ext:uninstall <instance> \
    --immediate \
    --project <project> \
    --account <account>
  ```

Finish by reporting changed files, exact package version, local validation,
remaining cutover steps, and any behavior that could not be tested locally.
