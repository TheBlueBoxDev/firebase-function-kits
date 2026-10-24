# Install Resize Images in a Firebase project without the extension

Use this guide to add `@thebluebox/resize-images` directly to a Firebase
project that has no installed Resize Images extension. The application owns
the generated wrapper, lockfile, and configuration; this repository owns the
shared npm package. There is no need to install the extension first or run
`ext:export`.

If an extension or another image processor already handles the intended
bucket and paths, resolve that ownership before deployment. For an existing
`firebase/storage-resize-images` instance, use the
[migration guide](../migrations/resize-images.md).

## 1. Identify the target and prerequisites

Record the consuming repository, Firebase root, project ID, authenticated
account, environment, desired kit instance ID, and exact package version.
The examples use the repository's `1.0.0-rc.6` release candidate, not a
promise that it is the newest published version. Verify that the selected
version is published before installing; keep it pinned without `^` or tags.

- The Firebase project must exist and have billing enabled (Blaze). See
  [Firebase's Storage trigger prerequisites](https://firebase.google.com/docs/storage/extend-with-functions).
- Provision Cloud Storage if it is not initialized yet. Read the actual bucket
  name and location from the Firebase or Cloud console; do not infer an
  `.appspot.com` or `.firebasestorage.app` name from the project ID. `IMG_BUCKET`
  takes the bare bucket name, without `gs://`.
- Choose `FUNCTION_DEFAULT_REGION` compatible with the bucket location using
  the [Firebase location guidance](https://firebase.google.com/docs/functions/locations).
  Do not blindly use the package's `us-central1` default.
- Use Node.js 22.23.4 or a newer 22.x locally, matching the package baseline.
  Keep the wrapper engine at `"22"`. Follow the package's
  [runtime security checks](../../packages/resize-images/README.md#nodejs-security-updates)
  before rollout, and recheck managed runtime support for future releases.
- Use a Firebase CLI with Function Kits support. Check `firebase --version`
  and `env -u DEBUG firebase functions:kits:install --help`; the generated
  configuration described here was checked against CLI `15.34.0`.

Run Firebase commands with `DEBUG` unset to avoid credential-bearing debug
output. For read-only target checks:

```bash
env -u DEBUG firebase projects:list --account <firebase-account>
env -u DEBUG firebase ext:list \
  --project <firebase-project-id> --account <firebase-account>
env -u DEBUG firebase functions:list \
  --project <firebase-project-id> --account <firebase-account>
```

If the consuming repository has no `firebase.json`, create an empty `{}` file
at its intended Firebase root. Preserve existing Firebase configuration if
present. Installing this kit does not require scaffolding a separate default
Functions codebase or Firestore.

## 2. Generate the local wrapper

From the consuming application's Firebase root:

```bash
env -u DEBUG firebase functions:kits:install \
  --template installation \
  --no-configure \
  --package @thebluebox/resize-images@1.0.0-rc.6 \
  --project <firebase-project-id> \
  --account <firebase-account>
```

Record the kit ID and instance ID selected in the CLI prompts. Inspect the
generated `firebase.json` rather than assuming their values. The CLI registers
a Functions entry with `kit`, `source`, and `instances`; the instance mapping
identifies the configuration directory. Preserve other Functions entries and
all unrelated Firebase settings.

Typical generated paths are:

```text
firebase.json
function-kits/resize-images/
├── source/
│   ├── src/index.ts
│   ├── package.json
│   └── package-lock.json
└── config-<kit-instance-id>/
    └── .env.<firebase-project-id>
```

Use the `installation` template: the package already calls
`setGlobalOptions()`. Keep the wrapper's `src/index.ts` as:

```ts
export * from "@thebluebox/resize-images";
```

Remove any generated duplicate `setGlobalOptions()` call. In the generated
wrapper's `package.json`, preserve its build scripts and other dependencies,
but set `engines.node` to `"22"` and the `@thebluebox/resize-images` dependency
to exactly `"1.0.0-rc.6"`. Require the published `npm-shrinkwrap.json`; if the
CLI reports it missing, verify the package release instead of using `--force`.

## 3. Configure the instance from scratch

Because installation used `--no-configure`, create `.env.<firebase-project-id>`
inside the instance's configuration directory from `firebase.json`. Use a
separate file for each project. Do not copy a customer's config into the shared
package or use a global `.env` that accidentally applies to other environments.

The following is an example, not a mandatory application layout. Replace the
bucket, region, include paths, and sizes with the application's requirements
before running discovery or deployment:

```dotenv
IMG_BUCKET=<actual-bucket-name>
FUNCTION_DEFAULT_REGION=<compatible-function-region>
IMG_SIZES=200x200,800x800
DELETE_ORIGINAL_FILE=false
MAKE_PUBLIC=false
RESIZED_IMAGES_PATH=thumbs
INCLUDE_PATH_LIST=/images
EXCLUDE_PATH_LIST=
FAILED_IMAGES_PATH=
CACHE_CONTROL_HEADER=
IMAGE_TYPE=false
OUTPUT_OPTIONS=
SHARP_OPTIONS={"fit":"inside"}
IS_ANIMATED=true
FUNCTION_MEMORY=1024
REGENERATE_TOKEN=true
CONTENT_FILTER_LEVEL=OFF
CUSTOM_FILTER_PROMPT=
PLACEHOLDER_IMAGE_PATH=
```

For this example, `images/photo.jpg` produces
`images/thumbs/photo_200x200.jpg` and `images/thumbs/photo_800x800.jpg`.
With `fit: inside`, sizes are bounding boxes; aspect ratio is preserved and
both dimensions need not equal the requested values. Destination paths are
relative to the original object's directory. Generated objects have
`resizedImage=true` metadata and are skipped on subsequent finalization events.

Include/exclude values are comma-separated absolute path patterns such as
`/users/avatars,/products`. Empty includes allow every supported image in the
bucket. Confirm the app's upload paths and `image/*` content types match the
configuration. Decide how the application will find and read variants; the kit
does not update application records or client code. `MAKE_PUBLIC=false` does
not itself configure client access: retain the application's intended Storage
rules and download-token policy.

Review original deletion, public access, download tokens, formats, cache
headers, and animation with the application's requirements. The example keeps
originals and does not make generated objects public. For the complete
parameter list, see the [package reference](../../packages/resize-images/README.md#parameters).

With filtering `OFF` and an empty custom prompt, Genkit/Vertex AI are not
loaded. If either filter setting is enabled, install compatible exact versions
of both optional peers in the wrapper before building and deploying; rc.6 uses:

```bash
npm install --save-exact genkit@1.42.0 @genkit-ai/vertexai@1.42.0
```

## 4. Validate locally

Inside the generated `source/` directory:

```bash
npm install --package-lock-only
npm ci
npm run build
npm audit --omit=dev
```

Record audit findings and applicability. Do not use `npm audit fix` to rewrite
the consuming wrapper's dependency graph; resolve package changes through a
reviewed kit release. Ignore generated `node_modules/` and `lib/`. Inspect env
files for secrets before committing (the kit currently declares none).

Review the Firebase configuration diff, exact dependency version, lockfile,
wrapper re-export, and all parameters. Keep the package's `cpu: "gcf_gen1"`
and `concurrency: 1` baseline unless performance tuning is in scope.

Use Functions Emulator discovery to check the second-generation Storage
trigger, bucket, region, and memory. Only perform end-to-end local uploads
when an isolated Storage emulator is configured; emulator discovery alone does
not establish successful resizing or cloud event delivery. Do not point local
tests at a live bucket. Existing bucket images are not automatically backfilled;
the package's backfill feature is disabled.

## 5. Deploy and verify delivery

Deploy only when the task authorizes deployment to this specific project.
From the Firebase root, target the instance ID recorded in `firebase.json`:

```bash
env -u DEBUG firebase deploy \
  --only functions:<kit-instance-id> \
  --project <firebase-project-id> \
  --account <firebase-account>
```

Inspect the deploy plan for unrelated resources before accepting it. The
package declares Storage/API and service-account requirements; see the
[IAM and API reference](../../packages/resize-images/README.md#iam-and-apis).
Verify the actual Eventarc trigger identity and target Cloud Run service
policy after deployment. A successful deploy or active function listing does
not prove event delivery.

When live testing is in scope, upload a uniquely named disposable image to an
included path with its correct content type. Verify expected variant names,
dimensions, formats, `resizedImage=true`, original retention, and application
access. Inspect Eventarc and Cloud Run logs for delivery failures, 401/403, or
`run.routes.invoke` errors. If logs and policy confirm a missing invoker
binding, use the package reference's service-level fix for the actual trigger
identity, rather than granting project-wide invocation.

There is no extension cutover or extension rollback in a fresh installation.
If validation fails, keep application adoption pending, diagnose the function
and IAM, and redeploy the corrected configuration within the authorized scope.
If the processor must be stopped, agree on disabling/removing this specific
instance and how uploads during the gap will be handled; editing local files
alone does not stop its deployed trigger. Do not delete a shared bucket or
unrelated functions. Remove disposable test objects only within the authorized
cleanup scope.

Finish with the project/account, exact package and CLI versions, kit/instance
IDs, changed files, configuration decisions, local checks, deployed function
and trigger identities if applicable, live-test results, and pending work.
