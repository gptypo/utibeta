# BETA 3.3.2 – Gemini model discovery

- A backend induláskor lekéri a Gemini `v1beta/models` listát.
- Csak `generateContent` támogatású modelleket vesz figyelembe.
- A `GEMINI_MODEL` értékét normalizálja (`models/` prefix és whitespace eltávolítás).
- Ha a kért modell nem érhető el az adott API-kulccsal, automatikus Flash fallbacket választ.
- A Netlify logba kiírja az adott kulccsal elérhető `generateContent` modelleket és a kiválasztott modellt.
- A 404-es Gemini válasznál megőrzi a Google eredeti hibaüzenetét.
