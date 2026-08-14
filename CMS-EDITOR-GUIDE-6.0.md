# Útiterv BETA 6.0 – CMS szerkesztői útmutató

## Alapelv
A CMS továbbra is az oldal tényleges szerkezetét követi. Amit egy adott oldalon látsz, azt az adott oldal JSON-jában szerkeszted. Csak a valóban közös gombok és alkalmazásszintű UI marad közös fájlban.

## Tagolás
- `00–04`: alkalmazás, főoldal, média, offline/PWA
- `10`: modulbeállítások
- `12`: meglévő aloldalak
- `19`: új dinamikus aloldalak
- `80–81`: közös és egyedi tartalmak
- `90–91`: projektstruktúra és hibaüzenetek

Egy aloldalon belül: `1 · Oldalfejléc`, `2 · Fő tartalom`, `9 · Plusz blokkok`. A kártyák saját `Belső oldal` csoportot kaphatnak.

## Biztonsági szabályok
- Technikai ID: kisbetű, szám, kötőjel.
- Belső oldal csak akkor kattintható, ha a `Van részletes oldal` kapcsoló aktív.
- Nyers CSS/JS nem szerkeszthető; megjelenéshez preset választható.
- Félkész extra blokk elrejthető.
- GitHub Actions minden pushnál JSON + tartalom + JS ellenőrzést futtat.

## Mélylinkek
A modul/aloldal/belső oldal URL-ben is megjelenik, pl. `#/galaxy-guide/videos/video-story-placeholder-1`. Frissítés és böngésző-vissza navigáció mellett is megmarad.

## Keresés
A főoldali kereső automatikusan a projekt tartalomfájából épül; új oldal vagy új belső oldal külön keresőindex-karbantartás nélkül bekerül.

## Debug
Fejlesztéskor az URL-hez add a `?debug=1` paramétert. A jobb alsó panel mutatja az aktív route/section/detail állapotot.
