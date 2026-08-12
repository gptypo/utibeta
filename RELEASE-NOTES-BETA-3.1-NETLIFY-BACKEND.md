# BETA 3.1 – Netlify AI backend example

- Beépített Netlify Functions backend.
- OpenAI Responses API integráció szerveroldalon.
- `OPENAI_API_KEY` kizárólag Netlify environment variable-ként kerül használatra.
- Netlify Background Function végzi a hosszabb AI-folyamatot.
- Netlify Blobs tárolja a job státuszt, feltöltött forrásokat és az elkészült ZIP buildet.
- DOCX tartalomfeldolgozás Mammoth-tal.
- AI kétlépcsős működés: érintett fájlok azonosítása → tényleges fájlmódosítás.
- Az elkészült build ZIP letölthető az admin felületről.
- Emberi jóváhagyás kötelező.
- Opcionális automatikus Netlify production deploy `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID` beállítással.
- Magyar beüzemelési útmutató: `NETLIFY-AI-BACKEND-SETUP-HU.md`.
