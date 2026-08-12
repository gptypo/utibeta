# Útiterv Studio – BETA 1.1

## Tartalmi bővítés
- QUIT & GO: új „Tudtad-e?” munkaerőpiaci kártyasorozat.
- QUICK WIN: bővített „A munka világa”, valamint Állásvadászat Z módra, Interjú Q&A, CV és LinkedIn témák.
- WIN-WIN: új „Generációk együttműködése” kártyasorozat.
- Kékgalléros karrierutak: a kompetenciák kattintható részletes ablaka leírással és munkahelyi példával.
- Mindfulness: teljes felolvasási szöveg a Biztonságos hely, Aranybuborék és Tedd le a hátizsákot! gyakorlatokhoz.
- Szövegjavítások: Dobozlégzés; Munkajogi alapok.

## Kvízrendszer
- Modulonkénti összesített kvízhaladás.
- Megválaszolt, helyes és kihagyott kérdések száma.
- Fejlődési visszajelzés, hibás válaszok áttekintése és újrakezdés.
- Erősebb kék háttér a „Nézzünk egy még jobb megoldást!” visszajelzéshez.

## Stabilitás / storage migráció
- BETA 1.0 -> BETA 1.1 állapotmigráció kézi localStorage.clear() nélkül.
- A beépített tartalom mindig a csomag aktuális JSON-fájljaiból töltődik; a régi tartalmi snapshot nem írhatja felül az új modulszerkezetet.
- Megmarad a felhasználói haladás, checklist, mindfulness állapot, téma és egyéni tartalom, amennyiben kompatibilis.
- Érvénytelen régi route/section automatikusan biztonságos alapértékre áll.

Megjegyzés: a kapott anyag minden témakörhöz ellenőrző kvízt kér, de az új kártyasorozatokhoz nem tartalmaz új kérdéssorokat. Ezekhez nem került kitalált tartalom az alkalmazásba; a meglévő kvízek kapták meg az új értékelési rendszert.


## UI + mindfulness polish
- A forgatható kártyák első oldaláról eltűntek a fölösleges label-szerű címkék; kivétel a WIN-WIN „Két oldal, egy megoldás” generációs nézőpontjelölése.
- A flip-kártyák fő szövege középre igazított, a türkíz hátoldal nem ismétli meg az első oldal kérdését/címét.
- A „Tudtad-e?” kártyák dekoratív kérdés előtti piktogramjai kikerültek.
- A kvízek „Nézzünk egy még jobb megoldást!” visszajelzése sötétebb, semleges szürke felületet kapott.
- A Biztonságos hely vizualizáció demó hanganyaga beépült és offline cache-be került.
- A Biztonságos hely, Aranybuborék és Tedd le a hátizsákot! gyakorlatoknál lenyitható teljes felolvasási szöveg érhető el audio fallbackként.
