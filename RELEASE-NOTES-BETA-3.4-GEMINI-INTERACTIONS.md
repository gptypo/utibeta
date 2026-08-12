# BETA 3.4 – Gemini Interactions API

- Átállás a Google által új projektekhez ajánlott Interactions API-ra.
- Új alapmodell: `gemini-3.6-flash`.
- Strukturált JSON: `response_format`.
- Válaszfeldolgozás: `steps` → `model_output` → `text`.
- Interactions API usage/token kezelés.
- 90 másodperces timeout és részletes hibakezelés.
- A régi `generateContent` hívás kivezetve az Agentből.
