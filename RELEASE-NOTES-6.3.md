# BETA 6.3 – Content Lifecycle & Discovery

Pages, detail pages and CMS blocks support an optional lifecycle:

- `published` – visible
- `draft` – editable, not shown to users
- `archived` – retained, not shown to users
- optional publish/unpublish timestamps
- optional category and tags

Missing lifecycle metadata remains backwards-compatible and is treated as published.
Search excludes unpublished content and can filter by category/tag when these metadata exist.
