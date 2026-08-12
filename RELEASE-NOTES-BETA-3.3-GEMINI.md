# BETA 3.3 – Gemini Free API Agent

- OpenAI backend lecserélve Google Gemini API-ra.
- Alapmodell: `gemini-2.5-flash`.
- Új Netlify secret: `GEMINI_API_KEY`.
- Az OpenAI SDK függőség eltávolítva; a backend közvetlen Gemini REST API-t használ.
- Gemini strukturált JSON output a fájlkiválasztási és kódmódosítási lépéshez.
- 90 másodperces API timeout.
- Részletes Netlify Background Function logok.
- 400/401/403/404/429/5xx Gemini hibák felhasználóbarát kezelése.
- Tokenhasználat kijelzése és `Free Tier*` jelölés.
- Az embedded base app frissítve BETA 3.2.1-re.
- Emberi jóváhagyás továbbra is kötelező.
