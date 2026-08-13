# Útiterv BETA 5.1.2 – CMS ID validation fix

## Javítások

- A Pages CMS dinamikus aloldalainak `Technikai azonosító` mezője már mentés előtt ellenőrzi a slug formátumot.
- Engedélyezett karakterek: `a-z`, `0-9`, `-`.
- A mező 2–80 karakter hosszú lehet, és egyértelmű szerkesztői hibaüzenetet ad nagybetű, szóköz, ékezet vagy `_` használatakor.
- A build-time tartalomvalidátor ugyanazt a szabályt tartja meg második védelmi vonalként.
- GitHub Actions futáskor a validátor most natív GitHub `error`/`warning` annotációkat ír ki, ezért a hibás `content/...json` fájl közvetlenül látszik a run felületén; nem tűnik úgy, mintha maga a `content-validation.yml` lenne hibás.
- A GitHub Actions workflow továbbra is `actions/checkout@v7`, `actions/setup-node@v7` és Node.js 24 kombinációt használ.
