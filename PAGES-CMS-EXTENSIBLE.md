# Pages CMS – bővíthető tartalomblokkok

A projekt minden beépített modul-aloldalán található egy **Plusz tartalomblokkok** mező.

Az új blokkok a meglévő, speciális interaktív tartalom után jelennek meg. A blokkok hozzáadása, törlése és sorrendje a Pages CMS-ből kezelhető, JavaScript módosítása nélkül.

## Elérhető blokkfajták

- Szöveg
- Kép
- Feltöltött videó
- YouTube / Vimeo videó
- Hanganyag
- Képgaléria
- Kiemelt kártya
- Letölthető anyag
- Idézet / kiemelés
- Elválasztó

## Galaxy Guide példa

`Galaxy Guide · Materials` vagy `Galaxy Guide · Videos` → `Tartalom` → `Plusz tartalomblokkok` → `Add block`.

Itt például bármennyi új képet, videót, galériát vagy szöveges blokkot felvehetsz.

## Média mappák

- képek: `/assets`
- hang: `/audio`
- videó: `/video`
- letöltések: `/downloads`

A service worker az összes tartalmi JSON-t átnézi, és a bennük hivatkozott helyi médiákat is hozzáadja az offline cache-hez.

## 4.1 javítás

A dashboard modulcímke feloldása külön függvényből történik; a korábbi `dashboardModuleLabel is not defined` indítási hiba javítva. A service worker cache-verziója is frissült, hogy a régi JS ne maradjon bent.

Splash exception (4.2): the animated splash rocket is intentionally hardcoded as inline SVG in index.html. It is not editable from Pages CMS, so it is available at the first paint and cannot produce an empty image placeholder.
