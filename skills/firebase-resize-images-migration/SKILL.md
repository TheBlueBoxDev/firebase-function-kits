---
name: firebase-resize-images-migration
description: Migrate a project from the deprecated firebase/storage-resize-images extension to the self-managed @thebluebox/resize-images Function Kit. Use when inventorying an installed Resize Images extension, installing its npm kit locally, exporting configuration, validating the wrapper, or planning a safe per-environment cutover.
---

# Firebase Resize Images migration

If the target has no installed Resize Images extension, use the
`firebase-resize-images-installation` skill or the repository's
[fresh installation guide](https://github.com/TheBlueBoxDev/firebase-function-kits/blob/main/docs/installations/resize-images.md)
instead. Configuration export and extension cutover do not apply in that case.

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

## Use a controlled same-path cutover

This migration preserves the existing bucket and image paths. The extension
and the kit use independent Storage finalization triggers, and updating their
configurations is not atomic. Deploying the kit first creates an overlap in
which both processors can resize the same upload; disabling the extension
first creates a gap in which neither processor handles new uploads. Prevent
both cases by pausing matching writes during the ownership change.

- Never push, deploy, reconfigure or uninstall the extension, modify live
  resources, pause uploads, resume uploads, or test against a live bucket
  without authorization for that individual action and Firebase
  project.
- Do not introduce a canary prefix, alternate bucket, blue-green route, or
  application path change as part of this workflow. The replacement must keep
  the installed extension's bucket and path behavior.
- Before starting the cutover, obtain confirmation that all writes
  matching the extension's effective include/exclude paths are paused. Treat
  that confirmation as sufficient and keep writes paused until validation
  completes.
- Save the extension's complete exported configuration and verify a rollback
  command or procedure before changing any live resource.
- Choose an absolute, reserved `INCLUDE_PATH_LIST` value that no writer can
  use. This inactive path is used to keep a processor deployed for rollback
  while preventing it from handling normal uploads. Record the original path
  configuration separately; never overwrite the only copy.
- Define the representative test objects, expected output names, dimensions,
  formats, metadata, deletion behavior, and logs, before the
  pause begins.

Perform an authorized cutover in this order:

1. Obtain confirmation that all writes matching the configured image
   paths are paused.
2. Wait for previously accepted uploads to finish processing. Compare
   expected objects with extension results and inspect logs for unfinished
   work or retries. Keep writes paused if the drain cannot be established.
3. Reconfigure the extension's `INCLUDE_PATH_LIST` to the reserved inactive
   path. Preserve every other parameter, wait for the update to complete, and
   verify the deployed extension configuration before continuing.
4. Deploy the kit with the final exported bucket, includes, excludes, sizes,
   output policy, and other approved parameters. Do not deploy temporary
   canary paths.
5. Verify the Eventarc trigger identity, Cloud Run IAM policy, and delivery
   logs. An active function listing alone is not acceptance.
6. With normal writers still paused and separate authorization for the live
   test, upload representative disposable images to the real paths. Confirm
   that only the kit processes them and that every predefined result matches.
7. If the test passes, resume the paused writers only after approval.

If validation fails, keep writes paused and roll back in this order:

1. Reconfigure the kit to the reserved inactive include path and deploy that
   configuration so it cannot process normal uploads.
2. Restore the extension's complete saved configuration and wait for its
   update to finish.
3. Upload one authorized representative image, verify that only the extension
   processes it successfully, and inspect its logs.
4. Resume writers only after the extension has been accepted and
   approval has been given.

This cutover prevents overlap between the extension and kit for controlled new
uploads. It does not change Eventarc's at-least-once delivery semantics; retry
or duplicate delivery to one processor remains possible and must not be
misdiagnosed as cross-processor overlap.

Remove the extension only and representative live
output from the kit have been accepted. Treat removal as a separate authorized
action. To uninstall a remote extension instance, run `ext:uninstall` with
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
