# Mapa genealogiczna rodziny

Statyczna mapa miejsc rodzinnych oparta o Leaflet i OpenStreetMap.

## Co jest w tej wersji

- osobny model danych dla osób i zdarzeń,
- obsługa urodzeń, ślubów i zgonów,
- filtry po typie zdarzenia, linii rodzinnej, latach i tekście,
- lista zdarzeń zsynchronizowana z mapą,
- grupowanie kilku zdarzeń z tej samej miejscowości w jednym markerze,
- pola na źródła, notatki i dokładniejsze daty.

## Jak dodać osobę

W pliku `data/genealogia.json` dopisz wpis do tablicy `people`:

```json
{
  "id": "anna-nowak-1888",
  "givenName": "Anna",
  "surname": "Nowak",
  "relation": "praprababcia",
  "line": "Nowak"
}
```

`id` powinno być krótkie, unikalne i bez polskich znaków. Najwygodniej używać schematu `imie-nazwisko-rok`.

## Jak dodać urodzenie, ślub albo zgon

W tej samej tabeli dopisz wpis do `events`.

Urodzenie:

```json
{
  "id": "birth-anna-nowak-1888",
  "type": "birth",
  "year": 1888,
  "date": "1888-04-12",
  "place": "Przykładowo",
  "lat": 52.1234,
  "lon": 18.1234,
  "people": ["anna-nowak-1888"],
  "note": "Miejsce urodzenia",
  "source": "akt urodzenia nr ..."
}
```

Ślub:

```json
{
  "id": "marriage-jan-kowalski-anna-nowak-1910",
  "type": "marriage",
  "year": 1910,
  "date": "1910",
  "place": "Przykładowo",
  "lat": 52.1234,
  "lon": 18.1234,
  "people": ["jan-kowalski-1885", "anna-nowak-1888"],
  "note": "Miejsce ślubu",
  "source": "akt małżeństwa nr ..."
}
```

Zgon:

```json
{
  "id": "death-anna-nowak-1951",
  "type": "death",
  "year": 1951,
  "date": "1951",
  "place": "Przykładowo",
  "lat": 52.1234,
  "lon": 18.1234,
  "people": ["anna-nowak-1888"],
  "note": "Miejsce zgonu",
  "source": "akt zgonu nr ..."
}
```

## Uruchomienie lokalnie

Najprościej uruchomić mały serwer w katalogu projektu:

```bash
python -m http.server 8000
```

Potem otworzyć `http://localhost:8000`.

Na GitHub Pages projekt może działać bez budowania, bo to zwykłe pliki HTML, CSS, JS i JSON.
