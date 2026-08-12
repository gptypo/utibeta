# Útiterv Studio – BETA 1.0

Körbeküldhető béta kiadás.

## Végső módosítások

- A főoldali rakéta alsó SVG-eleme 2 px-rel lejjebb került.
- Az oldal aljára automatikusan frissülő copyright került.
- A felületen és a gyorsítótárban a verzió BETA 1.0-ra frissült.

## Végleges adatvédelmi kiegészítés
- Adatvédelem és impresszum oldal került az alkalmazásba.
- A menüből és a láblécből is elérhető.
- A tájékoztató ismerteti a helyi adattárolást, az offline cache működését és a helyi adatok törlését.
- A külső Google Fonts betöltés eltávolításra került; az alkalmazás nem tölt be harmadik féltől analitikai, követő- vagy betűkészlet-erőforrást.
- A Service Worker cache azonosítója frissült a végleges BETA 1.0 buildhez.


## Betűkészlet-javítás
- Visszaállítva a Google Fonts betöltése a BBH Bartle és DM Sans betűkészletekhez.
- Frissítve a cache-verzió, hogy a javított CSS azonnal betöltődjön.

## Tipográfiai javítás
- Az „Adatvédelem” főmenüpont a „Főoldal” menüponttal azonos DM Sans stílust használja, így a magyar ékezetes karakterek hibátlanul jelennek meg.

## Flip-kártya UX finomítás
- A kártyafordítás gyorsabb, 260 ms-os animációt kapott.
- Érintésre közvetlenebb reakciót biztosító mobilos beállítás került a kártyákra.
- Az első megjelenő forgatható kártya egyszeri, finom részleges fordulással jelzi, hogy kétoldalas.
- A jelzőanimáció csökkentett mozgás beállításnál nem fut le.



## Flip-kártya UX polish
- Minden aktuálissá váló forgatható kártya finom, egyszeri libbenéssel jelzi a kétoldalas működést.
- A kártyafordítás időtartama 400 ms.
- A mozgás természetesebb `cubic-bezier(.22,1,.36,1)` easinget használ.
- A transzformáció mobilos simaságát `will-change: transform` segíti.
- A csökkentett mozgás rendszerbeállítás továbbra is kikapcsolja a jelzőanimációt.

## WIN–WIN / Kommunikáció – tartalmi finomítás

- A külön „Fiatal nézőpont” és „Munkaadói nézőpont” blokkok kikerültek a kérdés és a válaszok közül.
- A két szempont az optimális válasz visszajelzésébe épült be, így a feladat olvasási ritmusa tisztább lett, a szakmai tartalom pedig megmaradt.


## Kvíz tipográfiai finomhangolás

- A feleletválasztós blokkok fölötti címke „Segédlet” helyett „Kvíz”.
- A válaszlehetőségek betűvastagsága 700-ról 400-ra csökkent, hogy jobban elkülönüljenek a kérdéstől.


## White splash icon polish
- A PWA indítóképernyő manifest háttér- és témaszíne fehérre módosult.
- A 512 px-es alkalmazásikon frissült, a 192 px-es változat ebből újragenerálva.
- Az 5-4-3-2-1 Horgonyzás meglévő outline érzékszervikonjai megmaradtak.
- A Service Worker cache-verzió frissült.


## Launcher- és mindfulness ikonjavítás
- A PWA launcher ikonok átlátszó háttere helyett valódi fehér, teljesen fedett háttér készült.
- Külön, biztonságos margóval rendelkező maskable ikon került a manifestbe.
- Az 5-4-3-2-1 Horgonyzás érzékszervikonjai valódi outline megjelenítést kapnak világos és sötét módban is.
