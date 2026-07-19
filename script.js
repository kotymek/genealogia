const EVENT_LABELS = {
  birth: "urodzenie",
  marriage: "ślub",
  death: "zgon",
};

const EVENT_COLORS = {
  birth: "#237a57",
  marriage: "#7a4bc2",
  death: "#5c677d",
};

const map = L.map("map", {
  scrollWheelZoom: true,
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);
const state = {
  people: [],
  events: [],
  filters: {
    query: "",
    types: new Set(["birth", "marriage", "death"]),
    line: "",
    yearFrom: null,
    yearTo: null,
  },
};

const elements = {
  search: document.querySelector("#search"),
  typeFilters: document.querySelectorAll("input[name='type']"),
  lineFilter: document.querySelector("#line-filter"),
  yearFrom: document.querySelector("#year-from"),
  yearTo: document.querySelector("#year-to"),
  reset: document.querySelector("#reset"),
  events: document.querySelector("#events"),
  statEvents: document.querySelector("#stat-events"),
  statPeople: document.querySelector("#stat-people"),
  statPlaces: document.querySelector("#stat-places"),
};

fetch("data/genealogia.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Nie udało się wczytać danych: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    state.people = data.people || [];
    state.events = normalizeEvents(data.events || []);
    hydrateControls();
    attachListeners();
    render();
  })
  .catch((error) => {
    console.error(error);
    elements.events.innerHTML = `<p class="empty">Nie udało się wczytać danych mapy.</p>`;
    map.setView([52.0, 19.0], 6);
  });

function normalizeEvents(events) {
  return events
    .map((event) => ({
      ...event,
      year: Number(event.year || extractYear(event.date)),
      peopleDetails: (event.people || [])
        .map((id) => state.people.find((person) => person.id === id))
        .filter(Boolean),
    }))
    .sort((a, b) => (a.year || 9999) - (b.year || 9999));
}

function extractYear(date) {
  const match = String(date || "").match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function hydrateControls() {
  const years = state.events.map((event) => event.year).filter(Boolean);
  const lines = [...new Set(state.people.map((person) => person.line).filter(Boolean))].sort();

  if (years.length) {
    elements.yearFrom.value = Math.min(...years);
    elements.yearTo.value = Math.max(...years);
    state.filters.yearFrom = Number(elements.yearFrom.value);
    state.filters.yearTo = Number(elements.yearTo.value);
  }

  lines.forEach((line) => {
    const option = document.createElement("option");
    option.value = line;
    option.textContent = line;
    elements.lineFilter.append(option);
  });
}

function attachListeners() {
  elements.search.addEventListener("input", () => {
    state.filters.query = elements.search.value.trim().toLowerCase();
    render();
  });

  elements.typeFilters.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      state.filters.types = new Set(
        [...elements.typeFilters].filter((input) => input.checked).map((input) => input.value)
      );
      render();
    });
  });

  elements.lineFilter.addEventListener("change", () => {
    state.filters.line = elements.lineFilter.value;
    render();
  });

  [elements.yearFrom, elements.yearTo].forEach((input) => {
    input.addEventListener("input", () => {
      state.filters.yearFrom = elements.yearFrom.value ? Number(elements.yearFrom.value) : null;
      state.filters.yearTo = elements.yearTo.value ? Number(elements.yearTo.value) : null;
      render();
    });
  });

  elements.reset.addEventListener("click", resetFilters);
}

function resetFilters() {
  elements.search.value = "";
  elements.typeFilters.forEach((input) => {
    input.checked = true;
  });
  elements.lineFilter.value = "";

  const years = state.events.map((event) => event.year).filter(Boolean);
  elements.yearFrom.value = years.length ? Math.min(...years) : "";
  elements.yearTo.value = years.length ? Math.max(...years) : "";

  state.filters.query = "";
  state.filters.types = new Set(["birth", "marriage", "death"]);
  state.filters.line = "";
  state.filters.yearFrom = elements.yearFrom.value ? Number(elements.yearFrom.value) : null;
  state.filters.yearTo = elements.yearTo.value ? Number(elements.yearTo.value) : null;
  render();
}

function render() {
  const filtered = state.events.filter(matchesFilters);
  renderStats(filtered);
  renderMarkers(filtered);
  renderList(filtered);
}

function matchesFilters(event) {
  if (!state.filters.types.has(event.type)) return false;
  if (state.filters.yearFrom && event.year < state.filters.yearFrom) return false;
  if (state.filters.yearTo && event.year > state.filters.yearTo) return false;

  if (state.filters.line) {
    const hasLine = event.peopleDetails.some((person) => person.line === state.filters.line);
    if (!hasLine) return false;
  }

  if (state.filters.query) {
    const haystack = [
      event.place,
      event.note,
      event.source,
      ...event.peopleDetails.flatMap((person) => [person.givenName, person.surname, person.relation]),
    ]
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(state.filters.query)) return false;
  }

  return true;
}

