# Útiterv – Pages CMS szerkesztői útmutató (BETA 4.5)

## Alapelv

Amit egy adott aloldalon látsz, azt elsőként az adott aloldal JSON-jában keresd. A `content/ui.json` csak valóban közös alkalmazásfeliratokat és vezérlőszövegeket tartalmaz.

## Egy aloldal szerkesztési sorrendje

1. **Oldalon látható fejléc és feliratok** – felső címke, cím, bevezető, csak az adott oldalon használt státuszok és feliratok.
2. **Az oldal saját tartalma** – kártyák, kérdések, tippek, listák és az adott modul speciális elemei.
3. **Plusz tartalomblokkok** – új szöveg, kép, videó, audio, galéria, kártya, idézet vagy letölthető fájl hozzáadása a meglévő tartalom után.

## Mikor keresd a közös UI-t?

Csak akkor, ha ugyanaz a vezérlő több oldalon is ugyanazt jelenti, például: **Megnyitás**, **Folytatás**, **Előző téma**, **Következő téma**.

## Biztonsági működés

- Félkész vagy hibás plusz tartalomblokk nem állítja le az oldalt: a renderelő kihagyja.
- Ha egy összetettebb oldal kötelező adatszerkezete sérül, az app shell és a többi oldal működőképes marad, az érintett oldalon szerkeszthető hibaüzenet jelenik meg.
- A splash továbbra is teljesen hardcode-olt és nem szerkeszthető a CMS-ből.

## Tartalomellenőrzés

Lokálisan vagy CI-ben:

```bash
npm run validate:content
```

Az ellenőrzés vizsgálja a JSON-ok parse-olhatóságát, a projekt- és modulhivatkozásokat, a Pages CMS lefedettséget, a médiafájlok meglétét és a bővíthető blokkok kötelező mezőit.
