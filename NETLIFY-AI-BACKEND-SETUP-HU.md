# Útiterv Studio BETA 3.3 – Gemini Free API + Netlify beüzemelés

A BETA 3.3 AI Agentje már **nem használ OpenAI API-t**. A Netlify Background Function közvetlenül a Google Gemini API-t hívja.

## 1. Gemini API-kulcs

Nyisd meg a Google AI Studio API key felületét, és készíts egy Gemini API-kulcsot.

A kulcsot ne írd bele a GitHub repositoryba és ne küldd el másnak.

## 2. Netlify Environment variable

Netlify → Project configuration → Environment variables

Hozd létre:

`GEMINI_API_KEY`

Értéknek a Google AI Studio-ban létrehozott Gemini API-kulcs kerül.

Opcionális:

`GEMINI_MODEL = gemini-2.5-flash`

Ha nincs `GEMINI_MODEL` beállítva, a backend automatikusan `gemini-2.5-flash` modellt használ.

A régi `OPENAI_API_KEY` már nem szükséges ehhez a verzióhoz, később törölhető a Netlify Environment variables közül.

## 3. Új deploy

A környezeti változó beállítása után indíts új Netlify deployt:

Deploys → Trigger deploy → Clear cache and deploy site

Várd meg, amíg a Functions bundling is Complete.

## 4. Agent teszt

Nyisd meg:

`/agent.html`

Elsőre kis módosítást kérj, például:

> A QUICK WIN / CV részben módosíts egy rövid címet. Más tartalmat és működést ne változtass.

A folyamat:

1. kérés elemzése;
2. Gemini kiválasztja az érintett fájlokat;
3. Gemini elkészíti a módosítást;
4. alapellenőrzések;
5. új ZIP build;
6. emberi jóváhagyás.

## 5. Free Tier

A felület a Gemini által visszaadott tokenhasználatot mutatja. A Free Tier használatnál a felület `Free Tier*` jelölést ad.

Ez **nem számlázási garancia**: a tényleges kvóta, rate limit és esetleges fizetős használat mindig a Google AI Studio / Google Cloud beállításaitól függ.

Ha a Free Tier limit elfogy, az Agent nem marad végtelenül „Dolgozik…” állapotban: a backend 429-es Gemini hibát felhasználóbarát üzenetté alakítja.

## 6. Diagnosztika

A Background Function a Netlify logba most már kiírja:

- melyik AI lépés indul;
- melyik modell fut;
- mikor érkezett válasz;
- tokenhasználatot;
- a konkrét API-hibát.

90 másodperces API timeout is van, ezért tartós API-probléma esetén sem ragad végtelenül a kérés elemzésénél.

## 7. Támogatott mellékletek

Közvetlen szövegfeldolgozás:
- DOCX
- TXT
- MD
- JSON
- CSV

PDF és kép továbbra is csatolható a felületen, de ebben a pilot verzióban még nem küldjük multimodális Gemini inputként.

## 8. Biztonság

Az AI továbbra sem publikálhat önállóan productionbe. A kész ZIP-et embernek kell jóváhagynia.