function renderStats(events) {
  const people = new Set(events.flatMap((event) => event.people || []));
  const places = new Set(events.map(placeKey));

  elements.statEvents.textContent = events.length;
  elements.statPeople.textContent = people.size;
  elements.statPlaces.textContent = places.size;
}

function renderMarkers(events) {
  markerLayer.clearLayers();

  const grouped = events.reduce((groups, event) => {
    const key = placeKey(event);
    groups.set(key, [...(groups.get(key) || []), event]);
    return groups;
  }, new Map());

  const bounds = [];

  grouped.forEach((placeEvents) => {
    const first = placeEvents[0];
    const marker = L.circleMarker([first.lat, first.lon], {
      radius: Math.min(18, 8 + placeEvents.length * 1.5),
      weight: 2,
      color: "#ffffff",
      fillColor: placeEvents.length > 1 ? "#244c73" : EVENT_COLORS[first.type],
      fillOpacity: 0.92,
    }).addTo(markerLayer);

    marker.bindPopup(buildPopup(first.place, placeEvents), {
      maxWidth: 340,
    });
    bounds.push([first.lat, first.lon]);
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [45, 45], maxZoom: 11 });
  } else {
    map.setView([52.0, 19.0], 6);
  }
}

function buildPopup(place, events) {
  return `
    <article class="popup">
      <h3>${escapeHtml(place)}</h3>
      ${events.map((event) => `
        <div class="popup-event">
          <strong>${escapeHtml(formatEventTitle(event))}</strong>
          <span>${escapeHtml(formatPeople(event))}</span>
          ${event.note ? `<p>${escapeHtml(event.note)}</p>` : ""}
          ${event.source ? `<small>Źródło: ${escapeHtml(event.source)}</small>` : ""}
        </div>
      `).join("")}
    </article>
  `;
}

function renderList(events) {
  if (!events.length) {
    elements.events.innerHTML = `<p class="empty">Brak zdarzeń dla wybranych filtrów.</p>`;
    return;
  }

  elements.events.innerHTML = events
    .map((event) => `
      <button class="event-card" type="button" data-event-id="${event.id}">
        <span class="event-type ${event.type}">${EVENT_LABELS[event.type] || event.type}</span>
        <strong>${escapeHtml(formatPeople(event))}</strong>
        <span>${escapeHtml(event.year || "bez daty")} · ${escapeHtml(event.place)}</span>
      </button>
    `)
    .join("");

  elements.events.querySelectorAll(".event-card").forEach((card) => {
    card.addEventListener("click", () => {
      const event = state.events.find((item) => item.id === card.dataset.eventId);
      if (event) {
        map.setView([event.lat, event.lon], 11);
      }
    });
  });
}

function formatPeople(event) {
  return event.peopleDetails
    .map((person) => `${person.givenName} ${person.surname}`)
    .join(" i ");
}

function formatEventTitle(event) {
  const label = EVENT_LABELS[event.type] || event.type;
  return `${label}, ${event.date || event.year || "data nieznana"}`;
}

function placeKey(event) {
  return `${event.place}|${event.lat}|${event.lon}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const historicalLayers = {
  congressPoland: null,
  secondRepublic: null,
};

const historicalLayerConfig = {
  congressPoland: {
    url: "data/granice/krolestwo-polskie-1830.geojson",
    style: {
      color: "#b45309",
      weight: 2,
      fillColor: "#f59e0b",
      fillOpacity: 0.08,
      dashArray: "6 5",
    },
    popup: "Królestwo Polskie, ok. 1830",
  },
  secondRepublic: {
    url: "data/granice/ii-rp.geojson",
    style: {
      color: "#1d4ed8",
      weight: 2,
      fillColor: "#3b82f6",
      fillOpacity: 0.07,
    },
    popup: "II Rzeczpospolita",
  },
};

function toggleHistoricalLayer(key, enabled) {
  const config = historicalLayerConfig[key];

  if (!enabled) {
    if (historicalLayers[key]) {
      map.removeLayer(historicalLayers[key]);
    }
    return;
  }

  if (historicalLayers[key]) {
    historicalLayers[key].addTo(map);
    return;
  }

  fetch(config.url)
    .then((response) => response.json())
    .then((geojson) => {
      historicalLayers[key] = L.geoJSON(geojson, {
        style: config.style,
        onEachFeature: (feature, layer) => {
          const name =
            feature.properties?.name ||
            feature.properties?.nazwa ||
            feature.properties?.gubernia ||
            feature.properties?.wojewodztw ||
            config.popup;

          layer.bindPopup(name);
        },
      }).addTo(map);
    })
    .catch((error) => {
      console.error(`Nie udało się wczytać warstwy ${key}:`, error);
    });
}

document
  .querySelector("#toggle-congress-poland")
  .addEventListener("change", (event) => {
    toggleHistoricalLayer("congressPoland", event.target.checked);
  });

document
  .querySelector("#toggle-second-republic")
  .addEventListener("change", (event) => {
    toggleHistoricalLayer("secondRepublic", event.target.checked);
  });

