# BETA 3.1 megjegyzés

A Netlify példa backend a `netlify/functions/` könyvtárban már implementálja a pilot workflow-t. Az alábbi dokumentum továbbra is a hostingfüggetlen célarchitektúra leírása.

# Útiterv Studio BETA 3.0 – AI Release Agent API contract

A BETA 3.0 kliensoldali ügynökfelület hostingfüggetlen. A tényleges AI-kódolás, tesztelés, buildelés és publikálás szerveroldali szolgáltatást igényel.

## Biztonsági alapelv
Az AI szolgáltató API-kulcsa, repository token és publikálási credential **soha nem kerülhet a böngészőbe vagy a PWA csomagba**.

## Végpontok

### POST `/jobs`
`multipart/form-data`

- `request`: `application/json` fájl. Tartalma:
  - `product`
  - `sourceVersion`
  - `requestedVersion`
  - `scope`: `content | bugfix | feature | mixed`
  - `prompt`
  - `requireHumanApproval`
  - `constraints`
  - `attachments`
- `files`: 0..n csatolmány

Válasz:
```json
{
  "jobId": "job_123",
  "status": "running",
  "stage": "analyze"
}
```

### GET `/jobs/:jobId`
Példa:
```json
{
  "jobId": "job_123",
  "status": "ready",
  "stage": "review",
  "version": "BETA 3.0.1",
  "summary": "3 tartalmi módosítás és 1 hibajavítás elkészült.",
  "changes": [
    "QUICK WIN / CV: 6 új flip-kártya",
    "Kvízlogika regressziós tesztje frissítve"
  ],
  "checks": [
    {"name": "JavaScript syntax", "ok": true},
    {"name": "Project validation", "ok": true},
    {"name": "Playwright", "ok": true}
  ],
  "previewUrl": "https://staging.example/preview/job_123/",
  "artifactUrl": "https://staging.example/artifacts/utiterv-studio-BETA-3.0.1.zip"
}
```

### POST `/jobs/:jobId/release`
Csak emberi jóváhagyás után hívható.

Body:
```json
{"approved": true}
```

A backend feladata:
1. jóváhagyott build kiadása;
2. verzió / release notes rögzítése;
3. production csomag vagy PWA frissítése;
4. audit log.

### POST `/jobs/:jobId/reject`
A build elvetése.

## Javasolt szerveroldali pipeline

1. Feltöltött dokumentumok feldolgozása.
2. Agent checkoutolja / kibontja a legutóbbi jóváhagyott Útiterv Studio buildet.
3. AI csak az érintett fájlokat módosítja.
4. Kötelező ellenőrzések:
   - `node --check` minden JS-en;
   - `python tools/validate_project.py`;
   - Playwright smoke/regresszió;
   - asset/link ellenőrzés.
5. Version + Service Worker cache bump.
6. ZIP/build.
7. staging preview.
8. emberi jóváhagyás.
9. publikálás.
10. rollbackhoz előző build megőrzése.

## Hosting
A kliens nem Netlify-specifikus. A backend lehet PHP, Node.js, .NET, Python vagy külön belső szolgáltatás, amennyiben a fenti HTTP szerződést biztosítja.
