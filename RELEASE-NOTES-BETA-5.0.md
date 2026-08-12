# Beta 5.0 – Modular Content Engine

- A `content/project.json` mostantól csak manifest.
- A főoldal, közös adatok és saját témák külön JSON-fájlban vannak.
- Minden főmodul saját könyvtárat kapott.
- Minden aloldali tartalmi egység külön JSON-fájl.
- A modulok `index.json` fájljában a `sections` tömb sorrendje megegyezik az app navigációs sorrendjével.
- Az alkalmazás navigációja már ebből a manifestből épül fel, nem külön kézzel karbantartott JS-listából.
- A loader a moduláris fájlokat kompatibilis projektobjektummá fűzi össze.
- A Studio tartalomlistája modul- és aloldalsorrendben jelenik meg.
- A Beta 4.0 localStorage projektje automatikusan migrálható.
