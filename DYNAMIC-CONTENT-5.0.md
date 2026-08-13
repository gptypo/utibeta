# BETA 5.0 – Dynamic Content Architecture

## Új aloldal létrehozása Pages CMS-ben

Minden fő modulhoz tartozik egy **„Új aloldalak”** CMS menüpont.

1. Nyisd meg a kívánt modul `Új aloldalak` részét.
2. Adj hozzá új elemet a `Dinamikus aloldalak` listához.
3. Adj meg egy egyedi technikai azonosítót (kisbetű, szám, kötőjel), például `interju-videok`.
4. Add meg a fül nevét és az oldal fejlécét.
5. Építsd fel az oldalt a tartalomblokkokból.
6. Mentsd a fájlt. A deploy után az oldal automatikusan megjelenik a modul navigációjában.

A `Piszkozat / elrejtés` kapcsolóval az oldal szerkeszthető marad, de nem kerül be az appba.

## Működés

A beépített, speciális oldalak továbbra is a saját renderelőjüket használják. Az új, CMS-ből létrehozott oldalak automatikusan a generikus page-builder renderelővel jelennek meg. Nem kell `app.js`-t módosítani vagy routing-kódot írni.

## Biztonság

A `npm run validate:content` ellenőrzi a dinamikus aloldalak azonosítóit, ütközéseit, kötelező címeit, blokkjait és médiáit is.
