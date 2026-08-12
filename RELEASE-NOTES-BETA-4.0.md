# Útiterv Studio Beta 4.0 – Data Driven Architecture

## Új architektúra

- A teljes beépített tartalom a `content/project.json` fájlba került.
- A főoldali hero szövegei és a Studio-ban létrehozott saját tartalmak ugyanebben a projektmodellben tárolódnak.
- A korábbi nagy JavaScript adatmodulok vékony adapterekké váltak; a JavaScript feladata a JSON betöltése és renderelése.
- A Studio a teljes projekt-JSON-t exportálja és importálja.
- A korábbi `utiterv-full-content-v1`, saját tartalom és hero localStorage adatok automatikusan migrálódnak az új projektformátumba.
- A teljes reset az új projekt-workspace-t is törli és visszaállítja a csomagban található alap `project.json`-t.
- A service worker offline gyorsítótárába bekerült a `project.json` és az új projektbetöltő.

## Projektstruktúra

```text
content/project.json
js/project-content.js
js/onmagam.js            → adapter
js/helyzeteim.js         → adapter
js/kapcsolataim.js       → adapter
js/bonus.js              → adapter
js/competencies.js       → adapter
```

## Szerkesztési folyamat

1. Az alkalmazás betölti a csomagban található `content/project.json` fájlt.
2. Ha van Studio-workspace, azt használja a projekt aktuális változataként.
3. A Studio módosításkor a közös projektmodellt menti.
4. A **Project JSON** export teljes, hordozható projektfájlt készít.
5. A **Project import** egy másik teljes projektet tölt be.
