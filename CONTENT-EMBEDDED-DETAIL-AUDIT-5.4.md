# BETA 5.4 – Embedded Detail audit

- Galaxy Guide / Videók: a belső oldal közvetlenül a videókártya `detail` objektuma.
- Nincs külön `data.detailPages` lista a `videos.json` fájlban.
- Nincs `detailPage` kézi hivatkozás a videókártyákban.
- A Szakács kártyán a belső oldal engedélyezett és placeholder tartalommal rendelkezik.
- A Villanyszerelő és Hegesztő belső oldala alapból kikapcsolt piszkozat.
- A runtime általánosan felismeri az `{ id, detail: { enabled: true } }` szerkezetet.
- A régi `detailPages` formátum runtime szinten visszafelé kompatibilis, de a CMS már az új formátumot írja.
- A content validator ellenőrzi a beágyazott belső oldal címét, stílusát, blokkjait és a szülő ID-ját.
- Negatív teszt: engedélyezett, cím nélküli belső oldal helyesen exit code 1-et ad.
- Végső content validation: 41/41 JSON, 64 média, 4 modul-index, 0 blokkoló hiba.
