# Pages CMS vizuális hierarchia – 7.1.1

A jobb oldali szerkesztőpanel továbbra is a 7.1-ben bevezetett valódi rekurzív JSON-fát mutatja. A 7.1.1 ezt vizuálisan erősíti fel.

## Jelölések

- `▰` – oldalstruktúra gyökere
- `① ② ③` – elsődleges szerkezeti szintek
- `↳` – beállítási/alobjektum
- `▸` – tényleges tartalomlista vagy tartalmi ág
- `▾` – beágyazott belső oldal

A címkékben használt em-space karakter csak vizuális térközt ad; az adatmodellben nem hoz létre új kulcsot és nem változtatja meg a JSON-t.

Példa:

```text
▰ OLDALSTRUKTÚRA
   ① OLDAL
      ↳ Fejléc
      ↳ Megjelenés
      ↳ Publikálás
   ② FŐ TARTALOM
      ▸ VIDEÓKÁRTYÁK
         Szakács
            ① KÁRTYA
            ② MEGJELENÉS
            ▾ BELSŐ OLDAL
               ① BEÁLLÍTÁSOK
               ② OLDAL
               ③ TARTALOM
   ③ BŐVÍTÉSEK
      ▸ Tartalomblokkok hozzáadása
```
