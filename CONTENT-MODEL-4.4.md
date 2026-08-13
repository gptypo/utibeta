# Pages CMS tartalommodell 4.4

## Szerkesztői alapelv
Az aloldalon látható tartalom az adott aloldal JSON-fájljában található.

Példa: `content/modules/galaxy-guide/materials.json`
- `data.page.header.eyebrow` → Segédlet
- `data.page.header.title` → Galaxy Guide
- `data.page.header.description` → bevezető szöveg
- `data.page.labels` → csak ezen az oldalon használt címkék
- `data.bonusMaterials` → a kártyák
- `data.blocks` → szabadon hozzáadható új blokkok

## Mi marad globális?
A `content/ui.json` csak alkalmazásszintű felületeket és valóban újrahasznált vezérlőszövegeket tartalmaz: navigáció, főoldal, közös gombok, általános kvíz-/komponensműködés, hibaüzenetek.

A modulok saját bemutatkozó popupja, főoldali modul-kártyaszövege és záró üzenete az adott modul `index.json` fájljában van a `page` objektumban.
