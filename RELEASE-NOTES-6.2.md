# BETA 6.2 – Release Hardening

- Full `validate:release` gate: content, JavaScript, accessibility smoke and navigation/platform smoke.
- Pull requests to `main` and `staging` run a dedicated Release gate workflow.
- Static HTML now has a meaningful hardcoded `<title>` fallback before JSON hydration.
- Service-worker cache version is isolated per release.

Recommended workflow: edit content → staging branch → review/test → pull request to main.
