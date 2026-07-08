const map = L.map('map').setView([52.0, 19.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

L.marker([52.4064, 16.9252])
    .addTo(map)
    .bindPopup("<b>Poznań</b><br>Przykładowy przodek");
