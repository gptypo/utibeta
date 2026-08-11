# Útiterv Studio BETA 3.1 – Netlify AI backend beüzemelés

Ez a verzió már tartalmaz egy működő **Netlify Functions** példa backendet. Nem kell saját Node/PHP szervert írnod.

## Mire képes ez a példa?

1. Az OFA munkatársa természetes nyelven leírja a módosítást.
2. DOCX / TXT / MD / JSON fájlt csatolhat.
3. A Netlify Background Function meghívja az OpenAI API-t.
4. Az AI kiválasztja az érintett projektfájlokat.
5. Az AI visszaadja a módosított fájlok teljes tartalmát.
6. A backend ezeket beleírja a BETA 3.0 alapcsomag egy másolatába.
7. Elkészül egy új ZIP.
8. Az új build Netlify Blobsban tárolódik.
9. Az admin felületen megjelenik a módosításlista és a ZIP letöltési linkje.
10. Ember hagyja jóvá a kiadást.

Ez a minta szándékosan **nem engedi meg, hogy az AI emberi jóváhagyás nélkül productionbe tegyen egy buildet**.

---

## 1. Feltöltés Netlify-ra

A projektet ne csak a statikus fájlokként töltsd fel: a csomag tartalmaz `netlify/functions` könyvtárat és `package.json` függőségeket is.

A legegyszerűbb tesztelési mód:
- tedd a projektet GitHub repository-ba;
- kapcsold össze a repository-t a Netlify projekttel;
- Netlify automatikusan telepíti a függőségeket és buildeli a Functions fájlokat.

A sima "csak statikus fájlokat tartalmazó" drag-and-drop deploy nem minden esetben alkalmas a Node függőségeket igénylő Functions buildelésére.

---

## 2. OpenAI API-kulcs

Netlify:
**Project configuration → Environment variables**

Hozd létre:

`OPENAI_API_KEY`

értéknek az OpenAI Platform API-kulcsod kerül.

Opcionális:

`OPENAI_MODEL = gpt-5`

Az API-kulcs nincs a böngészőben és nincs a ZIP forráskódjába írva.

---

## 3. Teszt

Nyisd meg:

`/agent.html`

Írj egy egyszerű kérést, például:

> A QUICK WIN / CV rész címét módosítsd úgy, hogy a jelenlegi komponens és arculat maradjon változatlan.

Kattints:

**AI munka indítása**

Az állapot:
- elemzés
- módosítás
- ellenőrzés
- build
- jóváhagyás

sorrendben frissül.

Ha elkészült, megjelenik a letölthető ZIP.

---

## 4. Word csatolmány

A példa backend a `.docx` dokumentumok szövegét a `mammoth` csomaggal olvassa ki.

Közvetlenül támogatott szövegként:
- DOCX
- TXT
- MD
- JSON
- CSV

PDF és képfájl csatolható a felületen, de ebben az egyszerű példában még nem küldjük multimodális inputként az AI-nak.

---

## 5. Jóváhagyás és feltöltés

### Biztonságos alapmód

Ha csak ezt állítod be:

`OPENAI_API_KEY`

akkor a rendszer:
- elkészíti az új build ZIP-et;
- ember jóváhagyja;
- a ZIP letölthető;
- te manuálisan feltöltöd a végleges helyre.

Ez a legjobb első teszt.

### Opcionális automatikus Netlify production deploy

Ha később szeretnéd, állítsd be:

`NETLIFY_AUTH_TOKEN`

`NETLIFY_SITE_ID`

Ekkor a **Jóváhagyás és kiadás** gomb a jóváhagyott ZIP-et a Netlify Deploy API-n keresztül production deployként elküldi.

Az első tesztekhez ezt nem javaslom bekapcsolni.

---

## 6. Hol tárolja a buildet?

Netlify Blobs:

- `utiterv-ai-jobs` – job státuszok
- `utiterv-ai-artifacts` – feltöltött mellékletek és build ZIP-ek

Az API-kulcsot nem tárolja Blobban.

---

## Fontos korlát

Ez **példa / pilot backend**, nem teljes Git-alapú release rendszer.

A modell teljes fájltartalmakat ad vissza, a backend ezeket egy BETA 3.0 alap ZIP másolatába írja. Emiatt minden AI-buildet át kell nézni kiadás előtt.

A következő, intézményi szintű lépcső GitHub branch + pull request + Deploy Preview workflow lenne.
