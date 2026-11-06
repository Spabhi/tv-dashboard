/*
 * app.js – LG webOS TV Dashboard Controller & Remote D-Pad Spatial Navigation
 */
(function () {
  "use strict";

  var stations = [
    { city: "Berlin", temp: "21°C", desc: "Partly Cloudy · Indoor 22.4°C · Humidity 46%" },
    { city: "Munich", temp: "19°C", desc: "Clear Sky · Indoor 22.0°C · Humidity 42%" },
    { city: "Tokyo", temp: "24°C", desc: "Light Breeze · Indoor 23.1°C · Humidity 50%" }
  ];
  var stationIdx = 0;
  var ecoEnabled = false;

  function logEvent(msg) {
    var list = document.getElementById("eventLog");
    if (!list) return;
    var time = new Date().toLocaleTimeString();
    var li = document.createElement("li");
    li.textContent = "[" + time + "] " + msg;
    list.insertBefore(li, list.firstChild);
    while (list.children.length > 5) {
      list.removeChild(list.lastChild);
    }
    var toast = document.getElementById("statusToast");
    if (toast) toast.textContent = msg;
  }

  function updateClock() {
    var now = new Date();
    var timeEl = document.getElementById("clockTime");
    var dateEl = document.getElementById("clockDate");
    if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour12: false });
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString([], {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    }
  }

  function initWebOS() {
    if (!window.webOS) return;

    webOS.fetchAppInfo(function (info) {
      if (info && info.title) {
        document.getElementById("appTitle").textContent = info.title + " v" + info.version;
      }
    });

    webOS.deviceInfo(function (device) {
      var badge = document.getElementById("deviceBadge");
      var sysDetails = document.getElementById("sysDetails");
      var mode = webOS.platform.tv ? "webOS TV Hardware" : "Browser Dev Mode";
      if (badge) {
        badge.textContent = device.modelName + " · SDK " + device.sdkVersion + " (" + mode + ")";
      }
      if (sysDetails) {
        sysDetails.textContent =
          "Resolution: " + device.screenWidth + "×" + device.screenHeight +
          (device.uhd ? " (4K UHD)" : " (FHD)") + " · App: " + webOS.fetchAppId();
      }
      logEvent("Initialized on " + device.modelName);
    });
  }

  function handleAction(action) {
    if (action === "refresh-weather") {
      stationIdx = (stationIdx + 1) % stations.length;
      var st = stations[stationIdx];
      document.getElementById("weatherTemp").textContent = st.temp + " · " + st.city;
      document.getElementById("weatherDesc").textContent = st.desc;
      logEvent("Weather station switched to " + st.city);
    } else if (action === "ping-luna") {
      webOS.service.request("luna://com.webos.service.systemservice", {
        method: "clock/getTime",
        parameters: {},
        onSuccess: function (res) {
          document.getElementById("netStatus").textContent = "LUNA OK";
          logEvent("Luna service responded (returnValue: " + res.returnValue + ")");
        },
        onFailure: function (err) {
          logEvent("Luna service error: " + (err.errorText || "unknown"));
        }
      });
    } else if (action === "toggle-eco") {
      ecoEnabled = !ecoEnabled;
      document.getElementById("powerUsage").textContent = ecoEnabled ? "0.88 kW" : "1.42 kW";
      document.getElementById("ecoState").textContent = ecoEnabled
        ? "Solar Output: 3.1 kW · Mode: Eco Saver Active"
        : "Solar Output: 3.1 kW · Mode: Balanced";
      logEvent("Eco Saver Mode " + (ecoEnabled ? "ENABLED" : "DISABLED"));
    } else if (action === "clear-log") {
      document.getElementById("eventLog").innerHTML = "";
      logEvent("Event log cleared");
    } else if (action && action.indexOf("scene-") === 0) {
      var sceneName = action.replace("scene-", "").toUpperCase();
      logEvent("Activated scene: " + sceneName);
    }
  }

  function setupNavigation() {
    var focusables = Array.prototype.slice.call(document.querySelectorAll(".focusable"));
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    focusables.forEach(function (el) {
      el.addEventListener("click", function () {
        el.focus();
        handleAction(el.getAttribute("data-action"));
      });
    });

    document.addEventListener("keydown", function (e) {
      var current = document.activeElement;
      var idx = focusables.indexOf(current);

      // Handle Enter / OK button on TV remote (keyCode 13)
      if (e.key === "Enter" || e.keyCode === 13) {
        if (current && current.classList.contains("focusable")) {
          e.preventDefault();
          handleAction(current.getAttribute("data-action"));
        }
        return;
      }

      // Handle webOS Back button (keyCode 461) or Escape
      if (e.keyCode === 461 || e.key === "Escape" || e.key === "Backspace") {
        logEvent("Back key pressed");
        if (focusables.length > 0) focusables[0].focus();
        return;
      }

      // Spatial 2D D-Pad Arrow navigation based on bounding rectangles
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) !== -1) {
        e.preventDefault();
        if (idx === -1 && focusables.length > 0) {
          focusables[0].focus();
          return;
        }
        var curRect = current.getBoundingClientRect();
        var curCx = curRect.left + curRect.width / 2;
        var curCy = curRect.top + curRect.height / 2;

        var best = null;
        var bestScore = Infinity;

        focusables.forEach(function (candidate) {
          if (candidate === current) return;
          var r = candidate.getBoundingClientRect();
          var cx = r.left + r.width / 2;
          var cy = r.top + r.height / 2;
          var dx = cx - curCx;
          var dy = cy - curCy;

          var valid = false;
          if (e.key === "ArrowRight" && dx > 20) valid = true;
          if (e.key === "ArrowLeft" && dx < -20) valid = true;
          if (e.key === "ArrowDown" && dy > 20) valid = true;
          if (e.key === "ArrowUp" && dy < -20) valid = true;

          if (valid) {
            var dist = Math.hypot(dx, dy);
            var orthoPenalty = (e.key === "ArrowLeft" || e.key === "ArrowRight") ? Math.abs(dy) * 2.5 : Math.abs(dx) * 2.5;
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
    updateClock();
    setInterval(updateClock, 1000);
    setupNavigation();
    initWebOS();
    logEvent("Dashboard ready – use arrow keys & Enter");
  });
})();
