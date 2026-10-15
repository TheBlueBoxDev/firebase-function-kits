# TheBlueBoxDev Firebase Function Kits

Self-managed Cloud Functions for Firebase packages maintained by
TheBlueBoxDev. These kits replace Firebase Extensions with standard 2nd gen
Cloud Functions that can be versioned, installed, and deployed independently.

## Packages

| Package | Replaces | Status |
| --- | --- | --- |
| [`@theblueboxdev/resize-images`](./packages/resize-images) | `firebase/storage-resize-images` | Release candidate |

Each package has its own README, changelog, tests, version, and npm release.
Firebase project configuration belongs in the consuming application's
repository and is not stored in this monorepo.

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
