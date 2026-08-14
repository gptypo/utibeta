# Útiterv BETA 7.1 – Recursive Content Schema

A jobb oldali Pages CMS szerkesztőpanel most valódi, tárolt JSON-hierarchiát követ.

## Alapelv

A modul-aloldalak új tárolási sémája:

```text
editor
├─ identity
├─ page
│  ├─ header
│  ├─ appearance
│  ├─ publication
│  ├─ discovery
│  ├─ quiz
│  └─ labels
├─ content
└─ extensions
   └─ blocks
```

A Galaxy Guide videókártyák mélyebb fája:

```text
videoStories[]
├─ id
├─ card
├─ appearance
└─ detail
   ├─ settings
   ├─ page
   │  ├─ header
   │  ├─ appearance
   │  ├─ publication
   │  └─ discovery
   └─ content
      └─ blocks
```

Az alkalmazás a `js/content-schema.js` adapteren keresztül a korábbi runtime-formátumot kapja, ezért a meglévő renderelők és progress-logika változatlanul használhatók.

## Migráció

`npm run migrate:recursive` a régi v5/v1 modul JSON-okat v6/v2 recursive sémára alakítja.

`npm run validate:recursive` ellenőrzi, hogy minden modul-, aloldal- és dinamikus oldal fájl az új sémát használja.
