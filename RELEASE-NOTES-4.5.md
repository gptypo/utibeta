# BETA 4.5 – CMS Polish & Safety

## CMS UX
- Magyar, szerkesztőbarátabb csoport- és mezőnevek a közös UI-ban.
- Az oldal-specifikus tartalom továbbra is az adott oldal JSON-jában marad.
- A Galaxy Guide Tudástár és videók listáinak mezőnevei pontosítva.
- Külön szerkesztői útmutató készült (`CMS-EDITOR-GUIDE-4.5.md`).

## Biztonság
- A bővíthető CMS-blokkok hibája nem állítja le az oldalt; hibás/hiányos blokk kimarad.
- Ismeretlen blokktípus biztonságosan kihagyásra kerül és konzolfigyelmeztetést ad.
- Egy sérült aloldal JSON betöltése nem akadályozza meg a teljes app indulását.
- Oldalrenderelési hiba esetén szerkeszthető, globális tartalmi hibaüzenet jelenik meg, miközben az app shell működőképes marad.

## Validáció
- Új `tools/validate-content.mjs` tartalmi validátor.
- `npm run validate:content` parancs.
- 37 JSON, 64 média-hivatkozás és 4 modul-index ellenőrzése.
- Pages CMS JSON-lefedettség ellenőrzése.
- GitHub Actions workflow releváns push/PR esetére.

## Cache
- Build/cache token: `cms-polish-safety-4.5`.
