# Granice historyczne

W tym katalogu powinny leżeć prawdziwe pliki GeoJSON:

- `krolestwo-polskie-1830.geojson`
- `ii-rp.geojson`

Samo wpisanie tych nazw w pliku albo katalogu nie wystarczy. Każdy z tych plików musi zawierać poprawny GeoJSON, najlepiej w formacie `FeatureCollection`.

Minimalny, pusty GeoJSON wygląda tak:

```json
{
  "type": "FeatureCollection",
  "features": []
}
```

Taki pusty plik sprawi, że aplikacja nie pokaże błędu 404, ale nadal nie narysuje granic. Do rysowania mapy potrzebne są prawdziwe geometrie polygonów.

Przykładowe źródła:

- Królestwo Polskie: Atlas Fontium / IH PAN, warstwy Królestwa Polskiego z 1816, 1830 albo 1867 roku.
- II Rzeczpospolita: warstwa ArcGIS `Granice II Rzeczpospolitej`, eksportowana jako GeoJSON.
