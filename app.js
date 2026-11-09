/*
 * app.js – LG B1 77" OLED Command Center
 * Focused exclusively on:
 *   1. Local Weather Station (with live Open-Meteo fetch + instant offline fallback)
 *   2. Quick App Launchers (native webOS apps & HDMI inputs via luna://com.webos.applicationManager)
 *   3. On-Screen Customization Modal (persisted in localStorage, full Magic Remote & D-Pad navigation)
 */
(function () {
  "use strict";

  var STORAGE_KEY = "lg_b1_dashboard_prefs_v2";

  var CITIES = [
    {
      name: "Berlin, DE",
      lat: 52.52,
      lon: 13.405,
      tempC: 21,
      hiC: 23,
      loC: 14,
      feelsC: 21,
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
      lat: 48.135,
      lon: 11.582,
      tempC: 19,
      hiC: 21,
      loC: 11,
      feelsC: 18,
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
      lat: 51.507,
      lon: -0.127,
      tempC: 17,
      hiC: 19,
      loC: 12,
      feelsC: 16,
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
      lat: 40.712,
      lon: -74.006,
      tempC: 23,
      hiC: 26,
      loC: 17,
      feelsC: 24,
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
      lat: 35.676,
      lon: 139.65,
      tempC: 24,
      hiC: 26,
      loC: 18,
      feelsC: 25,
      humidity: 50,
      windKmh: 12,
      cond: "Clear Evening",
      icon: "🌙",
      forecast: [
        { day: "Tue", icon: "☀️", hiC: 26, loC: 18 },
        { day: "Wed", icon: "🌤", hiC: 25, loC: 17 },
        { day: "Thu", icon: "☀️", hiC: 27, loC: 19 },
        { day: "Fri", icon: "⛅", hiC: 23, loC: 16 }
      ]
    }
  ];

  var DEFAULT_APPS = [
    { id: "youtube.leanback.v4", title: "YouTube", sub: "4K HDR · 🔴 Red Key", emoji: "▶️", enabled: true },
    { id: "netflix", title: "Netflix", sub: "Dolby Vision · Atmos", emoji: "🍿", enabled: true },
    { id: "com.disney.disneyplus-prod", title: "Disney+", sub: "4K UHD · IMAX Enhanced", emoji: "✨", enabled: true },
    { id: "amazon", title: "Prime Video", sub: "UHD · HDR10+", emoji: "🎬", enabled: true },
    { id: "com.webos.app.hdmi1", title: "HDMI 1", sub: "Cinema · 🔵 Blue Key", emoji: "📺", enabled: true },
    { id: "com.webos.app.hdmi3", title: "HDMI 3 (120Hz)", sub: "HDMI 2.1 · eARC / VRR", emoji: "🎮", enabled: true },
    { id: "com.webos.app.browser", title: "Web Browser", sub: "LG webOS 6.0 Browser", emoji: "🌐", enabled: true },
    { id: "com.webos.app.photovideo", title: "OLED Gallery", sub: "4K Art & Media", emoji: "🖼", enabled: true }
  ];

  var ACCENT_THEMES = {
    cyan: { accent: "#38bdf8", glow: "rgba(56, 189, 248, 0.48)" },
    emerald: { accent: "#4ade80", glow: "rgba(74, 222, 128, 0.48)" },
    violet: { accent: "#a78bfa", glow: "rgba(167, 139, 250, 0.48)" },
    amber: { accent: "#fbbf24", glow: "rgba(251, 191, 36, 0.48)" }
  };

  var prefs = {
    cityIdx: 0,
    unit: "C",
    accent: "cyan",
    oledPureBlack: false,
    pixelShift: true,
    use24h: true,
    enabledApps: {}
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

  function initDefaultAppsMap() {
    DEFAULT_APPS.forEach(function (app) {
      if (typeof prefs.enabledApps[app.id] === "undefined") {
        prefs.enabledApps[app.id] = app.enabled;
      }
    });
  }

  function loadPrefs() {
    initDefaultAppsMap();
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (typeof parsed.cityIdx === "number" && CITIES[parsed.cityIdx]) prefs.cityIdx = parsed.cityIdx;
        if (parsed.unit === "C" || parsed.unit === "F") prefs.unit = parsed.unit;
        if (parsed.accent && ACCENT_THEMES[parsed.accent]) prefs.accent = parsed.accent;
        if (typeof parsed.oledPureBlack === "boolean") prefs.oledPureBlack = parsed.oledPureBlack;
        if (typeof parsed.pixelShift === "boolean") prefs.pixelShift = parsed.pixelShift;
        if (typeof parsed.use24h === "boolean") prefs.use24h = parsed.use24h;
        if (parsed.enabledApps && typeof parsed.enabledApps === "object") {
          DEFAULT_APPS.forEach(function (app) {
            if (typeof parsed.enabledApps[app.id] === "boolean") {
              prefs.enabledApps[app.id] = parsed.enabledApps[app.id];
            }
          });
        }
      }
    } catch (e) {
      // Fallback to defaults if localStorage is restricted
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      // Ignore storage errors
    }
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
    if (prefs.unit === "F") {
      return Math.round(tempC * 9 / 5 + 32) + "°F";
    }
    return Math.round(tempC) + "°C";
  }

  function formatShortTemp(tempC) {
    if (prefs.unit === "F") {
      return Math.round(tempC * 9 / 5 + 32) + "°";
    }
    return Math.round(tempC) + "°";
  }

  function mapWmoCode(code) {
    if (code === 0) return { cond: "Clear Sky", icon: "☀️" };
    if (code === 1 || code === 2) return { cond: "Partly Cloudy", icon: "🌤" };
    if (code === 3) return { cond: "Overcast", icon: "☁️" };
    if (code >= 45 && code <= 48) return { cond: "Misty Fog", icon: "🌫" };
    if (code >= 51 && code <= 67) return { cond: "Light Rain", icon: "🌦" };
    if (code >= 71 && code <= 77) return { cond: "Snowfall", icon: "❄️" };
    if (code >= 80 && code <= 82) return { cond: "Rain Showers", icon: "🌧" };
    if (code >= 95) return { cond: "Thunderstorm", icon: "⛈" };
    return { cond: "Partly Cloudy", icon: "🌤" };
  }

  function renderWeather() {
    var city = CITIES[prefs.cityIdx] || CITIES[0];
    document.getElementById("weatherIcon").textContent = city.icon;
    document.getElementById("weatherTemp").textContent = formatTemp(city.tempC);
    document.getElementById("weatherCity").textContent = city.name;
    document.getElementById("weatherCond").textContent = city.cond;
    document.getElementById("weatherHiLo").textContent = formatShortTemp(city.hiC) + " / " + formatShortTemp(city.loC);
    document.getElementById("weatherHumidity").textContent = city.humidity + "%";
    document.getElementById("weatherWind").textContent = city.windKmh + " km/h";
    document.getElementById("weatherFeels").textContent = formatTemp(city.feelsC);

    var strip = document.getElementById("forecastStrip");
    if (strip) {
      strip.innerHTML = "";
      city.forecast.forEach(function (fc) {
        var card = document.createElement("div");
        card.className = "forecast-day";
        card.innerHTML =
          '<span class="fc-name">' + fc.day + "</span>" +
          '<span class="fc-icon">' + fc.icon + "</span>" +
          '<span class="fc-temp">' + formatShortTemp(fc.hiC) + " / " + formatShortTemp(fc.loC) + "</span>";
        strip.appendChild(card);
      });
    }
  }

  function fetchLiveWeatherForCurrentCity() {
    var city = CITIES[prefs.cityIdx] || CITIES[0];
    var pill = document.getElementById("weatherSourcePill");
    if (typeof XMLHttpRequest === "undefined") return;

    var url =
      "https://api.open-meteo.com/v1/forecast?latitude=" + city.lat +
      "&longitude=" + city.lon +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
      "&daily=temperature_2m_max,temperature_2m_min&timezone=auto";

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 4500;
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data && data.current) {
            city.tempC = data.current.temperature_2m;
            city.feelsC = data.current.apparent_temperature;
            city.humidity = Math.round(data.current.relative_humidity_2m);
            city.windKmh = Math.round(data.current.wind_speed_10m);
            var mapped = mapWmoCode(data.current.weather_code);
            city.cond = mapped.cond;
            city.icon = mapped.icon;
          }
          if (data && data.daily && data.daily.temperature_2m_max && data.daily.temperature_2m_max.length > 0) {
            city.hiC = data.daily.temperature_2m_max[0];
            city.loC = data.daily.temperature_2m_min[0];
          }
          if (pill) pill.textContent = "LIVE METEO";
          renderWeather();
        } catch (e) {
          // Keep cached station telemetry
        }
      }
    };
    xhr.send(null);
  }

  function renderLaunchers() {
    var grid = document.getElementById("launcherGrid");
    if (!grid) return;
    grid.innerHTML = "";

    var visibleList = DEFAULT_APPS.filter(function (app) {
      return prefs.enabledApps[app.id] !== false;
    });

    if (visibleList.length === 0) {
      // Ensure at least YouTube is shown if user unchecked all
      prefs.enabledApps[DEFAULT_APPS[0].id] = true;
      visibleList = [DEFAULT_APPS[0]];
    }

    visibleList.forEach(function (app) {
      var btn = document.createElement("button");
      btn.className = "app-tile focusable";
      btn.setAttribute("tabindex", "0");
      btn.setAttribute("data-action", "launch-app");
      btn.setAttribute("data-app-id", app.id);
      btn.setAttribute("data-app-title", app.title);
      btn.innerHTML =
        '<span class="tile-emoji">' + app.emoji + "</span>" +
        '<span class="tile-title">' + app.title + "</span>" +
        '<span class="tile-sub">' + app.sub + "</span>";
      bindInteractiveElement(btn);
      grid.appendChild(btn);
    });
  }

  function renderModalState() {
    // Highlight active city button
    var cityBtns = document.querySelectorAll('[data-action="set-city"]');
    Array.prototype.forEach.call(cityBtns, function (btn) {
      var idx = parseInt(btn.getAttribute("data-city-idx"), 10);
      if (idx === prefs.cityIdx) {
        btn.classList.add("active-opt");
      } else {
        btn.classList.remove("active-opt");
      }
    });

    // Unit button
    var unitBtn = document.getElementById("unitToggleBtn");
    if (unitBtn) {
      unitBtn.textContent = "Unit: °" + prefs.unit;
      unitBtn.classList.add("active-opt");
    }

    // Accent buttons
    var accentBtns = document.querySelectorAll('[data-action="set-accent"]');
    Array.prototype.forEach.call(accentBtns, function (btn) {
      if (btn.getAttribute("data-accent") === prefs.accent) {
        btn.classList.add("active-opt");
      } else {
        btn.classList.remove("active-opt");
      }
    });

    // OLED Pure Black, Pixel Shift, Clock Format buttons
    var oledBtn = document.getElementById("oledBlackBtn");
    if (oledBtn) {
      oledBtn.textContent = "OLED Pure Black: " + (prefs.oledPureBlack ? "ON" : "OFF");
      oledBtn.classList.toggle("active-opt", prefs.oledPureBlack);
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

    // App Launcher Visibility Toggles
    var appsContainer = document.getElementById("modalAppToggles");
    if (appsContainer) {
      var currentFocusAppId =
        document.activeElement && document.activeElement.getAttribute("data-toggle-app-id");
      appsContainer.innerHTML = "";

      DEFAULT_APPS.forEach(function (app) {
        var isOn = prefs.enabledApps[app.id] !== false;
        var btn = document.createElement("button");
        btn.className = "modal-app-toggle modal-focusable" + (isOn ? " enabled" : "");
        btn.setAttribute("tabindex", "0");
        btn.setAttribute("data-action", "toggle-app-tile");
        btn.setAttribute("data-toggle-app-id", app.id);
        btn.innerHTML =
          "<span>" + app.emoji + " " + app.title + "</span>" +
          '<span class="toggle-pill ' + (isOn ? "on" : "off") + '">' + (isOn ? "SHOWN" : "HIDDEN") + "</span>";
        bindInteractiveElement(btn);
        appsContainer.appendChild(btn);

        if (currentFocusAppId && currentFocusAppId === app.id) {
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

  function updateClock() {
    var now = new Date();
    var timeEl = document.getElementById("clockTime");
    var dateEl = document.getElementById("clockDate");
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString([], { hour12: !prefs.use24h });
    }
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString([], {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric"
      });
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
        badge.textContent = model + " · webOS " + sdk + " · 3840×2160 (" + mode + ")";
      }
      showToast("Ready on " + model);
    });
  }

  // Launch native apps directly from your custom dashboard button
  function launchNativeApp(appId, appTitle) {
    var targetId = appId || "youtube.leanback.v4";
    var label = appTitle || targetId;
    showToast("Launching " + label + "...");

    webOS.service.request("luna://com.webos.applicationManager", {
      method: "launch",
      parameters: { id: targetId }, // e.g. "youtube.leanback.v4", "netflix", "com.webos.app.hdmi1"
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
    showToast("Customization Modal Open – Use Pointer, D-Pad, or Back to close");
    var firstBtn = modal.querySelector(".modal-focusable");
    if (firstBtn) firstBtn.focus();
  }

  function closeModal() {
    var modal = document.getElementById("customModal");
    if (!modal) return;
    isModalOpen = false;
    modal.classList.add("hidden");
    showToast("Preferences saved");
    var trigger = document.getElementById("openModalBtn");
    if (trigger) trigger.focus();
  }

  function handleAction(action, el) {
    var now = Date.now();
    if (now - lastActionTime < 160) return;
    lastActionTime = now;

    if (action === "launch-app") {
      var appId = el ? el.getAttribute("data-app-id") : "youtube.leanback.v4";
      var appTitle = el ? el.getAttribute("data-app-title") : appId;
      launchNativeApp(appId, appTitle);
    } else if (action === "refresh-weather") {
      prefs.cityIdx = (prefs.cityIdx + 1) % CITIES.length;
      savePrefs();
      renderWeather();
      fetchLiveWeatherForCurrentCity();
      showToast("Weather city: " + CITIES[prefs.cityIdx].name);
    } else if (action === "open-modal") {
      openModal();
    } else if (action === "close-modal") {
      closeModal();
    } else if (action === "set-city") {
      var idx = parseInt(el.getAttribute("data-city-idx"), 10);
      if (!isNaN(idx) && CITIES[idx]) {
        prefs.cityIdx = idx;
        savePrefs();
        renderWeather();
        fetchLiveWeatherForCurrentCity();
        renderModalState();
        showToast("Default weather location set to " + CITIES[idx].name);
      }
    } else if (action === "toggle-unit") {
      prefs.unit = prefs.unit === "C" ? "F" : "C";
      savePrefs();
      renderWeather();
      renderModalState();
      showToast("Temperature unit set to °" + prefs.unit);
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
      showToast("OLED Pure Black Mode " + (prefs.oledPureBlack ? "ON" : "OFF"));
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
      var toggleId = el.getAttribute("data-toggle-app-id");
      if (toggleId) {
        prefs.enabledApps[toggleId] = prefs.enabledApps[toggleId] === false;
        savePrefs();
        renderLaunchers();
        renderModalState();
        showToast("Updated Quick App Launchers");
      }
    } else if (action === "reset-defaults") {
      prefs.cityIdx = 0;
      prefs.unit = "C";
      prefs.accent = "cyan";
      prefs.oledPureBlack = false;
      prefs.pixelShift = true;
      prefs.use24h = true;
      prefs.enabledApps = {};
      initDefaultAppsMap();
      savePrefs();
      applyThemeAndOledSettings();
      updateClock();
      renderWeather();
      renderLaunchers();
      renderModalState();
      showToast("Reset all settings to defaults");
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
      handleAction(el.getAttribute("data-action"), el);
    });
  }

  function setupNavigation() {
    var staticItems = document.querySelectorAll(".focusable, .modal-focusable");
    Array.prototype.forEach.call(staticItems, bindInteractiveElement);

    var initial = getActiveFocusables();
    if (initial.length > 0) {
      initial[0].focus();
    }

    // Close modal if user clicks outside modal dialog on backdrop
    var backdrop = document.getElementById("customModal");
    if (backdrop) {
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop && isModalOpen) {
          closeModal();
        }
      });
    }

    // Native webOS Magic Remote cursor state event
    document.addEventListener("cursorStateChange", function (e) {
      var visible = e && e.detail && e.detail.visibility;
      setRemoteBadge(visible ? "🪄 Magic Pointer Active" : "🎮 D-Pad & Wheel Mode");
    });

    // LG Magic Remote Scroll Wheel support
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

    // LG Magic Remote Keydown (D-Pad, Wheel OK, Back 461, Color Keys 403-406)
    document.addEventListener("keydown", function (e) {
      var list = getActiveFocusables();
      var current = document.activeElement;
      var idx = list.indexOf(current);
      var code = e.keyCode || e.which;

      // Wheel Click / OK / Enter (keyCode 13)
      if (e.key === "Enter" || code === 13) {
        if (current && (current.classList.contains("focusable") || current.classList.contains("modal-focusable"))) {
          e.preventDefault();
          handleAction(current.getAttribute("data-action"), current);
        }
        return;
      }

      // webOS Back button (keyCode 461) or Escape / Backspace
      if (code === 461 || e.key === "Escape" || e.key === "Backspace" || e.key === "GoBack") {
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

      // Magic Remote Color Shortcut Keys
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
        handleAction("refresh-weather");
        return;
      }
      if (code === 406 || e.key === "ColorF3Blue") {
        e.preventDefault();
        launchNativeApp("com.webos.app.hdmi1", "HDMI 1");
        return;
      }

      // Spatial 2D D-Pad Arrow navigation scoped to active view (Dashboard or Modal)
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) !== -1 ||
          [37, 38, 39, 40].indexOf(code) !== -1) {
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
    loadPrefs();
    applyThemeAndOledSettings();
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(runOledPixelShift, 60000);
    renderWeather();
    fetchLiveWeatherForCurrentCity();
    renderLaunchers();
    setupNavigation();
    initWebOS();
  });
})();
