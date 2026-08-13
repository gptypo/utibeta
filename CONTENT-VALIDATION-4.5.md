# Tartalmi validáció – BETA 4.5

A `tools/validate-content.mjs` külső csomag nélkül, Node.js-szel fut.

Ellenőrzi:

- minden `content/**/*.json` fájl érvényességét;
- a `project.json` által hivatkozott globális tartalomfájlokat;
- a modulindexekben hivatkozott aloldal JSON-okat;
- a helyi kép-, ikon-, hang-, videó- és letöltési hivatkozások meglétét;
- a CMS bővíthető blokkok típusát és kötelező mezőit;
- a galériaképek meglétét és hiányzó alt szövegét;
- hogy minden tartalom-JSON szerepel-e a `.pages.yml` konfigurációban.

A `.github/workflows/content-validation.yml` ugyanezt automatikusan lefuttatja releváns push és pull request esetén.
