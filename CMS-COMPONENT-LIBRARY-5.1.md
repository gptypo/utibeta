# Útiterv – CMS komponenskönyvtár 5.1

A BETA 5.1 célja, hogy amit az alkalmazásban egyszer már megépítettünk, azt új tartalomban is újra fel lehessen használni kódmódosítás nélkül.

## Hol használható?

A `Bővíthető tartalom` blokklista minden olyan meglévő és dinamikus aloldalon használható, amely Pages CMS-ben ezt a mezőt kapja. Emiatt például a Galaxy Guide meglévő oldalába is beszúrható új kvíz vagy flip-card sor.

## Interaktív blokkok

### Kvíz
- egyedi `id`
- cím, kis felirat, bevezető
- tetszőleges számú kérdés
- kérdésenként tetszőleges számú válasz
- pontosan egy optimális válasz
- válaszonként magyarázat
- eredmény és progress ugyanabba a rendszerbe kerül, mint a beépített kvízek

### Lapozható kártyák
- egyedi `id`
- cím / bevezető
- tetszőleges számú kártya
- gombbal és swipe-pal lapozható

### Fordítós kártyák
- egyedi `id`
- előlap / hátlap
- közös vagy kártyánként eltérő címkék
- lapozás + flip interakció

### Checklist
- egyedi `id`
- tetszőleges számú tétel
- a kipipált állapot lokálisan megmarad

### Lépéssor / folyamat
- számozott, strukturált folyamatblokk
- tetszőleges számú lépés

A korábbi statikus blokkok továbbra is elérhetők: szöveg, kép, videó, YouTube/Vimeo, audio, galéria, kiemelt kártya, letöltés, idézet és elválasztó.

## Oldal vizuális stílusa

Dinamikus aloldalnál a Pages CMS-ben az `Oldal vizuális stílusa` mezővel választható CSS preset:

- `default` – az eredeti Útiterv megjelenés
- `cards` – erősebben tagolt, kártyás felület
- `highlight` – hangsúlyos fejléc és blokkkezelés
- `minimal` – levegős, kevés keret
- `dark` – sötét, kontrasztos panel
- `module` – az aktuális főtéma színéhez igazodó megjelenés

A szerkesztő nem ír nyers CSS-t. A preset csak ellenőrzött class-nevet kapcsol az oldalhoz, ezért a layout nem tehető tönkre egy hibás CSS deklarációval.

## Stabil azonosítók

A kvíz, lapozható kártya, flip-card és checklist `id` mezőjét létrehozás után lehetőleg ne változtasd. A progress / pozíció / kipipált állapot ehhez kapcsolódik.
