# BETA 5.1.1 – GitHub Actions / Node.js 24

Maintenance update for the BETA 5.1 reusable-components build.

## Changes

- `actions/checkout` updated from `v4` to `v7`.
- `actions/setup-node` updated from `v4` to `v7`.
- GitHub Actions validation runtime updated from Node.js `22` to Node.js `24`.
- No application content, CMS schema, renderer, splash, or PWA behavior was changed.

## Validation workflow

The content validation job continues to run `npm run validate:content` on relevant pushes and pull requests.
