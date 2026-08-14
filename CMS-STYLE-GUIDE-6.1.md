# CMS stíluskezelés – 6.1

Minden új tartalomblokknál két megjelenési mező van:

1. **Megjelenési stílus** – előre definiált, biztonságos CSS preset.
2. **Egyedi CSS osztály** – opcionális hook egy speciális eltéréshez.

Az egyedi osztály például `szakacs-hero`, `kiemelt-video` vagy `nagy-kep` lehet. Szóköz, pont, idézőjel, kapcsos zárójel és nyers CSS nem engedélyezett.

A preset és a custom class együtt is használható. Például a `highlight` preset adja az alap megjelenést, a `szakacs-hero` pedig egyetlen elemre tehet további CSS szabályt.
