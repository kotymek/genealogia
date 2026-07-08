console.log("SCRIPT DZIAŁA");
const map = L.map('map').setView([52.0, 19.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

fetch('data/osoby.json')
    .then(response => response.json())
    .then(osoby => {

         console.log(osoby);
        osoby.forEach(osoba => {

            L.marker([osoba.lat, osoba.lon])
                .addTo(map)
                .bindPopup(`
                    <b>${osoba.imie} ${osoba.nazwisko}</b><br>
                    ur. ${osoba.rok}<br>
                    📍 ${osoba.miejsce}<br><br>
                    ${osoba.opis}
                `);

        });

    });
