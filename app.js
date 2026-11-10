/*
 * app.js – LG B1 77" OLED Command Center
 * Focused exclusively on:
 *   1. Local Weather Station via async fetchWeather(lat, lon) & location-synced clock (fixes TV GMT/UTC-1h offset)
 *   2. Dynamic Grid of App & External Device Shortcuts (YouTube, Disney+, Prime Video, Crunchyroll, Netflix, HDMI 2, USB 1, USB 2)
 *   3. On-Screen Customization Modal Overlay (check/uncheck apps, enter new city/lat/lon via TV on-screen keyboard, persist to localStorage)
 */
(function () {
  "use strict";

  var APPS_STORAGE_KEY = "tv_apps";
  var APPS_SCHEMA_KEY = "tv_apps_schema_v3";
  var COORDS_STORAGE_KEY = "tv_coords";
  var PREFS_STORAGE_KEY = "tv_prefs_v3";

  // Default apps & external device inputs (HDMI 2, USB 1, USB 2 — no HDMI 1/3/4)
  const defaultApps = [
    { key: "youtube", name: "YouTube", id: "youtube.leanback.v4", icon: "youtube-icon.png", sub: "4K HDR · 🔴 Red Key", active: true },
    { key: "disney", name: "Disney+", id: "com.disney.disneyplus-prod", icon: "disney-icon.png", sub: "4K UHD · Dolby Vision", active: true },
    { key: "prime", name: "Prime Video", id: "amazon", icon: "prime-icon.png", sub: "UHD · HDR10+", active: true },
    { key: "crunchyroll", name: "Crunchyroll", id: "crunchyroll", icon: "crunchyroll-icon.png", sub: "Anime Streaming", active: true },
    { key: "netflix", name: "Netflix", id: "netflix", icon: "netflix-icon.png", sub: "Dolby Vision · Atmos", active: true },
    { key: "hdmi2", name: "HDMI 2", id: "com.webos.app.hdmi2", icon: "hdmi-icon.png", sub: "External Device · 🔵 Blue Key", active: true },
    { key: "usb1", name: "USB 1", id: "com.webos.app.photovideo", params: { deviceId: "usb1", port: 1 }, icon: "usb-icon.png", sub: "USB Port 1 · Media & Files", active: true },
    { key: "usb2", name: "USB 2", id: "com.webos.app.photovideo", params: { deviceId: "usb2", port: 2 }, icon: "usb-icon.png", sub: "USB Port 2 · External Drive", active: true },
    { key: "livetv", name: "Live TV", id: "com.webos.app.livetv", icon: "tv-icon.png", sub: "Antenna / Cable Tuner", active: false },
    { key: "browser", name: "Web Browser", id: "com.webos.app.browser", icon: "browser-icon.png", sub: "LG webOS 6.0 Browser", active: false }
  ];

  let userApps = defaultApps.map(function (a) { return Object.assign({}, a); });

  var CITIES = [
    {
      name: "Berlin, DE",
      lat: 52.5200,
      lon: 13.4050,
      utcOffsetSeconds: 3600,
      tempC: 21,
      hiC: 23,
      loC: 14,
      precipMm: 0.0,
      humidity: 46,
      windKmh: 14,
      cond: "Partly Cloudy",
      icon: "🌤",
      forecast: [
        { day: "Tue", icon: "☀️", hiC: 24, loC: 14 },
        { day: "Wed", icon: "⛅", hiC: 22, loC: 13 },
        { day: "Thu", icon: "🌦", hiC: 19, loC: 11 },
        { day: "Fri", icon: "☀️", hiC: 23, loC: 13 }
      ]
    },
    {
      name: "Munich, DE",
      lat: 48.1351,
      lon: 11.5820,
      utcOffsetSeconds: 3600,
      tempC: 19,
      hiC: 21,
      loC: 11,
      precipMm: 0.0,
      humidity: 42,
      windKmh: 11,
      cond: "Clear Sky",
      icon: "☀️",
      forecast: [
        { day: "Tue", icon: "☀️", hiC: 22, loC: 12 },
        { day: "Wed", icon: "🌤", hiC: 20, loC: 11 },
        { day: "Thu", icon: "⛅", hiC: 18, loC: 10 },
        { day: "Fri", icon: "☀️", hiC: 21, loC: 11 }
      ]
    },
    {
      name: "London, UK",
      lat: 51.5074,
      lon: -0.1278,
      utcOffsetSeconds: 0,
      tempC: 17,
      hiC: 19,
      loC: 12,
      precipMm: 0.4,
      humidity: 64,
      windKmh: 19,
      cond: "Light Breeze",
      icon: "⛅",
      forecast: [
        { day: "Tue", icon: "🌦", hiC: 18, loC: 11 },
        { day: "Wed", icon: "⛅", hiC: 19, loC: 12 },
        { day: "Thu", icon: "🌤", hiC: 20, loC: 13 },
        { day: "Fri", icon: "⛅", hiC: 18, loC: 11 }
      ]
    },
    {
      name: "New York, US",
      lat: 40.7128,
      lon: -74.0060,
      utcOffsetSeconds: -18000,
      tempC: 23,
      hiC: 26,
      loC: 17,
      precipMm: 0.0,
      humidity: 52,
      windKmh: 16,
      cond: "Sunny & Mild",
      icon: "☀️",
      forecast: [
        { day: "Tue", icon: "☀️", hiC: 27, loC: 18 },
        { day: "Wed", icon: "🌤", hiC: 25, loC: 17 },
        { day: "Thu", icon: "⛈", hiC: 22, loC: 15 },
        { day: "Fri", icon: "☀️", hiC: 24, loC: 16 }
      ]
    },
    {
      name: "Tokyo, JP",
      lat: 35.6762,
      lon: 139.6503,
      utcOffsetSeconds: 32400,
      tempC: 24,
      hiC: 26,
      loC: 18,
      precipMm: 0.0,
      humidity: 50,
      windKmh: 12,
      cond: "Clear Sky",
      icon: "☀️",
      forecast: [
        { day: "Tue", icon: "☀️", hiC: 26, loC: 18 },
        { day: "Wed", icon: "🌤", hiC: 25, loC: 17 },
        { day: "Thu", icon: "☀️", hiC: 27, loC: 19 },
        { day: "Fri", icon: "⛅", hiC: 23, loC: 16 }
      ]
    }
  ];

  var ACCENT_THEMES = {
    cyan: { accent: "#38bdf8", glow: "rgba(56, 189, 248, 0.48)" },
    emerald: { accent: "#4ade80", glow: "rgba(74, 222, 128, 0.48)" },
    violet: { accent: "#a78bfa", glow: "rgba(167, 139, 250, 0.48)" },
    amber: { accent: "#fbbf24", glow: "rgba(251, 191, 36, 0.48)" }
  };

  var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Stored city coordinates & timezone offset (defaults to UTC+1 / 3600s for CET)
  var userCoords = {
    cityIdx: 0,
    useCustomCoords: false,
    name: CITIES[0].name,
    lat: CITIES[0].lat,
    lon: CITIES[0].lon,
    utcOffsetSeconds: 3600,
    unit: "C"
  };

  var prefs = {
    accent: "cyan",
    oledPureBlack: false,
    pixelShift: true,
    use24h: true
  };

  var IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  var idleTimer = null;

  var weatherState = {
    name: CITIES[0].name,
    lat: CITIES[0].lat,
    lon: CITIES[0].lon,
    tempC: CITIES[0].tempC,
    hiC: CITIES[0].hiC,
    loC: CITIES[0].loC,
    precipMm: CITIES[0].precipMm,
    humidity: CITIES[0].humidity,
    windKmh: CITIES[0].windKmh,
    cond: CITIES[0].cond,
    icon: CITIES[0].icon,
    forecast: CITIES[0].forecast.slice()
  };

  var isModalOpen = false;
  var lastActionTime = 0;
  var lastWheelTime = 0;
  var pixelShiftStep = 0;
  var pixelShiftOffsets = [
    "translate(0px, 0px)",
    "translate(2px, 1px)",
    "translate(0px, 2px)",
    "translate(-2px, 1px)",
    "translate(-2px, -1px)",
    "translate(0px, -2px)",
    "translate(2px, -1px)"
  ];

  function syncWeatherStateFromCoords() {
    if (userCoords.useCustomCoords) {
      weatherState.name = userCoords.name || "Custom Location";
      weatherState.lat = userCoords.lat;
      weatherState.lon = userCoords.lon;
    } else {
      var city = CITIES[userCoords.cityIdx] || CITIES[0];
      userCoords.name = city.name;
      userCoords.lat = city.lat;
      userCoords.lon = city.lon;
      userCoords.utcOffsetSeconds = city.utcOffsetSeconds;
      weatherState.name = city.name;
      weatherState.lat = city.lat;
      weatherState.lon = city.lon;
      weatherState.tempC = city.tempC;
      weatherState.hiC = city.hiC;
      weatherState.loC = city.loC;
      weatherState.precipMm = city.precipMm;
      weatherState.humidity = city.humidity;
      weatherState.windKmh = city.windKmh;
      weatherState.cond = city.cond;
      weatherState.icon = city.icon;
      weatherState.forecast = city.forecast.slice();
    }
  }

  function loadStorage() {
    // 1. Load active apps from localStorage ('tv_apps'), migrating old HDMI 1/3/4 schema to HDMI 2 + USB 1 + USB 2
    try {
      var schemaVer = localStorage.getItem(APPS_SCHEMA_KEY);
      var savedApps = JSON.parse(localStorage.getItem(APPS_STORAGE_KEY));
      if (schemaVer === "3" && Array.isArray(savedApps) && savedApps.length > 0) {
        userApps = savedApps.map(function (item, idx) {
          return {
            key: item.key || (item.id + "_" + idx),
            name: item.name || item.title || item.id,
            id: item.id || "youtube.leanback.v4",
            params: item.params || null,
            icon: item.icon || "hdmi-icon.png",
            sub: item.sub || ("App ID: " + (item.id || "")),
            active: typeof item.active === "boolean" ? item.active : true
          };
        });
      } else {
        userApps = defaultApps.map(function (a) { return Object.assign({}, a); });
        localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(userApps));
        localStorage.setItem(APPS_SCHEMA_KEY, "3");
      }
    } catch (e) {
      userApps = defaultApps.map(function (a) { return Object.assign({}, a); });
    }

    // 2. Load city coordinates from localStorage ('tv_coords')
    try {
      var savedCoords = JSON.parse(localStorage.getItem(COORDS_STORAGE_KEY));
      if (savedCoords && typeof savedCoords === "object") {
        if (typeof savedCoords.cityIdx === "number" && CITIES[savedCoords.cityIdx]) {
          userCoords.cityIdx = savedCoords.cityIdx;
        }
        if (typeof savedCoords.useCustomCoords === "boolean") {
          userCoords.useCustomCoords = savedCoords.useCustomCoords;
        }
        if (typeof savedCoords.lat === "number" && !isNaN(savedCoords.lat)) {
          userCoords.lat = savedCoords.lat;
        }
        if (typeof savedCoords.lon === "number" && !isNaN(savedCoords.lon)) {
          userCoords.lon = savedCoords.lon;
        }
        if (typeof savedCoords.utcOffsetSeconds === "number" && !isNaN(savedCoords.utcOffsetSeconds)) {
          userCoords.utcOffsetSeconds = savedCoords.utcOffsetSeconds;
        }
        if (typeof savedCoords.name === "string" && savedCoords.name) {
          userCoords.name = savedCoords.name;
        }
        if (savedCoords.unit === "C" || savedCoords.unit === "F") {
          userCoords.unit = savedCoords.unit;
        }
      } else {
        localStorage.setItem(COORDS_STORAGE_KEY, JSON.stringify(userCoords));
      }
    } catch (e) {}

    // 3. Load display preferences from localStorage ('tv_prefs_v3')
    try {
      var savedPrefs = JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY));
      if (savedPrefs && typeof savedPrefs === "object") {
        if (savedPrefs.accent && ACCENT_THEMES[savedPrefs.accent]) prefs.accent = savedPrefs.accent;
        if (typeof savedPrefs.oledPureBlack === "boolean") prefs.oledPureBlack = savedPrefs.oledPureBlack;
        if (typeof savedPrefs.pixelShift === "boolean") prefs.pixelShift = savedPrefs.pixelShift;
        if (typeof savedPrefs.use24h === "boolean") prefs.use24h = savedPrefs.use24h;
      }
    } catch (e) {}

    syncWeatherStateFromCoords();
  }

  function saveApps() {
    try {
      localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(userApps));
      localStorage.setItem(APPS_SCHEMA_KEY, "3");
    } catch (e) {}
  }

  function saveCoords() {
    try {
      localStorage.setItem(COORDS_STORAGE_KEY, JSON.stringify(userCoords));
    } catch (e) {}
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  function showToast(msg) {
    var toast = document.getElementById("statusToast");
    if (toast) toast.textContent = msg;
  }

  function setRemoteBadge(text) {
    var badge = document.getElementById("remoteModeBadge");
    if (badge) badge.textContent = text;
  }

  function formatTemp(tempC) {
    if (userCoords.unit === "F") {
      return Math.round(tempC * 9 / 5 + 32) + "°F";
    }
    return Math.round(tempC) + "°C";
  }

  function formatShortTemp(tempC) {
    if (userCoords.unit === "F") {
      return Math.round(tempC * 9 / 5 + 32) + "°";
    }
    return Math.round(tempC) + "°";
  }

  function mapWmoCode(code, isDay) {
    var night = isDay === 0 || isDay === false;
    if (code === 0) return { cond: night ? "Clear Night" : "Clear Sky", icon: night ? "🌙" : "☀️" };
    if (code === 1 || code === 2) return { cond: "Partly Cloudy", icon: night ? "☁️" : "🌤" };
    if (code === 3) return { cond: "Overcast", icon: "☁️" };
    if (code >= 45 && code <= 48) return { cond: "Misty Fog", icon: "🌫" };
    if (code >= 51 && code <= 57) return { cond: "Light Drizzle", icon: "🌦" };
    if (code >= 61 && code <= 67) return { cond: "Rainfall", icon: "🌧" };
    if (code >= 71 && code <= 77) return { cond: "Snowfall", icon: "❄️" };
    if (code >= 80 && code <= 82) return { cond: "Rain Showers", icon: "🌧" };
    if (code >= 85 && code <= 86) return { cond: "Snow Showers", icon: "🌨" };
    if (code >= 95) return { cond: "Thunderstorm", icon: "⛈" };
    return { cond: "Partly Cloudy", icon: "🌤" };
  }

  function renderWeather() {
    var tempEl = document.getElementById("weather-temp");
    var iconEl = document.getElementById("weatherIcon");
    var cityEl = document.getElementById("weatherCity");
    var condEl = document.getElementById("weatherCond");
    var coordsEl = document.getElementById("weatherCoords");
    var windEl = document.getElementById("weatherWind");
    var precipEl = document.getElementById("weatherPrecip");
    var hiLoEl = document.getElementById("weatherHiLo");
    var humEl = document.getElementById("weatherHumidity");

    if (tempEl) tempEl.innerText = formatTemp(weatherState.tempC);
    if (iconEl) iconEl.textContent = weatherState.icon;
    if (cityEl) cityEl.textContent = weatherState.name;
    if (condEl) condEl.textContent = weatherState.cond;
    if (coordsEl) {
      coordsEl.textContent =
        "Lat " + Number(weatherState.lat).toFixed(4) + "° · Lon " + Number(weatherState.lon).toFixed(4) + "°";
    }
    if (windEl) windEl.textContent = Math.round(weatherState.windKmh) + " km/h";
    if (precipEl) precipEl.textContent = Number(weatherState.precipMm).toFixed(1) + " mm";
    if (hiLoEl) hiLoEl.textContent = formatShortTemp(weatherState.hiC) + " / " + formatShortTemp(weatherState.loC);
    if (humEl) humEl.textContent = Math.round(weatherState.humidity) + "%";

    var strip = document.getElementById("forecastStrip");
    if (strip) {
      strip.innerHTML = "";
      weatherState.forecast.slice(0, 4).forEach(function (fc) {
        var card = document.createElement("div");
        card.className = "forecast-day focusable";
        card.setAttribute("tabindex", "0");
        card.setAttribute("data-action", "refresh-weather");
        card.innerHTML =
          '<span class="fc-name">' + fc.day + "</span>" +
          '<span class="fc-icon">' + fc.icon + "</span>" +
          '<span class="fc-temp">' + formatShortTemp(fc.hiC) + " / " + formatShortTemp(fc.loC) + "</span>";
        bindInteractiveElement(card);
        strip.appendChild(card);
      });
    }
  }

  // Fetch current temperature, wind speed, precipitation, conditions, and exact local timezone offset
  async function fetchWeather(lat, lon, customLocationLabel) {
    var targetLat = typeof lat === "number" && !isNaN(lat) ? lat : weatherState.lat;
    var targetLon = typeof lon === "number" && !isNaN(lon) ? lon : weatherState.lon;
    weatherState.lat = targetLat;
    weatherState.lon = targetLon;
    if (customLocationLabel) {
      weatherState.name = customLocationLabel;
    }

    var pill = document.getElementById("weatherSourcePill");
    var url =
      `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}` +
      `&current_weather=true` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&timezone=auto`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();

      // Sync exact timezone offset (in seconds) for this location so the TV clock is never 1 hour behind
      if (typeof data.utc_offset_seconds === "number") {
        userCoords.utcOffsetSeconds = data.utc_offset_seconds;
        saveCoords();
        updateClock();
      }

      if (data.current_weather) {
        weatherState.tempC = data.current_weather.temperature;
        weatherState.windKmh = data.current_weather.windspeed;
        var mapped = mapWmoCode(data.current_weather.weathercode, data.current_weather.is_day);
        weatherState.cond = mapped.cond;
        weatherState.icon = mapped.icon;

        var tempEl = document.getElementById("weather-temp");
        if (tempEl) {
          tempEl.innerText = formatTemp(data.current_weather.temperature);
        }
      }

      if (data.current) {
        if (typeof data.current.precipitation === "number") {
          weatherState.precipMm = data.current.precipitation;
        }
        if (typeof data.current.relative_humidity_2m === "number") {
          weatherState.humidity = data.current.relative_humidity_2m;
        }
        if (typeof data.current.wind_speed_10m === "number") {
          weatherState.windKmh = data.current.wind_speed_10m;
        }
      }

      if (data.daily && data.daily.temperature_2m_max && data.daily.temperature_2m_max.length > 0) {
        weatherState.hiC = data.daily.temperature_2m_max[0];
        weatherState.loC = data.daily.temperature_2m_min[0];
        if (typeof weatherState.precipMm !== "number" && data.daily.precipitation_sum) {
          weatherState.precipMm = data.daily.precipitation_sum[0] || 0;
        }

        var nextForecast = [];
        for (var i = 1; i <= 4 && i < data.daily.temperature_2m_max.length; i++) {
          var dateStr = data.daily.time && data.daily.time[i];
          var dObj = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
          var dayName = DAY_NAMES[dObj.getDay()] || ("Day " + i);
          var fcCode = data.daily.weather_code ? data.daily.weather_code[i] : 1;
          var fcMapped = mapWmoCode(fcCode, 1);
          nextForecast.push({
            day: dayName,
            icon: fcMapped.icon,
            hiC: data.daily.temperature_2m_max[i],
            loC: data.daily.temperature_2m_min[i]
          });
        }
        if (nextForecast.length > 0) {
          weatherState.forecast = nextForecast;
        }
      }

      if (pill) pill.textContent = "OPEN-METEO LIVE";
      renderWeather();
      return data;
    } catch (err) {
      if (pill) pill.textContent = "CACHED STATION";
      renderWeather();
      return null;
    }
  }

  window.fetchWeather = fetchWeather;

  async function saveCustomLocationInputs() {
    var cityIn = document.getElementById("customCityInput");
    var latIn = document.getElementById("customLatInput");
    var lonIn = document.getElementById("customLonInput");

    var enteredCity = cityIn && cityIn.value ? cityIn.value.trim() : "";
    var rawLat = latIn && latIn.value ? latIn.value.trim() : "";
    var rawLon = lonIn && lonIn.value ? lonIn.value.trim() : "";
    var parsedLat = parseFloat(rawLat);
    var parsedLon = parseFloat(rawLon);

    var cityChanged = enteredCity && enteredCity.toLowerCase() !== (weatherState.name || "").toLowerCase();
    var coordsUnchanged =
      !isNaN(parsedLat) &&
      !isNaN(parsedLon) &&
      Math.abs(parsedLat - Number(weatherState.lat)) < 0.0002 &&
      Math.abs(parsedLon - Number(weatherState.lon)) < 0.0002;

    if (enteredCity && (isNaN(parsedLat) || isNaN(parsedLon) || (cityChanged && coordsUnchanged))) {
      showToast("Looking up coordinates for " + enteredCity + "...");
      try {
        var geoUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(enteredCity) + "&count=1&language=en&format=json";
        var res = await fetch(geoUrl);
        if (res.ok) {
          var geoData = await res.json();
          if (geoData && geoData.results && geoData.results.length > 0) {
            var match = geoData.results[0];
            parsedLat = Number(Number(match.latitude).toFixed(4));
            parsedLon = Number(Number(match.longitude).toFixed(4));
            enteredCity = match.name + (match.country_code ? ", " + match.country_code : "");
          }
        }
      } catch (e) {}
    }

    if (!isNaN(parsedLat) && !isNaN(parsedLon) && parsedLat >= -90 && parsedLat <= 90 && parsedLon >= -180 && parsedLon <= 180) {
      userCoords.useCustomCoords = true;
      userCoords.lat = Number(parsedLat.toFixed(4));
      userCoords.lon = Number(parsedLon.toFixed(4));
      userCoords.name = enteredCity || ("Lat " + userCoords.lat + "°, Lon " + userCoords.lon + "°");
      saveCoords();
      syncWeatherStateFromCoords();
      renderWeather();
      renderModalState();
      await fetchWeather(userCoords.lat, userCoords.lon, userCoords.name);
      showToast("Saved location: " + userCoords.name + " (" + userCoords.lat + "°, " + userCoords.lon + "°)");
      return true;
    } else {
      showToast("Enter a valid City Name or Latitude (-90..90) & Longitude (-180..180)");
      return false;
    }
  }

  async function detectExactLocation() {
    showToast("Detecting exact latitude & longitude...");

    var applyDetected = function (lat, lon, label) {
      userCoords.useCustomCoords = true;
      userCoords.lat = Number(Number(lat).toFixed(4));
      userCoords.lon = Number(Number(lon).toFixed(4));
      userCoords.name = label || ("Lat " + userCoords.lat + "°, Lon " + userCoords.lon + "°");
      saveCoords();
      syncWeatherStateFromCoords();
      renderWeather();
      renderModalState();
      fetchWeather(userCoords.lat, userCoords.lon, userCoords.name);
      showToast("Synced location & local time: " + userCoords.name);
    };

    try {
      const res = await fetch("https://get.geojs.io/v1/ip/geo.json");
      if (res.ok) {
        const geo = await res.json();
        if (geo && geo.latitude && geo.longitude) {
          var cityLabel = geo.city
            ? (geo.city + (geo.country_code ? ", " + geo.country_code : ""))
            : "Detected Location";
          applyDetected(parseFloat(geo.latitude), parseFloat(geo.longitude), cityLabel);
          return;
        }
      }
    } catch (e) {}

    if (navigator.geolocation && navigator.geolocation.getCurrentPosition) {
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          applyDetected(pos.coords.latitude, pos.coords.longitude, "GPS Coordinates");
        },
        function () {
          showToast("Location detection unavailable – enter City or Lat/Lon above");
        },
        { timeout: 5000 }
      );
    } else {
      showToast("Enter your City or Latitude & Longitude in the fields above");
    }
  }

  // Build dynamic grid of shortcuts from userApps (stored in localStorage 'tv_apps')
  function renderLaunchers() {
    var grid = document.getElementById("launcherGrid");
    if (!grid) return;
    grid.innerHTML = "";

    var visibleList = userApps.filter(function (app) {
      return app.active !== false;
    });

    if (visibleList.length === 0 && userApps.length > 0) {
      userApps[0].active = true;
      saveApps();
      visibleList = [userApps[0]];
    }

    visibleList.forEach(function (app) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "app-tile focusable";
      btn.setAttribute("tabindex", "0");
      btn.setAttribute("data-action", "launch-app");
      btn.setAttribute("data-app-id", app.id);
      btn.setAttribute("data-app-title", app.name);
      if (app.params) {
        btn.setAttribute("data-app-params", JSON.stringify(app.params));
      }

      var iconFile = app.icon || "hdmi-icon.png";
      var subText = app.sub || app.id;
      btn.innerHTML =
        '<img src="' + iconFile + '" alt="' + app.name + '" class="tile-icon" onerror="this.src=\'hdmi-icon.png\'" />' +
        '<span class="tile-title">' + app.name + "</span>" +
        '<span class="tile-sub">' + subText + "</span>";
      bindInteractiveElement(btn);
      grid.appendChild(btn);
    });
  }

  function renderModalState() {
    var cityBtns = document.querySelectorAll('[data-action="set-city"]');
    Array.prototype.forEach.call(cityBtns, function (btn) {
      var idx = parseInt(btn.getAttribute("data-city-idx"), 10);
      if (!userCoords.useCustomCoords && idx === userCoords.cityIdx) {
        btn.classList.add("active-opt");
      } else {
        btn.classList.remove("active-opt");
      }
    });

    var cityInput = document.getElementById("customCityInput");
    var latInput = document.getElementById("customLatInput");
    var lonInput = document.getElementById("customLonInput");
    if (cityInput && document.activeElement !== cityInput) {
      cityInput.value = weatherState.name || "";
    }
    if (latInput && document.activeElement !== latInput) {
      latInput.value = Number(weatherState.lat).toFixed(4);
    }
    if (lonInput && document.activeElement !== lonInput) {
      lonInput.value = Number(weatherState.lon).toFixed(4);
    }

    var unitBtn = document.getElementById("unitToggleBtn");
    if (unitBtn) {
      unitBtn.textContent = "Unit: °" + userCoords.unit;
      unitBtn.classList.add("active-opt");
    }

    var accentBtns = document.querySelectorAll('[data-action="set-accent"]');
    Array.prototype.forEach.call(accentBtns, function (btn) {
      if (btn.getAttribute("data-accent") === prefs.accent) {
        btn.classList.add("active-opt");
      } else {
        btn.classList.remove("active-opt");
      }
    });

    var oledBtn = document.getElementById("oledBlackBtn");
    if (oledBtn) {
      oledBtn.textContent = "Backdrop FX: " + (prefs.oledPureBlack ? "MINIMAL" : "DYNAMIC");
      oledBtn.classList.toggle("active-opt", !prefs.oledPureBlack);
    }

    var shiftBtn = document.getElementById("pixelShiftBtn");
    if (shiftBtn) {
      shiftBtn.textContent = "Pixel Shift: " + (prefs.pixelShift ? "ON" : "OFF");
      shiftBtn.classList.toggle("active-opt", prefs.pixelShift);
    }

    var clockBtn = document.getElementById("clockFmtBtn");
    if (clockBtn) {
      clockBtn.textContent = "Clock: " + (prefs.use24h ? "24h" : "12h");
      clockBtn.classList.add("active-opt");
    }

    var appsContainer = document.getElementById("modalAppToggles");
    if (appsContainer) {
      var currentFocusKey =
        document.activeElement && document.activeElement.getAttribute("data-toggle-app-key");
      appsContainer.innerHTML = "";

      userApps.forEach(function (app, idx) {
        var appKey = app.key || (app.id + "_" + idx);
        app.key = appKey;
        var isOn = app.active !== false;
        var iconFile = app.icon || "hdmi-icon.png";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "modal-app-toggle modal-focusable" + (isOn ? " enabled" : "");
        btn.setAttribute("tabindex", "0");
        btn.setAttribute("role", "checkbox");
        btn.setAttribute("aria-checked", isOn ? "true" : "false");
        btn.setAttribute("data-action", "toggle-app-tile");
        btn.setAttribute("data-toggle-app-key", appKey);
        btn.innerHTML =
          '<span class="modal-app-label">' +
          '<input type="checkbox" class="app-checkbox" tabindex="0" data-action="toggle-app-tile" data-toggle-app-key="' + appKey + '" ' + (isOn ? "checked" : "") + " />" +
          '<img src="' + iconFile + '" alt="" class="modal-app-icon" onerror="this.src=\'hdmi-icon.png\'" />' +
          "<span>" + app.name + "</span>" +
          "</span>" +
          '<span class="toggle-pill ' + (isOn ? "on" : "off") + '">' + (isOn ? "ACTIVE" : "HIDDEN") + "</span>";
        bindInteractiveElement(btn);
        appsContainer.appendChild(btn);

        if (currentFocusKey && currentFocusKey === appKey) {
          btn.focus();
        }
      });
    }
  }

  function applyThemeAndOledSettings() {
    var theme = ACCENT_THEMES[prefs.accent] || ACCENT_THEMES.cyan;
    document.documentElement.style.setProperty("--accent", theme.accent);
    document.documentElement.style.setProperty("--accent-glow", theme.glow);

    if (prefs.oledPureBlack) {
      document.body.classList.add("oled-pure-black");
    } else {
      document.body.classList.remove("oled-pure-black");
    }

    if (!prefs.pixelShift) {
      var canvas = document.getElementById("tvCanvas");
      if (canvas) canvas.style.transform = "translate(0px, 0px)";
    }
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  // Location-synchronized clock (compensates for webOS TV running in GMT/UTC+0)
  function updateClock() {
    var offsetSec = typeof userCoords.utcOffsetSeconds === "number" ? userCoords.utcOffsetSeconds : 3600;
    var localEpochMs = Date.now() + offsetSec * 1000;
    var d = new Date(localEpochMs);

    var hours24 = d.getUTCHours();
    var mins = pad2(d.getUTCMinutes());
    var secs = pad2(d.getUTCSeconds());

    var timeStr;
    if (prefs.use24h) {
      timeStr = pad2(hours24) + ":" + mins + ":" + secs;
    } else {
      var suffix = hours24 >= 12 ? " PM" : " AM";
      var hours12 = hours24 % 12 || 12;
      timeStr = pad2(hours12) + ":" + mins + ":" + secs + suffix;
    }

    var timeEl = document.getElementById("clockTime");
    var dateEl = document.getElementById("clockDate");
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) {
      var dayName = FULL_DAYS[d.getUTCDay()];
      var monthName = SHORT_MONTHS[d.getUTCMonth()];
      var dayNum = d.getUTCDate();
      var yearNum = d.getUTCFullYear();
      dateEl.textContent = dayName + ", " + monthName + " " + dayNum + ", " + yearNum;
    }
  }

  function runOledPixelShift() {
    if (!prefs.pixelShift) return;
    var canvas = document.getElementById("tvCanvas");
    if (!canvas) return;
    pixelShiftStep = (pixelShiftStep + 1) % pixelShiftOffsets.length;
    canvas.style.transform = pixelShiftOffsets[pixelShiftStep];
  }

  function initWebOS() {
    if (!window.webOS) return;

    webOS.fetchAppInfo(function (info) {
      if (info && info.title) {
        document.getElementById("appTitle").textContent = info.title;
      }
    });

    webOS.deviceInfo(function (device) {
      var badge = document.getElementById("deviceBadge");
      var isTv = !!(webOS.platform && webOS.platform.tv);
      var mode = isTv ? "webOS TV" : "4K Sim";
      var model = (!isTv && device.modelName === "webOS Device") ? "LG OLED77B1" : (device.modelName || "LG OLED77B1");
      var sdk = device.sdkVersion || "6.0";
      if (badge) {
        badge.textContent = model + " · webOS " + sdk + " · 77\" OLED (" + mode + ")";
      }
      showToast("Ready on " + model);
    });
  }

  // Launch native apps & external HDMI 2 / USB 1 / USB 2 inputs directly from dashboard shortcut button
  function launchNativeApp(appId, appTitle, launchParams) {
    var targetId = appId || "youtube.leanback.v4";
    var label = appTitle || targetId;
    showToast("Launching " + label + " (" + targetId + ")...");

    var payload = { id: targetId };
    if (launchParams && typeof launchParams === "object") {
      payload.params = launchParams;
    }

    webOS.service.request("luna://com.webos.applicationManager", {
      method: "launch",
      parameters: payload,
      onSuccess: function (res) {
        var sim = res && res.simulated ? " (Browser Sim)" : "";
        showToast("Launched " + label + sim);
      },
      onFailure: function (err) {
        showToast("Launch failed: " + (err && err.errorText ? err.errorText : label));
      }
    });
  }

  function openModal() {
    var modal = document.getElementById("customModal");
    if (!modal) return;
    isModalOpen = true;
    renderModalState();
    modal.classList.remove("hidden");
    showToast("Customize Overlay Open – Toggle apps or enter City / Lat / Lon");
    var firstBtn = modal.querySelector(".modal-focusable");
    if (firstBtn) firstBtn.focus();
  }

  function closeModal() {
    var modal = document.getElementById("customModal");
    if (!modal) return;
    isModalOpen = false;
    modal.classList.add("hidden");
    saveApps();
    saveCoords();
    savePrefs();
    renderWeather();
    renderLaunchers();
    showToast("Saved changes to localStorage & updated dashboard");
    var trigger = document.getElementById("openModalBtn");
    if (trigger) trigger.focus();
  }

  function inferIconForAppId(appId) {
    var lower = (appId || "").toLowerCase();
    if (lower.indexOf("youtube") !== -1) return "youtube-icon.png";
    if (lower.indexOf("disney") !== -1) return "disney-icon.png";
    if (lower.indexOf("amazon") !== -1 || lower.indexOf("prime") !== -1) return "prime-icon.png";
    if (lower.indexOf("crunchyroll") !== -1) return "crunchyroll-icon.png";
    if (lower.indexOf("netflix") !== -1) return "netflix-icon.png";
    if (lower.indexOf("hdmi") !== -1) return "hdmi-icon.png";
    if (lower.indexOf("usb") !== -1 || lower.indexOf("photo") !== -1) return "usb-icon.png";
    if (lower.indexOf("browser") !== -1) return "browser-icon.png";
    return "tv-icon.png";
  }

  function handleAction(action, el) {
    var now = Date.now();
    if (now - lastActionTime < 120) return;
    lastActionTime = now;

    if (action === "launch-app") {
      var appId = el ? el.getAttribute("data-app-id") : "youtube.leanback.v4";
      var appTitle = el ? el.getAttribute("data-app-title") : appId;
      var rawParams = el ? el.getAttribute("data-app-params") : null;
      var parsedParams = null;
      if (rawParams) {
        try { parsedParams = JSON.parse(rawParams); } catch (e) {}
      }
      launchNativeApp(appId, appTitle, parsedParams);
    } else if (action === "refresh-weather") {
      userCoords.useCustomCoords = false;
      userCoords.cityIdx = (userCoords.cityIdx + 1) % CITIES.length;
      syncWeatherStateFromCoords();
      saveCoords();
      updateClock();
      renderWeather();
      fetchWeather(weatherState.lat, weatherState.lon, weatherState.name);
      showToast("Weather station: " + weatherState.name);
    } else if (action === "detect-location") {
      detectExactLocation();
    } else if (action === "apply-custom-coords") {
      saveCustomLocationInputs();
    } else if (action === "save-and-close") {
      saveCustomLocationInputs().then(function () {
        closeModal();
      });
    } else if (action === "add-custom-app") {
      var nameIn = document.getElementById("newAppName");
      var idIn = document.getElementById("newAppId");
      var newName = nameIn && nameIn.value ? nameIn.value.trim() : "";
      var newId = idIn && idIn.value ? idIn.value.trim() : "";
      if (!newName || !newId) {
        showToast("Enter both Shortcut Name and webOS App / Input ID");
        return;
      }
      var customKey = "custom_" + Date.now();
      userApps.push({
        key: customKey,
        name: newName,
        id: newId,
        icon: inferIconForAppId(newId),
        sub: "Custom · " + newId,
        active: true
      });
      if (nameIn) nameIn.value = "";
      if (idIn) idIn.value = "";
      saveApps();
      renderLaunchers();
      renderModalState();
      showToast("Added '" + newName + "' to tv_apps");
    } else if (action === "open-modal") {
      openModal();
    } else if (action === "close-modal") {
      closeModal();
    } else if (action === "set-city") {
      var idx = parseInt(el.getAttribute("data-city-idx"), 10);
      if (!isNaN(idx) && CITIES[idx]) {
        userCoords.useCustomCoords = false;
        userCoords.cityIdx = idx;
        syncWeatherStateFromCoords();
        saveCoords();
        updateClock();
        renderWeather();
        fetchWeather(weatherState.lat, weatherState.lon, weatherState.name);
        renderModalState();
        showToast("Saved city coordinates: " + CITIES[idx].name);
      }
    } else if (action === "toggle-unit") {
      userCoords.unit = userCoords.unit === "C" ? "F" : "C";
      saveCoords();
      renderWeather();
      renderModalState();
      showToast("Temperature unit set to °" + userCoords.unit);
    } else if (action === "set-accent") {
      var accent = el.getAttribute("data-accent");
      if (accent && ACCENT_THEMES[accent]) {
        prefs.accent = accent;
        savePrefs();
        applyThemeAndOledSettings();
        renderModalState();
        showToast("Theme accent updated to " + accent.toUpperCase());
      }
    } else if (action === "toggle-oled-black") {
      prefs.oledPureBlack = !prefs.oledPureBlack;
      savePrefs();
      applyThemeAndOledSettings();
      renderModalState();
      showToast("Backdrop FX: " + (prefs.oledPureBlack ? "MINIMAL" : "DYNAMIC"));
    } else if (action === "toggle-pixel-shift") {
      prefs.pixelShift = !prefs.pixelShift;
      savePrefs();
      applyThemeAndOledSettings();
      renderModalState();
      showToast("OLED Pixel Shift " + (prefs.pixelShift ? "ON" : "OFF"));
    } else if (action === "toggle-clock-format") {
      prefs.use24h = !prefs.use24h;
      savePrefs();
      updateClock();
      renderModalState();
      showToast("Clock format set to " + (prefs.use24h ? "24-hour" : "12-hour"));
    } else if (action === "toggle-app-tile") {
      var toggleKey = el.getAttribute("data-toggle-app-key");
      var targetApp = userApps.find(function (a) { return a.key === toggleKey; });
      if (targetApp) {
        targetApp.active = targetApp.active === false;
        saveApps();
        renderLaunchers();
        renderModalState();
        showToast((targetApp.active ? "Checked " : "Unchecked ") + targetApp.name + " (saved to tv_apps)");
      }
    } else if (action === "reset-defaults") {
      userApps = defaultApps.map(function (a) { return Object.assign({}, a); });
      userCoords = {
        cityIdx: 0,
        useCustomCoords: false,
        name: CITIES[0].name,
        lat: CITIES[0].lat,
        lon: CITIES[0].lon,
        utcOffsetSeconds: 3600,
        unit: "C"
      };
      prefs = {
        accent: "cyan",
        oledPureBlack: false,
        pixelShift: true,
        use24h: true
      };
      saveApps();
      saveCoords();
      savePrefs();
      syncWeatherStateFromCoords();
      applyThemeAndOledSettings();
      updateClock();
      renderWeather();
      fetchWeather(weatherState.lat, weatherState.lon, weatherState.name);
      renderLaunchers();
      renderModalState();
      showToast("Reset tv_apps & tv_coords to defaults");
    }
  }

  function getActiveFocusables() {
    var selector = isModalOpen ? ".modal-focusable" : ".focusable";
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function bindInteractiveElement(el) {
    if (el.getAttribute("data-bound") === "true") return;
    el.setAttribute("data-bound", "true");

    el.addEventListener("mouseenter", function () {
      setRemoteBadge("🪄 Magic Pointer Active");
      if (document.activeElement !== el) {
        el.focus();
      }
    });

    el.addEventListener("click", function (e) {
      e.stopPropagation();
      el.focus();
      var action = el.getAttribute("data-action");
      if (action) {
        handleAction(action, el);
      }
    });
  }

  function resetIdleTimer() {
    if (document.body.classList.contains("idle-dimmed")) {
      document.body.classList.remove("idle-dimmed");
      showToast("OLED display restored to 100% brightness");
    }
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(function () {
      document.body.classList.add("idle-dimmed");
      showToast("OLED Idle Care: Dimmed to 20% opacity after 10m inactivity");
    }, IDLE_TIMEOUT_MS);
  }

  function setupNavigation() {
    var staticItems = document.querySelectorAll(".focusable, .modal-focusable");
    Array.prototype.forEach.call(staticItems, bindInteractiveElement);

    ["mousemove", "mousedown", "wheel", "keydown", "click", "touchstart", "cursorStateChange"].forEach(function (evtName) {
      window.addEventListener(evtName, resetIdleTimer, { passive: true });
    });
    resetIdleTimer();

    ["customCityInput", "customLatInput", "customLonInput"].forEach(function (id) {
      var inputEl = document.getElementById(id);
      if (inputEl) {
        inputEl.addEventListener("change", function () {
          saveCustomLocationInputs();
        });
      }
    });

    var initial = getActiveFocusables();
    if (initial.length > 0) {
      initial[0].focus();
    }

    var backdrop = document.getElementById("customModal");
    if (backdrop) {
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop && isModalOpen) {
          closeModal();
        }
      });
    }

    document.addEventListener("cursorStateChange", function (e) {
      var visible = e && e.detail && e.detail.visibility;
      setRemoteBadge(visible ? "🪄 Magic Pointer Active" : "🎮 D-Pad & Wheel Mode");
    });

    window.addEventListener("wheel", function (e) {
      var now = Date.now();
      if (now - lastWheelTime < 130) return;
      lastWheelTime = now;

      setRemoteBadge("◎ Magic Wheel Scroll");
      var list = getActiveFocusables();
      if (list.length === 0) return;
      var idx = list.indexOf(document.activeElement);
      if (idx === -1) {
        list[0].focus();
        return;
      }
      var dir = e.deltaY > 0 ? 1 : -1;
      var nextIdx = (idx + dir + list.length) % list.length;
      list[nextIdx].focus();
    }, { passive: true });

    document.addEventListener("keydown", function (e) {
      var list = getActiveFocusables();
      var current = document.activeElement;
      var isInput = current && current.tagName === "INPUT" && current.type !== "checkbox";
      var idx = list.indexOf(current);
      var code = e.keyCode || e.which;

      if (e.key === "Enter" || code === 13) {
        if (isInput) {
          if (window.webOS && webOS.platform && webOS.platform.tv && webOS.keyboard && !webOS.keyboard.isShowing()) {
            return;
          }
          e.preventDefault();
          if (current.id === "newAppName" || current.id === "newAppId") {
            handleAction("add-custom-app");
          } else {
            saveCustomLocationInputs();
          }
          return;
        }
        if (current && (current.classList.contains("focusable") || current.classList.contains("modal-focusable"))) {
          e.preventDefault();
          handleAction(current.getAttribute("data-action"), current);
        }
        return;
      }

      if (code === 461 || e.key === "Escape" || e.key === "GoBack" || (!isInput && e.key === "Backspace")) {
        e.preventDefault();
        if (isModalOpen) {
          closeModal();
          return;
        }
        var weatherCard = document.getElementById("weatherCard");
        if (weatherCard && current !== weatherCard) {
          weatherCard.focus();
          showToast("Returned to Weather Card");
        } else {
          webOS.platformBack();
        }
        return;
      }

      if (code === 403 || e.key === "ColorF0Red") {
        e.preventDefault();
        launchNativeApp("youtube.leanback.v4", "YouTube");
        return;
      }
      if (code === 404 || e.key === "ColorF1Green") {
        e.preventDefault();
        if (isModalOpen) closeModal();
        else openModal();
        return;
      }
      if (code === 405 || e.key === "ColorF2Yellow") {
        e.preventDefault();
        fetchWeather(weatherState.lat, weatherState.lon, weatherState.name);
        showToast("Refreshed weather for " + weatherState.name);
        return;
      }
      if (code === 406 || e.key === "ColorF3Blue") {
        e.preventDefault();
        launchNativeApp("com.webos.app.hdmi2", "HDMI 2");
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) !== -1 ||
          [37, 38, 39, 40].indexOf(code) !== -1) {
        if (isInput && (e.key === "ArrowLeft" || e.key === "ArrowRight" || code === 37 || code === 39)) {
          return;
        }
        e.preventDefault();
        setRemoteBadge("🎮 D-Pad & Wheel Mode");
        if (idx === -1 && list.length > 0) {
          list[0].focus();
          return;
        }
        var curRect = current.getBoundingClientRect();
        var curCx = curRect.left + curRect.width / 2;
        var curCy = curRect.top + curRect.height / 2;

        var isRight = e.key === "ArrowRight" || code === 39;
        var isLeft = e.key === "ArrowLeft" || code === 37;
        var isDown = e.key === "ArrowDown" || code === 40;
        var isUp = e.key === "ArrowUp" || code === 38;

        var best = null;
        var bestScore = Infinity;

        list.forEach(function (candidate) {
          if (candidate === current) return;
          var r = candidate.getBoundingClientRect();
          var cx = r.left + r.width / 2;
          var cy = r.top + r.height / 2;
          var dx = cx - curCx;
          var dy = cy - curCy;

          var valid = false;
          if (isRight && dx > 14) valid = true;
          if (isLeft && dx < -14) valid = true;
          if (isDown && dy > 14) valid = true;
          if (isUp && dy < -14) valid = true;

          if (valid) {
            var dist = Math.sqrt(dx * dx + dy * dy);
            var orthoPenalty = (isLeft || isRight) ? Math.abs(dy) * 2.2 : Math.abs(dx) * 2.2;
            var score = dist + orthoPenalty;
            if (score < bestScore) {
              bestScore = score;
              best = candidate;
            }
          }
        });

        if (best) best.focus();
      }
    });
  }

  window.addEventListener("DOMContentLoaded", function () {
    loadStorage();
    applyThemeAndOledSettings();
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(runOledPixelShift, 60000);
    renderWeather();
    fetchWeather(weatherState.lat, weatherState.lon, weatherState.name);
    setInterval(function () {
      fetchWeather(weatherState.lat, weatherState.lon, weatherState.name);
    }, 600000);
    renderLaunchers();
    setupNavigation();
    initWebOS();
  });
})();
