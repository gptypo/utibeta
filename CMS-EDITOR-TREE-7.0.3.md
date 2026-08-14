# Pages CMS – jobb oldali szerkesztőfa

A 7.0.3-ban a jobb oldali editor a meglévő JSON struktúrát vizuálisan követi.

Példa:

```text
Galaxy Guide → Videók
▾ Szerkeszthető oldal
  ├─ Oldalfejléc és megjelenés
  │  ├─ Oldal fejléc
  │  │  ├─ Felső címke
  │  │  ├─ Cím
  │  │  └─ Leírás
  │  └─ Oldal saját feliratai
  ├─ Videókártyák
  │  └─ Szakács
  │     └─ Belső oldal
  │        ├─ Belső oldal fejléce
  │        └─ Tartalomblokkok
  └─ Plusz tartalomblokkok
```

A fa vizuális: nem hoz létre új JSON-kulcsokat és nem változtatja meg az app adatmodelljét.
