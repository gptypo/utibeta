# Útiterv Studio BETA 3.5 – JSON Content Workflow

## Architektúra

A publikus PWA központi tartalomállapota:

`content/content.json`

A meglévő `content/*.json` modulok ennek `modules` objektumába kerültek. A kompatibilitási bridge miatt a meglévő app továbbra is kérheti a korábbi `content/<modul>.json` fájlokat; ezeket a PWA a központi JSON-ból szolgálja ki.

## AI tartalmi workflow

1. Az Agent betölti a `content/content.json` fájlt.
2. A user természetes nyelven megadja a módosítást.
3. A `utiterv-content-generate` Function egyetlen Gemini-hívással elkészíti a módosított JSON-t.
4. A JSON csak memóriában marad.
5. Az Agent a `preview.html` iframe-be küldi az új állapotot.
6. Jóváhagyáskor a `utiterv-content-approve` Function commitolja a `content/content.json` fájlt GitHubra.
7. A GitHub commit elindítja a Netlify deployt.

## Netlify environment variables

Kötelező:
`GEMINI_API_KEY`
`GITHUB_TOKEN`
`GITHUB_OWNER`
`GITHUB_REPO`

Opcionális:
`GITHUB_BRANCH = main`
`GEMINI_CONTENT_MODEL = gemini-3.5-flash-lite`

## GitHub token

Fine-grained Personal Access Token javasolt.

Repository access:
- csak az Útiterv Studio repository

Repository permissions:
- Contents: Read and write
- Metadata: Read-only

A token kizárólag Netlify Environment Variable legyen.

## Biztonság

A tartalmi Agent kizárólag a `content/content.json` fájlt commitolja. Commit előtt ellenőrzi a JSON alapstruktúráját.

Kód-, CSS-, HTML- vagy funkciómódosításnál az AI `requiresDeveloperMode: true` értékkel jelezhet, és a kérés Developer módba kerülhet.

## Publikus PWA

A végleges felhasználói PWA az Agent és Editor nélkül is működik. A központi `content.json` és a PWA runtime elegendő a publikus alkalmazáshoz.
