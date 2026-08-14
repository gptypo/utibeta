# BETA 5.4 – Embedded Detail Pages

## Cél
A kártyához tartozó belső oldal ugyanott legyen szerkeszthető, ahol maga a kártya. Nincs külön detailPages lista és nincs kézi ID-összekötés.

## Galaxy Guide → Videók
Minden videókártya saját `detail` objektumot kap:

- `enabled` – legyen-e kattintható belső oldal
- `header` – a belső oldal fejléce
- `stylePreset` – biztonságos CSS preset
- `backLabel` – vissza gomb
- `blocks` – teljes újrahasznosítható komponenskészlet

A belső oldal a kártya meglévő technikai ID-ját használja automatikusan. A szerkesztőnek nem kell másik ID-t létrehozni vagy összekapcsolni.

## Biztonság
- kikapcsolt `enabled` esetén a kártya nem kattintható;
- bekapcsolt belső oldalnál a cím kötelező a build-validátor szerint;
- csak ismert style preset engedélyezett;
- a blokkokat a meglévő content validator ellenőrzi;
- duplikált/hibás szülő ID buildhibát ad;
- a régi `detailPages` formátumot a runtime átmenetileg még visszafelé kompatibilisen olvassa, de az új CMS már nem írja.

## Szerkesztői út
`Galaxy Guide → Videos → Videókártyák → [kártya] → Belső oldal`
