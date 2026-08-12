# Útiterv Studio BETA 3.4 – Gemini Interactions API

A BETA 3.4 a Google által új projektekhez ajánlott **Interactions API**-t használja.

## Netlify változók

Kötelező:

`GEMINI_API_KEY`

Opcionális:

`GEMINI_MODEL = gemini-3.6-flash`

Ha a `GEMINI_MODEL` nincs beállítva, az alapmodell `gemini-3.6-flash`.

## Mi változott?

- a régi `generateContent` végpont helyett: `POST /v1beta/interactions`
- strukturált JSON: `response_format`
- a válasz a `steps` tömb `model_output` → `text` blokkjából kerül kiolvasásra
- tokenhasználat az Interactions `usage` mezőből
- 90 másodperces timeout
- részletes Netlify logok
- emberi jóváhagyás továbbra is kötelező

## Első teszt

1. Pushold a frissített Functiont GitHubra.
2. Várd meg a Netlify deployt.
3. Nyisd meg `/agent.html`.
4. Adj egy kicsi, könnyen ellenőrizhető módosítást.
5. A `run-background` logban ezt kell látni:
   - `Gemini Interactions indul`
   - `Gemini Interactions kész`

Ha a Free Tier limit elfogy, a backend 429-es hibát ír ki felhasználóbarát üzenettel.
