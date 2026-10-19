# Migrating Firebase Resize Images to the self-managed kit

This guide moves one Firebase project and environment at a time from the
deprecated `firebase/storage-resize-images` extension to
`@thebluebox/resize-images`. The package is shared; each consuming repository
owns its Firebase wrapper, lockfile, and project-specific configuration.

This runbook is specific to Resize Images. Other extension migrations in this
monorepo have their own guides and skills so their triggers, parameters, IAM,
and cutover requirements can be handled independently.

The examples use `1.0.0-rc.5`. Pin the exact approved version during a
migration. Do not use `latest` or a range such as `^1.0.0-rc.5`.

## Repository model

```text
firebase-function-kits
└── packages/resize-images       shared source published to npm

application-backend
├── firebase.json                registers the generated function codebase
└── function-kits/resize-images
    ├── source/                  thin wrapper and its package-lock.json
    └── config-<instance>/       configuration for one kit instance
        └── .env.<project-id>
```

One package release can serve many applications and environments. Keep
development, staging, and production configuration in their respective
application repositories. Never add customer or environment-specific behavior
to the shared package when it can be expressed through parameters.

## 1. Set the migration scope

Before changing files, record:

- the consuming repository and branch;
- the Firebase project ID and authenticated account;
- the installed extension instance ID;
- the desired function-kit instance ID;
- the exact npm package version;
- whether the current task permits only local changes or also push, deploy, and
  extension removal.

Treat every Firebase project as a separate migration. Authorization for a test
project does not include staging or production.

## 2. Inventory the current extension

From the Firebase root, inspect the active project and extension before
generating files:

```bash
env -u DEBUG firebase use
env -u DEBUG firebase ext:list \
  --project <firebase-project-id> \
  --account <firebase-account>
```

Save the current extension version, bucket, region, image sizes, include and
exclude paths, destination path, public-access behavior, original-file policy,
animation support, output and Sharp options, memory, token regeneration, and
content-filter settings. Also inspect the deployed function's runtime settings
when they are relevant to cost or behavior.

Unset `DEBUG` for Firebase commands. Debug output can expose inherited
credential-bearing environment variables.

## 3. Install the package locally

Run from the consuming repository's Firebase root:

```bash
env -u DEBUG firebase functions:kits:install \
  --template installation \
  --no-configure \
  --package @thebluebox/resize-images@1.0.0-rc.5 \
  --project <firebase-project-id> \
  --account <firebase-account>
```

Use the `installation` template. The package already calls
`setGlobalOptions()`; the `migration` template would generate a second call.

The package contains `npm-shrinkwrap.json`. If Firebase CLI reports that the
published package has no shrinkwrap file, stop and verify the requested version
and registry metadata. Do not bypass that check with `--force`.

## 4. Correct the generated wrapper

Firebase CLI can generate the wrapper with its newest runtime and a caret
dependency. Change the wrapper's `package.json` to Node.js 22 and the exact
package version:

```json
{
  "engines": {
    "node": "22"
  },
  "dependencies": {
    "@thebluebox/resize-images": "1.0.0-rc.5"
  }
}
```

