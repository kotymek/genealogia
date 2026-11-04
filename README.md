# Atlas rodzinny — Miejsca, z których jesteśmy

Statyczny atlas genealogiczny: mapa, wyszukiwarka osób i miejsc, chronologia, karty osób i rodzin oraz granice historyczne. HTML, CSS, JavaScript i lokalnie dołączony Leaflet 1.9.4; bez procesu instalacji i bez analityki.

## Wersja publiczna

Publikowany zbiór to **wyłącznie dotychczasowe `data/genealogia.json`**. Nowy pełny GEDCOM i dostarczone prywatnie dane nie są częścią repozytorium. Dane nie są chronione przez ukrywanie elementów interfejsu — nie są w ogóle dołączane do publicznego pakietu.

Po zatwierdzonej zmianie publicznego JSON-a uruchom:

```sh
node tools/build-public.cjs
node tools/test.cjs
```

`data/atlas-data.js` jest generowaną kopią tego JSON-a. Dzięki niej katalog może działać także przy otwieraniu lokalnego `index.html`. Podkład mapy wymaga internetu oraz uruchomienia przez HTTP; w trybie file:// jest wyłączony. GitHub Pages nadal publikuje stronę z głównego katalogu repozytorium.

## Pełna kopia lokalna

```sh
node tools/build-private.cjs /sciezka/drzewo.ged /sciezka/miejsca.json /katalog/poza/repozytorium
```

Katalog docelowy **musi znajdować się poza repozytorium**. Uruchom `URUCHOM-ATLAS.cmd` (Windows, wymaga Node.js) lub `node start-atlas.cjs` i otwórz wyświetlony adres lokalny. Serwer nasłuchuje tylko na 127.0.0.1. Drzewo pozostaje na komputerze; jedyne zewnętrzne żądania aplikacji to kafelki mapy. Pełnej kopii nie należy publikować w GitHub Pages ani kopiować do repozytorium. Nie jest to serwis z logowaniem.

Importer zachowuje identyfikatory osób, relacje rodzinne, daty przybliżone i nieznane, źródła oraz notatki. Zdjęcia są pomijane. Współrzędne są kojarzone po identyfikatorze miejsca lub dokładnej nazwie (bez rozróżniania wielkości liter), nie po identyfikatorach wydarzeń ze starszego eksportu. Braki współrzędnych pozostają brakami — nigdy punktem 0,0. Kopia lokalna zawiera raport i listę miejsc do uzupełnienia.

## Korzystanie

- Wyszukiwanie obsługuje polskie znaki i ich zapis bez znaków diakrytycznych.
- Filtry: typ wydarzenia, linia rodzinna (jeśli dostępna w zbiorze), lata, nieznane daty i lokalizacja.
- Mapa grupuje sąsiednie punkty; liczby oznaczają wydarzenia, a kliknięcie grupy przybliża jej zasięg.
- Karta osoby zawiera znane wydarzenia i powiązania. W publicznym zbiorze bez rekordów rodzin pokazujemy tylko powiązania wynikające ze wspólnych ślubów.
- Oś czasu pozwala wybrać dekadę. Pole „Uwzględnij nieznane daty” pozwala ponownie włączyć niedatowane wydarzenia.
- Przycisk „Połącz miejsca życia” łączy datowane wydarzenia danej osoby; nie przedstawia rzeczywistej trasy podróży.
- Skróty: `/` — wyszukiwanie; `Escape` — zamknięcie szczegółów. Widoki i filtry mają odnośniki w adresie strony.

Współrzędne i informacje genealogiczne wymagają weryfikacji źródłowej. Nie stosujemy domysłów dotyczących miejsc, dat lub pokrewieństwa. Importer obsługuje zakres występujący w otrzymanym eksporcie, nie każdy wariant GEDCOM; oryginały należy zachować.

## Biblioteki i mapa

Leaflet 1.9.4 (BSD-2-Clause, `vendor/leaflet/LICENSE`). Podkład: © OpenStreetMap contributors. Zachowano istniejące warstwy historyczne; ich granice mają charakter orientacyjny.
