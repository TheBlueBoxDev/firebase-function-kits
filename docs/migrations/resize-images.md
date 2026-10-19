# Migrating Firebase Resize Images to the self-managed kit

This guide moves one Firebase project and environment at a time from the
deprecated `firebase/storage-resize-images` extension to
`@thebluebox/resize-images`. The package is shared; each consuming repository
owns its Firebase wrapper, lockfile, and project-specific configuration.

This runbook is specific to Resize Images. Other extension migrations in this
monorepo have their own guides and skills so their triggers, parameters, IAM,
and cutover requirements can be handled independently.

The examples use `1.0.0-rc.3`. Pin the exact approved version during a
migration. Do not use `latest` or a range such as `^1.0.0-rc.3`.

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
  --package @thebluebox/resize-images@1.0.0-rc.3 \
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
    "@thebluebox/resize-images": "1.0.0-rc.3"
  }
}
```

Node.js 22 is not a monorepo-wide default. Resize Images uses it because the
official `firebase/storage-resize-images@0.3.6` resource declares
`runtime: nodejs22`, and `@thebluebox/resize-images@1.0.0-rc.3` was packaged and
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
