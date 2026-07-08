# Mapa genealogiczna

Statyczna mapa miejsc rodzinnych oparta o Leaflet i OpenStreetMap.

## Co jest w tej wersji

- osobny model danych dla osób i zdarzeń,
- obsługa urodzeń, ślubów i zgonów,
- filtry po typie zdarzenia, linii rodzinnej, latach i tekście,
- lista zdarzeń zsynchronizowana z mapą,
- grupowanie kilku zdarzeń z tej samej miejscowości w jednym markerze,
- pola na źródła, notatki i dokładniejsze daty.


## Uruchomienie lokalnie

Najprościej uruchomić mały serwer w katalogu projektu:

```bash
python -m http.server 8000
```

Potem otworzyć `http://localhost:8000`.

Na GitHub Pages projekt może działać bez budowania, bo to zwykłe pliki HTML, CSS, JS i JSON.
