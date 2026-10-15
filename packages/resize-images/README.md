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

- Cloud Functions 2nd gen on Node.js 22.
- `cpu: "gcf_gen1"` and `concurrency: 1` preserve first-generation CPU and
  single-request behavior during migration.
- The Storage trigger is bound to `IMG_BUCKET`.
- The function runs in `FUNCTION_DEFAULT_REGION`, which defaults to
  `us-central1`.
- No lifecycle hooks are declared because backfill lifecycle resources are
  disabled in the source extension.

## Installation

Run from the Firebase project root:

```bash
firebase functions:kits:install \
  --template migration \
  --no-configure \
  --package @thebluebox/resize-images@1.0.0-rc.1 \
  --project <firebase-project-id> \
  --account <firebase-account>
```

After installation, copy the active extension configuration into the kit
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

## IAM and APIs

The kit declares the following requirements in code so Firebase CLI can
provision its managed runtime service account:

- `roles/storage.admin`
- `roles/aiplatform.user`
- `storage-component.googleapis.com`

When a custom Eventarc channel is configured, it also declares
`roles/eventarc.publisher` and `eventarcpublishing.googleapis.com`.

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
