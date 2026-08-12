# BETA 3.5.1 – Kvíz eredmény alapú haladás

- A kvízek haladása most kizárólag a helyes válaszokból számolódik.
- Példa: 12 kérdésből 7 helyes válasz → `7/12`, 58%.
- A 12/12 és 100% csak akkor jelenik meg, ha mind a 12 válasz helyes.
- A korábban mentett válaszokból az eredmény automatikusan újraszámolódik; nem kell törölni a localStorage-t.
- A kvíz eredménypanel külön mutatja:
  - helyes/összes eredmény,
  - megválaszolt kérdések száma,
  - hány helyes válasz hiányzik még a 100%-hoz.
- A modulonkénti és főoldali Fejlődésed dashboard is helyes/összes alapon számol.
- A dashboard „100%-hoz hátra” értéke a még nem helyesen megoldott kérdéseket mutatja.
