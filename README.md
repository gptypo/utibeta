
## Beta 4.0 – JSON-alapú tartalom

Az alkalmazás elsődleges tartalomforrása a `content/project.json`. A JavaScript modulok már nem tartalmazzák a nagy tartalmi tömböket, csak a közös projektadat megfelelő ágait exportálják a renderer számára. A Studio teljes projekt-JSON-t exportál és importál.

# Útiterv a Jövőbe — Beta 1.0.2 preview

Vanilla JS, HTML, CSS, ES Modules és offline PWA.

## Beépített modulok
- QUIT & GO / Önmagam
- QUICK WIN / Helyzeteim
- WIN-WIN / Kapcsolataim
- GALAXY GUIDE / Bónusz tudástár

A tartalom a Replit projekt adatfájljaiból került át. Az állapotok (utolsó oldal, lépések, megnézett válaszok, checklist) localStorage-ban tárolódnak.

## Indítás
A service worker miatt helyi webszerver szükséges, például:

```bash
python -m http.server 8080
```

Ezután: http://localhost:8080

## Beta 1.0.2 preview 1.1 finomítások
- Visszafogottabb főoldali kártya-whitespace; külön oszlopköz az ikon és a szöveg között.
- Stabil lapozás: az Előző/Következő gombok nem ugranak a képernyő tetejére.
- A Quick Win / Munka világa altémái függőleges lista helyett egyenként, oldalirányú lapozási mintával jelennek meg.

## Beta 1.0.3 – Content Engine

- A Munkahelyi vészjelek ismét accordion/lenyíló referencia-nézetet használ.
- Új `editor.html` tartalomszerkesztő programozás nélküli bővítéshez.
- Támogatott minták: oldalirányú történet, accordion, flip kártya, felfedező quiz.
- A saját tartalmak helyben, localStorage-ban tárolódnak, és JSON-ként exportálhatók/importálhatók.
- A mentett témák automatikusan megjelennek az alkalmazás főoldalán.


## Beta 1.0.4 – Live Server javítás

- A HTML, JavaScript és CSS fájlok network-first cache stratégiát használnak, így a Live Server nem keveri a korábbi build fájljait az új verzióval.
- A hiányzó `onmagam-data.js` bekerült az offline gyorsítótárba.
- A service worker frissítése megkerüli a böngésző HTTP-cache-ét.
- Indítási hiba esetén az alkalmazás már látható technikai üzenetet mutat üres képernyő helyett.

## Live Server fejlesztői indítás

A 1.5-ös build localhost alatt nem regisztrál service workert, és induláskor törli a korábbi Útiterv cache-eket.

1. A ZIP tartalmát bontsd ki egy új mappába.
2. A VS Code-ban közvetlenül ezt a mappát nyisd meg.
3. Az `index.html` fájlon válaszd az **Open with Live Server** lehetőséget.
4. Ha ugyanazon a porton még régi build jelenik meg, nyisd meg egyszer a `reset-live-server.html` oldalt.

## Aktuális verzió
Beta 1.7.2 – mindfulness és Win-Win tartalmi finomítások.


## Beta 2.7
Lásd: RELEASE-NOTES-BETA-2.7.md
