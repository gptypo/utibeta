# BETA 3.4.2 – Agent Stability Update

- Automatikus retry Gemini transient hibákra: HTTP 408, 429, 5xx és hálózati hibák.
- Exponenciális backoff + jitter: ~2s, 4s, 8s, 16s tartomány.
- `Retry-After` és Gemini RetryInfo figyelembevétele, ha elérhető.
- Maximum 4 AI-próbálkozás lépésenként.
- 90 másodperces timeout próbálkozásonként; timeout után automatikus retry.
- Heartbeat státusz a Netlify Blobs jobban.
- A frontend részletesen mutatja, hogy kapcsolódik, vár, újrapróbál vagy dolgozik.
- 2 perc friss heartbeat nélkül figyelmeztető „a válasz késik” állapot jelenik meg.
- Fájlkiválasztás alapból `gemini-3.5-flash-lite` modellen.
- Tényleges kódmódosítás továbbra is `gemini-3.6-flash` modellen.
- Mindkét modell külön Netlify environment variable-lal felülírható:
  `GEMINI_ANALYSIS_MODEL` és `GEMINI_MODEL`.
