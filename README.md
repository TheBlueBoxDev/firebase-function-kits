# TheBlueBoxDev Firebase Function Kits

Self-managed Cloud Functions for Firebase packages maintained by
TheBlueBoxDev. These kits replace Firebase Extensions with standard 2nd gen
Cloud Functions that can be versioned, installed, and deployed independently.

## Packages

| Package | Replaces | Status |
| --- | --- | --- |
| [`@thebluebox/resize-images`](./packages/resize-images) | `firebase/storage-resize-images` | Release candidate |

Each package has its own README, changelog, tests, version, and npm release.
Firebase project configuration belongs in the consuming application's
repository and is not stored in this monorepo.

## Migration resources

Migration material follows the same package-specific structure as the
monorepo. See the [migration conventions](./docs/migrations/) before adding a
new extension.

| Extension | Guide | Codex skill |
| --- | --- | --- |
| Resize Images | [Migration guide](./docs/migrations/resize-images.md) | [`firebase-resize-images-migration`](./skills/firebase-resize-images-migration) |

To make the skill available outside this checkout, install the
`skills/firebase-resize-images-migration` directory in the agent's personal
skills directory or copy it into the consuming repository's skills directory.
The guide remains the human-readable source of truth; installing the skill does
not grant permission to push, deploy, or change live Firebase resources.

## Development

Use Node.js 22 and npm.

```bash
npm install
npm run build
npm test
```

Inspect the files that would be published for Resize Images:

```bash
npm run pack:resize-images
```

The repository root is private to prevent accidental publication. Individual
packages under `packages/` explicitly control their npm publication settings.

## Publishing

Package releases use npm Trusted Publishing from GitHub Actions. The
`publish.yml` workflow stages `@thebluebox/resize-images` using OIDC and no
long-lived npm token. A maintainer must inspect and approve the staged package
with npm two-factor authentication before it becomes public.

The trusted publisher for this package must use:

```text
GitHub organization: TheBlueBoxDev
Repository: firebase-function-kits
Workflow: publish.yml
Allowed action: npm stage publish
```

Run the workflow only from `main`. Use the `next` distribution tag for release
candidates and `latest` for stable releases.
