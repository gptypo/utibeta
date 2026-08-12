# BETA 3.5 – JSON Content Workflow

- Központi `content/content.json`.
- Runtime `UtitervContentState`.
- Kompatibilitási fetch bridge a meglévő modulokhoz.
- Gyors, egyhívásos Gemini tartalomszerkesztés.
- Élő preview iframe, memóriában módosított JSON-nal.
- Approve után GitHub commit a `content/content.json` fájlra.
- GitHub commit után automatikus Netlify deploy.
- A GitHub token csak Netlify secretként használható.
- Developer mód elkülönítve a tartalmi workflow-tól.
