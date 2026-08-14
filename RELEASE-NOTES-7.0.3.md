# BETA 7.0.3 – Hierarchical Editor Panel

- A Pages CMS bal oldali fa után a jobb oldali szerkesztőpanel is vizuális hierarchiát kapott.
- A JSON-adatmodell nem változott: a fejlesztés kizárólag a `.pages.yml` szerkesztői megjelenését rendezi.
- Az `object`, listás `object` és block mezők fa-jelekkel és behúzással mutatják a szülő–gyerek kapcsolatot.
- Az ismételhető object/block listák alapból összecsukhatók; ahol lehet, a becsukott sor a címét/azonosítóját mutatja.
- A strukturális csoportok `CMS útvonal` súgót kaptak, így egy elemnél látszik, melyik modulból/aloldalból indul.
- A reusable tartalomblokkok szerkesztése is ugyanazt a vizuális logikát követi.
- Új `validate:cms-editor-tree` release gate védi a szerkesztői hierarchiát.
