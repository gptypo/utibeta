# Útiterv Studio BETA 3.6 – Simple AI Content Editor

Ez a verzió nem hozza vissza a korábbi, többlépcsős AI Agentet. Egyetlen célja a JSON tartalom gyors és biztonságos szerkesztése.

## Működés

1. Az admin az `editor.html` oldalról megnyitja az `ai-content.html` oldalt.
2. Kiválaszt egy tényleges tartalom JSON fájlt.
3. Leírja a kívánt tartalmi módosítást.
4. Egyetlen Netlify Function egyetlen Gemini API-hívást indít.
5. A Gemini a Google OpenAI-kompatibilis végpontján keresztül, az OpenAI Node SDK-val fut.
6. Az új JSON előnézetben ellenőrizhető.
7. Jóváhagyáskor – ha a GitHub változók be vannak állítva – csak a kiválasztott JSON fájl commitolódik.
8. GitHub Approve nélkül a módosított JSON külön fájlként is letölthető.

## Kötelező Netlify Environment Variable

`GEMINI_API_KEY`

Opcionális:

`GEMINI_MODEL = gemini-3.6-flash`

## GitHub Approve – opcionális

`GITHUB_TOKEN`
`GITHUB_OWNER`
`GITHUB_REPO`

Opcionális:

`GITHUB_BRANCH = main`

A GitHub token legyen fine-grained token, csak ehhez a repositoryhoz, `Contents: Read and write` jogosultsággal.

## Biztonsági korlátok

Az AI Content Editor:
- nem szerkeszt HTML-t;
- nem szerkeszt CSS-t;
- nem szerkeszt JavaScriptet;
- nem módosíthat `project.json`, `content.json`, `content.schema.json` vagy modul `index.json` fájlt;
- nem törölhet meglévő JSON kulcsot;
- nem változtathatja meg a meglévő objektum/tömb típusokat;
- nem módosíthat `schema` vagy `id` mezőt.

A GitHub commit kizárólag külön felhasználói jóváhagyás után indul.

## Netlify / Node

A BETA 3.6 az OpenAI Node SDK 7.x ágát használja, ezért a `package.json` Node 22 vagy újabb runtime-ot kér.
