# BETA 7.0.2 – Hierarchical CMS Navigation

A Pages CMS bal oldali navigációja valódi, egymásba ágyazott `group` struktúrát kapott. A tartalmi JSON-ok, fájlútvonalak és mezősémák változatlanok maradtak; kizárólag a szerkesztői navigáció lett fa-szerű és könnyebben követhető.

## Fő struktúra

- 1. App beállításai
- 2. Tartalom modulok
  - Quit & Go
    - Modulbeállítások
    - Aloldalak
    - Új aloldalak
  - Quick Win
  - Win-Win
  - Galaxy Guide
- 3. Többi
  - Média és assetek
  - Offline oldal
  - Közös adatok
  - Egyedi témák
  - Projektstruktúra
  - Hibaüzenetek

A modulok `Aloldalak` csoportja újabb hierarchiaszintet ad, így például a Videók útvonala: `Tartalom modulok → Galaxy Guide → Aloldalak → Videók`.

A release validáció új `validate:cms` lépést kapott, amely ellenőrzi a fő csoportokat, modulcsoportokat, aloldalcsoportokat és a CMS pathok egyediségét.