Node.js 22 is not a monorepo-wide default. Resize Images uses it because the
official `firebase/storage-resize-images@0.3.6` resource declares
`runtime: nodejs22`, and `@thebluebox/resize-images@1.0.0-rc.5` is packaged and
validated on that runtime. This keeps the first migration aligned with the
source extension. Recheck the
[Cloud Run functions runtime schedule](https://cloud.google.com/functions/docs/runtime-support)
before each stable package release and plan a separately tested runtime upgrade
before Node.js 22 is decommissioned.

Its `src/index.ts` should only re-export the package:

```ts
export * from "@thebluebox/resize-images";
```

Refresh the wrapper lockfile without changing the requested package version:

```bash
cd function-kits/resize-images/source
npm install --package-lock-only
npm ci
npm run build
```

Commit the wrapper's `package-lock.json`. Ignore generated `node_modules/` and
`lib/` directories.

## 5. Export the installed configuration

Copy the active extension parameters into the local kit instance:

```bash
env -u DEBUG firebase ext:export \
  --mode functions \
  --instance <extension-instance-id> \
  --kit-instance <kit-instance-id> \
  --project <firebase-project-id> \
  --account <firebase-account>
```

Review the generated `.env.<project-id>` value by value against the inventory.
Check JSON values and comma-separated path lists carefully. Inspect every env
file for secrets before committing it. This kit currently declares no secret
parameters, but the review remains required.

`CONTENT_FILTER_LEVEL=OFF` disables Vertex AI analysis at runtime. Keep the
content-filter implementation in the shared package because other projects can
enable it.

With `CONTENT_FILTER_LEVEL=OFF` and an empty `CUSTOM_FILTER_PROMPT`, the
function skips loading Genkit/Vertex AI. If either content-filter setting is
enabled, install the optional peer dependencies in the wrapper with compatible
versions, for example:

```bash
npm install --save-exact genkit@1.42.0 @genkit-ai/vertexai@1.42.0
```

Run `npm audit --omit=dev` in the wrapper after installation. Record each
finding, the affected dependency path, whether vulnerable code is reachable
with this configuration, and the compatible fix status. Do not run `npm audit
fix` in the consuming wrapper; dependency changes must be reviewed, tested,
and published with the Function Kit package.

## 6. Validate locally

Confirm that:

- `firebase.json` contains only the intended new functions codebase;
- the wrapper uses Node.js 22 and the exact approved package version;
- there is one `setGlobalOptions()` call, owned by the package;
- the build succeeds from a clean `npm ci` installation;
- Firebase Functions Emulator discovers a second-generation Storage trigger
  for the expected bucket and region;
- memory, `cpu: "gcf_gen1"`, and `concurrency: 1` match the migration baseline;
- the exported sizes, paths, output behavior, and content-filter setting match
  the installed extension;
- `git status` contains no `node_modules/`, compiled `lib/`, credentials, or
  unrelated files.

Run emulator commands with `DEBUG` unset. Discovering the function validates
loading and trigger metadata; it does not prove end-to-end image processing.
Do not point local tests at a live bucket.

After an authorized deployment, verify that the Eventarc trigger is active and
inspect its service account and the target Cloud Run service's IAM policy.
Firebase CLI behavior for creating the trigger and related IAM bindings can
vary with CLI version, runtime, and trigger configuration; do not assume that
the `roles/eventarc.eventReceiver` declaration necessarily supplies
`roles/run.invoker` to the identity Eventarc uses. Trigger status alone does
not prove delivery. For an approved live test, upload a unique matching image,
confirm the output variants and `resizedImage=true`, and check Eventarc and
Cloud Run logs for delivery errors, HTTP 401/403 responses, or missing
`run.routes.invoke`.

If and only if the logs and service policy confirm the missing permission,
grant `roles/run.invoker` to the trigger service account on this kit's specific
Cloud Run service. Do not grant it project-wide. See the package README for
commands to inspect and update this service-level binding.

The Firebase CLI source includes an IAM path that grants project-level
`roles/run.invoker` and `roles/eventarc.eventReceiver` to the default Compute
Engine service account
([`checkIam.ts`](https://github.com/firebase/firebase-tools/blob/1d5f141720cb6e7e453a6cdca9d7dcc56faa4cbc/src/deploy/functions/checkIam.ts)).
This does not guarantee that every Function Kit deployment binds the actual
trigger identity on the target Cloud Run service. Verify the effective
identity and policy for the CLI version and deployment path in use. Google
documents the separate
[Eventarc and Cloud Run IAM requirements](https://cloud.google.com/eventarc/docs/roles-permissions).

## 7. Plan the cutover

Push, deployment, live tests, and extension removal are separate authorized
steps. Do not infer permission for one from another.

For a controlled cutover:

1. Pause or control uploads that match the image paths.
2. Deploy the self-managed function.
3. Validate representative images, metadata, paths, permissions, logs, and
   error behavior.
4. Remove the old extension only after the new function is accepted.
5. Resume normal uploads and monitor failures, duration, and cost.

To remove the remote extension instance, run this from the Firebase project
root. `--immediate` requests remote uninstallation; it does not rely on the
instance being registered in the local `firebase.json` manifest:

```bash
env -u DEBUG firebase ext:uninstall <extension-instance-id> \
  --immediate \
  --project <firebase-project-id> \
  --account <firebase-account>
```

Avoid leaving both processors active for normal traffic: the old extension and
the new function listen to the same Storage finalization events and can perform
duplicate work. Keep the old extension available until the cutover window so
rollback remains possible, but control uploads while switching processors.

## Rollback

Before removing the extension, rollback consists of disabling or removing the
new function and resuming the old processor. After removing the extension, a
rollback requires redeploying a known-good self-managed package or reinstalling
the extension while Firebase still supports installation. Record the deployed
package version and keep its lockfile so the function can be reproduced.

## Per-project completion record

Record these items in the consuming project's pull request or migration issue:

- Firebase project and extension instance;
- old extension version and new exact npm version;
- configuration comparison result;
- local build and emulator result;
- planned cutover and rollback owners;
- deploy, live-validation, and removal status with dates.
