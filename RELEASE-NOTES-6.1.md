# BETA 6.1 – Element Style Control & CMS Order

## Mi változott?

- A Pages CMS tartalomlista sorrendje most: App beállításai → Quit & Go → Quick Win → Win-Win → Galaxy Guide → Többi.
- Minden CMS-ből hozzáadható tartalomblokk kapott biztonságos `stylePreset` mezőt.
- Minden tartalomblokk kapott opcionális `customClass` mezőt.
- Az oldalak és beágyazott belső oldalak is kaphatnak opcionális `customClass` értéket.
- A `customClass` csak kisbetűt, számot és kötőjelet enged, és kisbetűvel kell kezdődnie.
- A runtime csak engedélyezett presetet és valid custom class-t tesz a DOM-ba.
- A GitHub tartalomvalidátor ugyanezeket a szabályokat ellenőrzi deploy előtt.

## Elem presetek

`default`, `card`, `highlight`, `minimal`, `dark`, `module`, `wide`, `compact`, `outline`, `soft`

## Egyedi CSS példa

A CMS-ben:

`customClass: szakacs-hero`

A CSS-ben:

```css
.szakacs-hero {
  /* csak az adott elem egyedi megjelenése */
}
```

A CMS nem fogad el nyers CSS-t, csak biztonságos class-nevet.
