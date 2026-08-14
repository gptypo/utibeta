# Content Architecture 6.0

A 6.0 továbbra is statikus, repository-alapú Pages CMS architektúra.

1. `content/project.json` – manifest és modulhivatkozások.
2. `content/modules/<modul>/index.json` – modul shell + aloldal lista.
3. `content/modules/<modul>/<oldal>.json` – page-local tartalom.
4. `dynamic-pages.json` – CMS-ből létrehozható plusz aloldalak.
5. Ismételhető tartalom = JSON array = Pages CMS list.
6. Belső oldal = a szülőelem saját `detail` objektuma.
7. `blocks` = biztonságos, újrafelhasználható komponenskönyvtár.
8. `ui.json` = csak valóban alkalmazásszintű/shared UI.

A 6.0 nem migrálja más struktúrába a meglévő tartalmat; kompatibilis folytatása az 5.4-es modellnek.
