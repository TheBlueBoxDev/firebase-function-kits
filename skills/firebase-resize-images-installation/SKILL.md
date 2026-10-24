---
name: firebase-resize-images-installation
description: Install and configure @thebluebox/resize-images in a Firebase project without an existing Resize Images extension. Use for first-time setup, project-specific configuration, wrapper validation, and authorized deployment of the self-managed Function Kit.
---

# Firebase Resize Images installation

Use the [installation guide](https://github.com/TheBlueBoxDev/firebase-function-kits/blob/main/docs/installations/resize-images.md)
for a new installation. These essential instructions also work when this skill
directory is installed alone.

## Select the workflow and target

- Read repository instructions and inspect the worktree. Identify the Firebase
  root, project ID, authenticated account, environment, bucket/location, kit
  instance ID, and exact package version. Preserve the task's existing scope
  and authorization for local changes, push, deploy, and live tests.
- Confirm that no extension or other processor owns the intended bucket/paths.
  If Resize Images is already installed, use the repository's migration guide
  and migration skill instead. Do not install an extension just to export it.
- The project needs Blaze billing and a provisioned Storage bucket. Read its
  actual name (without `gs://`) and choose a compatible function region; do
  not derive the bucket suffix or assume `us-central1` fits its location.
- Check the selected Firebase CLI supports `functions:kits:install`. Run
  Firebase commands as `env -u DEBUG firebase ...`, with explicit `--project`
  and `--account` for project operations.

## Prepare local installation

- Preserve existing `firebase.json`; create `{}` at the intended Firebase
  root only when absent. No separate default Functions codebase is required.
- Run `functions:kits:install --template installation --no-configure --package
  @thebluebox/resize-images@<exact-version> --project <project> --account
  <account>`. The guide's rc.6 example is not an instruction to resolve latest.
- Require the published `npm-shrinkwrap.json`; investigate a missing file
  rather than bypassing the CLI check with `--force`.
- Record generated kit/instance IDs and use `firebase.json`'s `source` and
  `instances` mapping as the authoritative paths. Preserve other codebases.
- Set wrapper `engines.node` to `"22"` and pin the exact kit dependency without
  a caret. Use local Node.js 22.23.4 or newer 22.x and recheck runtime support
  before future rollouts. The wrapper `src/index.ts` should only re-export
  `@thebluebox/resize-images`; the package owns `setGlobalOptions()`.
- Create `.env.<project-id>` in the generated instance config directory.
  Do not run `ext:export`: there is no installed configuration to preserve.

## Configure and validate

- Obtain the intended sizes, upload/include/exclude paths, relative destination,
  formats, deletion, access/token, animation, cache, memory, and filter policy.
  Use the package README's parameter definitions or `src/config.ts` rather
  than inventing parameter names. Set `IMG_BUCKET` and
  `FUNCTION_DEFAULT_REGION` explicitly for the target.
- Keep originals and avoid public objects as initial examples unless the app
  needs otherwise. Explain application-specific choices before rollout.
- Path lists are absolute patterns; destinations are relative to each source
  directory. Confirm upload content types and how clients locate/read output.
  Bounding-box resizing can preserve aspect ratio rather than force dimensions.
- With `CONTENT_FILTER_LEVEL=OFF` and an empty `CUSTOM_FILTER_PROMPT`, optional
  Genkit/Vertex AI peers are unnecessary. If either filter is enabled, install
  compatible exact versions of both peers and audit that dependency graph.
- Refresh the wrapper lockfile, run `npm ci`, build, and `npm audit --omit=dev`.
  Record relevant findings; do not apply `npm audit fix` in the wrapper.
- Verify emulator discovery's bucket, region, memory, and 2nd gen trigger.
  Keep package CPU/concurrency defaults unless tuning is requested. Use isolated
  Storage emulation for local uploads; discovery is not an end-to-end test.
- Ignore generated dependencies/build output and review env files for secrets.
  Backfill is disabled: existing objects are not automatically processed.

## Deploy within the authorized scope

- A request to write a guide or prepare local files does not authorize cloud
  changes. Reuse authorization already given for the target and action.
- For an authorized deployment, target `--only functions:<kit-instance-id>`.
  Verify the actual Eventarc trigger identity and Cloud Run IAM policy.
- When live testing is authorized, verify a disposable matching upload, variant
  names/dimensions/formats, `resizedImage=true`, original policy, and client
  access. Inspect delivery logs; an active function is not sufficient.
- If logs/policy confirm missing `roles/run.invoker`, bind it only on this
  service to the actual trigger service account using the package IAM guide.
- There is no extension to deactivate, export, uninstall, or restore. If
  validation fails, diagnose and correct within scope; stopping the processor
  requires changing its deployed resources, not only local configuration.

Report changed files, pinned version, configuration decisions, local checks,
deployment/live-test status, and pending work without claiming unrun checks.
