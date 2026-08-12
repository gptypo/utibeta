# BETA 3.3.1 – Gemini schema hotfix

- Javítva a Gemini `generateContent` strukturált JSON válasz konfigurációja.
- Hibás:
  `generationConfig.responseFormat.text.mimeType/schema`
- Javítva:
  `generationConfig.responseMimeType = "application/json"`
  `generationConfig.responseSchema = schema`
- A módosítás a `netlify/functions/utiterv-agent-run-background.mjs` fájlt érinti.
