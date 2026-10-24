# @thebluebox/resize-images

Self-managed Cloud Functions for Firebase replacement for the deprecated
`firebase/storage-resize-images` extension. This fork starts from Firebase's
`0.3.6` source, is maintained by TheBlueBoxDev, and keeps its Apache 2.0
license.

The kit listens for finalized objects in a configured Cloud Storage bucket and
creates resized images while preserving the extension's path filters, metadata,
format conversion, download-token, original-file, and optional content-filter
behavior.

## Runtime behavior

- Cloud Functions 2nd gen on Node.js 22 (minimum patched version: 22.23.4).
- `cpu: "gcf_gen1"` and `concurrency: 1` preserve first-generation CPU and
  single-request behavior during migration.
- The Storage trigger is bound to `IMG_BUCKET`.
- The function runs in `FUNCTION_DEFAULT_REGION`, which defaults to
  `us-central1`.
- No lifecycle hooks are declared because backfill lifecycle resources are
  disabled in the source extension.

## Installation

For a project **without** an installed Resize Images extension, follow the
[fresh installation guide](https://github.com/TheBlueBoxDev/firebase-function-kits/blob/main/docs/installations/resize-images.md).
It covers prerequisites, configuration from scratch, validation, and deployment.
The `ext:export` step below applies only when migrating an installed extension.

Run from the Firebase project root:

```bash
firebase functions:kits:install \
  --template installation \
  --no-configure \
  --package @thebluebox/resize-images@1.0.0-rc.6 \
  --project <firebase-project-id> \
  --account <firebase-account>
```

Use the `installation` template because this package already owns its global
runtime options. The `migration` template adds another `setGlobalOptions()`
call and must not be used with this kit.

The Firebase CLI currently scaffolds package-based kits with its newest Node.js
runtime and a caret dependency range. Before deployment, keep this kit on its
tested runtime and version by setting these fields in the generated wrapper's
`package.json`, then refresh its lockfile with `npm install --package-lock-only`:

```json
{
  "engines": {
    "node": "22"
  },
  "dependencies": {
    "@thebluebox/resize-images": "1.0.0-rc.6"
  }
}
```

When migrating an existing extension, copy its active configuration into the kit
instance:

```bash
firebase ext:export \
  --mode functions \
  --instance <extension-instance-id> \
  --kit-instance <kit-instance-id> \
  --project <firebase-project-id> \
  --account <firebase-account>
```

These commands only prepare the local function-kit configuration. Deploy and
extension removal are separate migration steps.

For local development of this repository, a consuming Firebase project can
instead install the package source with:

```bash
firebase functions:kits:install \
  --no-configure \
  --directory <path-to-this-repository>/packages/resize-images \
  --project <firebase-project-id> \
  --account <firebase-account>
```

## Node.js security updates

Use Node.js 22.23.4 or a newer 22.x release for local development, builds,
emulators, and the deployed function. This minimum incorporates the
[October 21, 2026 Node.js security fixes](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
The package declares `engines.node: "^22.23.4"`; npm normally warns on an
unsupported version. This repository enables `engine-strict=true` to reject
unsupported versions during installation. Consumers can enable the same npm
setting in their own repository.

Keep `"node": "22"` in the generated wrapper to select Firebase's managed
runtime family. That setting and this package's engine requirement do not pin
or update the Node.js patch version running in Google Cloud. Updating npm
dependencies also does not update Node.js itself.

Before rollout, inspect the deployed function's runtime update policy:

```bash
gcloud functions describe <function-name> \
  --gen2 --region <region> --project <project> \
  --format="yaml(buildConfig.runtime,buildConfig.automaticUpdatePolicy,buildConfig.onDeployUpdatePolicy)"
```

With `automaticUpdatePolicy`, Google rolls out runtime security updates after
validation; the policy alone does not prove this patch has reached a function.
With `onDeployUpdatePolicy`, redeploy after Google makes the patched runtime
image available. Verify the effective Node.js version is at least 22.23.4
(for example, log `process.version` temporarily in the consuming function and
check its runtime logs). Check the
[Google runtime security update policy](https://docs.cloud.google.com/functions/docs/securing/execution-environment-security)
for details. Updating this package alone does not establish that production is
patched.

## Parameters

| Parameter | Purpose | Default |
| --- | --- | --- |
| `IMG_BUCKET` | Bucket watched by the Storage trigger | Required |
| `IMG_SIZES` | Comma-separated `WIDTHxHEIGHT` sizes | `200x200` |
| `DELETE_ORIGINAL_FILE` | Original deletion policy | `false` |
| `MAKE_PUBLIC` | Make generated objects public | `false` |
| `RESIZED_IMAGES_PATH` | Relative destination directory | Empty |
| `INCLUDE_PATH_LIST` | Included absolute path patterns | Empty |
| `EXCLUDE_PATH_LIST` | Excluded absolute path patterns | Empty |
| `FAILED_IMAGES_PATH` | Destination for failed images | Empty |
| `CACHE_CONTROL_HEADER` | Cache-Control override | Empty |
| `IMAGE_TYPE` | Comma-separated output formats; `false` keeps original | `false` |
| `OUTPUT_OPTIONS` | Sharp output options as JSON | Empty |
| `SHARP_OPTIONS` | Sharp resize options as JSON | `{}` |
| `IS_ANIMATED` | Preserve GIF/WebP animation | `true` |
| `FUNCTION_MEMORY` | Function memory in MB | `1024` |
| `REGENERATE_TOKEN` | Generate a new Storage download token | `true` |
| `CONTENT_FILTER_LEVEL` | Vertex AI content-filter threshold | `OFF` |
| `CUSTOM_FILTER_PROMPT` | Additional yes/no filter prompt | Empty |
| `PLACEHOLDER_IMAGE_PATH` | Custom blocked-image placeholder | Empty |
| `FUNCTION_DEFAULT_REGION` | Cloud Functions region | `us-central1` |

The Firebase CLI stores instance configuration in project-specific `.env`
files. Do not commit secret values. This kit currently declares no secret
parameters.

### Optional content-filter dependencies

Content filtering is disabled by default. When `CONTENT_FILTER_LEVEL=OFF` and
`CUSTOM_FILTER_PROMPT` is empty, the function does not load Genkit or Vertex AI.
These are optional peer dependencies so projects that do not enable filtering
do not install their large dependency trees as production dependencies.

To enable either the Vertex AI threshold filter or a custom prompt, add
compatible versions of both dependencies to the generated wrapper:

```bash
npm install --save-exact genkit@1.42.0 @genkit-ai/vertexai@1.42.0
```

Then configure `CONTENT_FILTER_LEVEL` or `CUSTOM_FILTER_PROMPT` and deploy. The
filter-enabled dependency tree must be audited separately; known transitive
Genkit/OpenTelemetry advisories are not proof of exploitability in this usage.

### Dependency audit review

The rc.6 lockfiles update transitive `body-parser` to 2.4.0 through Firebase
Functions/Express and to 1.20.9 through the optional Genkit dependency tree.
These versions address [CVE-2026-111181](https://github.com/advisories/GHSA-27r3-jxmh-p828),
a denial of service involving malformed compressed request bodies. Existing
consumers must install the updated package and redeploy to use the corrected
dependencies. This dependency fix is separate from the Node.js runtime patches
[described above](#nodejs-security-updates).

On 2026-10-24, `npm audit --omit=dev` reported zero advisories for both the
updated repository lockfile and an isolated default consumer installation of
the rc.6 tarball. The consumer installed `body-parser@2.4.0`. This result does
not cover the optional Genkit/Vertex AI dependency graph.

As of 2026-10-19, `npm audit --omit=dev` reported no advisories in the default
production dependency graph. In a local consumer install, the previous
`1.0.0-rc.4` graph installed 640 packages and occupied 803 MB in
`node_modules`; the `1.0.0-rc.5` default graph installed 257 packages and
occupied 115 MB. These are host-local dependency-tree measurements. The
default package import was verified not to load Genkit/Vertex AI; local import
timings varied too much to present as a reliable cold-start estimate. Measure
Cloud Run cold starts after deployment in a representative project.

Installing the optional Genkit 1.42.0 and Vertex AI 1.42.0 peers for content
filtering produced 65 current advisories (7 high, 58 moderate, no critical) in
the isolated consumer audit. The high findings are in Genkit/OpenTelemetry
dependency paths, and npm reported no fix available for those high entries.
The migration's earlier `rc.4` wrapper audit reported 69 findings; exact counts
vary with the installed lockfile and npm advisory database. These findings do
not establish that vulnerable code is reachable in this filtering use case.
No incompatible override or `npm audit fix` was applied. Re-run the audit and
review reachability before enabling the optional feature.

## IAM and APIs

The kit declares the following requirements in code so Firebase CLI can
provision the managed runtime service account:

- `roles/storage.admin`
- `roles/aiplatform.user`
- `roles/eventarc.eventReceiver`
- `storage-component.googleapis.com`

When a custom Eventarc channel is configured, it also declares
`roles/eventarc.publisher` and `eventarcpublishing.googleapis.com`.

These declarations do not prove that the Eventarc trigger identity can invoke
the Cloud Run service. Firebase CLI/deploy behavior can depend on the CLI
version, runtime, and trigger configuration; after every deployment, inspect
the deployed trigger identity and the service's IAM policy rather than
assuming either that the binding is always created or that every project needs
a manual grant.

The Firebase CLI source has an IAM path that grants project-level
`roles/run.invoker` and `roles/eventarc.eventReceiver` to the default Compute
Engine service account
([`checkIam.ts`](https://github.com/firebase/firebase-tools/blob/1d5f141720cb6e7e453a6cdca9d7dcc56faa4cbc/src/deploy/functions/checkIam.ts)).
That is not a guarantee that every Function Kit deploy path grants
`roles/run.invoker` to the actual trigger identity on this specific Cloud Run
service. The kit therefore does not add a broad `requiresRole("roles/run.invoker")`
declaration.

`firebase functions:list` reporting an active function confirms control-plane
deployment, not successful event delivery. For an authorized live test, upload
a unique image that matches the configured filters and confirm the expected
resized objects and metadata (including `resizedImage=true`). Check the
Eventarc trigger and Cloud Run service logs in Cloud Logging for delivery
errors, HTTP 401/403 responses, and `run.routes.invoke` permission failures.
See Google's [Eventarc roles and permissions
guide](https://cloud.google.com/eventarc/docs/roles-permissions) for the
distinction between the trigger's event-receiver permission and the target
service's invoker permission. In Logs Explorer, inspect entries for both the
Eventarc trigger and the Cloud Run service; search for the trigger/service
name, `run.routes.invoke`, authentication failures, and HTTP 401/403 statuses.
For Cloud Run request logs, a focused query is:

```text
resource.type="cloud_run_revision"
resource.labels.service_name="<cloud-run-service>"
(httpRequest.status=401 OR httpRequest.status=403 OR textPayload:"run.routes.invoke")
```

Inspect the trigger identity and service policy with:

```bash
gcloud eventarc triggers list --location <region> --project <project>
gcloud eventarc triggers describe <trigger> \
  --location <region> --project <project> \
  --format="yaml(name,serviceAccount,conditions,transport)"
gcloud run services get-iam-policy <cloud-run-service> \
  --region <region> --project <project>
```

Only if the delivery logs and IAM policy confirm a missing Cloud Run invoke
grant, grant `roles/run.invoker` to the trigger's service account on this kit's
Cloud Run service only:

```bash
gcloud run services add-iam-policy-binding <cloud-run-service> \
  --region <region> --project <project> \
  --member="serviceAccount:<trigger-service-account>" \
  --role="roles/run.invoker"
```

Do not grant this role project-wide as a workaround.

## Differences from the extension

| Concern | Firebase Extension | Function kit |
| --- | --- | --- |
| Runtime | Cloud Functions 1st gen | Cloud Functions 2nd gen |
| Configuration | Extension installation form | Parameterized `.env` configuration |
| Function name | `ext-storage-resize-images-generateResizedImage` | `kit-<instance-id>-generateResizedImage` |
| IAM | Managed by Extensions | Declarative `requiresRole` calls |
| APIs | Managed by Extensions | Declarative `requiresAPI` calls |
| Ownership | Firebase Extensions service | Package maintainer and consuming project |

## Development

```bash
npm install
npm run build
npm test -- --runInBand
```

End-to-end and live content-filter tests require their corresponding emulators
or Google Cloud services and remain opt-in.
