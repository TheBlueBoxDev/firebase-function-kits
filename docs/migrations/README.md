# Extension migration guides

This directory contains the consuming-project runbook for each self-managed
Firebase Function Kit in the monorepo. Shared package code belongs under
`packages/`; migration guides and Codex skills explain how to adopt that code
safely in each Firebase project.

## Structure

Add one row to the root README and use these matching names for every migrated
extension:

```text
packages/<kit-name>/
docs/migrations/<kit-name>.md
skills/firebase-<kit-name>-migration/SKILL.md
```

Keep each guide and skill package-specific. Extension parameters, triggers,
IAM, APIs, generated wrappers, validation, and cutover risks can differ enough
that a single generic procedure would hide important checks.

Every migration guide should cover:

- supported source extension and package version;
- source runtime, selected package runtime, and runtime support lifecycle;
- multi-project and multi-environment configuration ownership;
- inventory and configuration export;
- reproducible local installation and generated-wrapper corrections;
- local validation that does not affect cloud resources;
- deploy, cutover, rollback, and removal boundaries;
- a per-project completion record.

Every migration skill should preserve user scope and require explicit
authorization for push, deployment, live-resource changes, and extension
removal. It should point to its guide while retaining enough instructions to
remain useful when installed on its own.
