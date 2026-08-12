# Útiterv Studio — BETA 1.1.8

## Dashboard interaction fix

- A **Fejlődésed** dashboard chevron ikonja most ugyanazt a kattintható felületet használja, mint a teljes fejléc.
- A chevron és a fejléc belső elemei nem fogják el külön a pointer eseményt, ezért az ikon közvetlen érintésére/kattintására is biztosan lenyílik és bezáródik a panel.
- A meglévő chevron-forgás és akadálymentes `aria-expanded` állapotkezelés változatlan maradt.
