console.log("SCRIPT DZIAŁA");

const map = L.map('map');

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

fetch('data/osoby.json')
    .then(response => response.json())
    .then(osoby => {

        console.log(osoby);

        const punkty = [];

        osoby.forEach(osoba => {

            const marker = L.marker([osoba.lat, osoba.lon])
                .addTo(map)
                .bindPopup(`
                    <b>${osoba.imie} ${osoba.nazwisko}</b><br>
                    ur. ${osoba.rok}<br>
                    📍 ${osoba.miejsce}<br><br>
                    ${osoba.opis}
                `);

            punkty.push([osoba.lat, osoba.lon]);

        });

        if (punkty.length > 0) {
            map.fitBounds(punkty, {
                padding: [40, 40]
            });
        } else {
            map.setView([52.0, 19.0], 6);
        }

    })
    .catch(error => {
        console.error("Błąd wczytywania danych:", error);
        map.setView([52.0, 19.0], 6);
    });
