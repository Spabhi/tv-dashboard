/*
 * app.js – LG B1 77" OLED Smart TV Dashboard Controller
 * Supports LG Magic Remote (MR21GA: Air Pointer, Scroll Wheel, D-Pad, Color Keys, Back 461)
 * and Luna Service Bus Native App Launching (luna://com.webos.applicationManager)
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

  function logEvent(msg) {
    var list = document.getElementById("eventLog");
    if (!list) return;
    var time = new Date().toLocaleTimeString();
    var li = document.createElement("li");
    li.textContent = "[" + time + "] " + msg;
    list.insertBefore(li, list.firstChild);
    while (list.children.length > 6) {
      list.removeChild(list.lastChild);
    }
    var toast = document.getElementById("statusToast");
    if (toast) toast.textContent = msg;
  }

  function setRemoteBadge(text) {
    var badge = document.getElementById("remoteModeBadge");
    if (badge) badge.textContent = text;
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

  // Subtle OLED Pixel Shift every 60s for 77" LG B1 OLED panel protection
  function runOledPixelShift() {
    var canvas = document.getElementById("tvCanvas");
    if (!canvas) return;
    pixelShiftStep = (pixelShiftStep + 1) % pixelShiftOffsets.length;
    canvas.style.transform = pixelShiftOffsets[pixelShiftStep];
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
      var isTv = !!(webOS.platform && webOS.platform.tv);
      var mode = isTv ? "webOS TV Hardware" : "Browser Dev Mode";
      var model = (!isTv && device.modelName === "webOS Device") ? "LG OLED77B1 (77\" 4K OLED)" : (device.modelName || "LG OLED77B1");
      var sdk = device.sdkVersion || "6.0";
      var isOled = (typeof device.oled !== "undefined") ? device.oled : true;
      var panelTag = isOled ? "77\" 4K OLED" : (device.uhd ? "4K UHD" : "FHD");
      var appId = (webOS.fetchAppId && webOS.fetchAppId()) || "com.custom.dashboard";
      if (badge) {
        badge.textContent = model + " · webOS " + sdk + " · SDK v" + (webOS.libVersion || "1.2.4") + " (" + mode + ")";
      }
      if (sysDetails) {
        sysDetails.textContent =
          panelTag + " (" + device.screenWidth + "×" + device.screenHeight + ") · 120Hz · " + appId;
      }
      logEvent("Ready on " + model + " (" + panelTag + ")");
    });
  }

  // Launch native apps directly from your custom dashboard button
  function launchNativeApp(appId, appTitle) {
    var targetId = appId || "youtube.leanback.v4";
    var label = appTitle || targetId;
    logEvent("Launching " + label + " (" + targetId + ")...");

    webOS.service.request("luna://com.webos.applicationManager", {
      method: "launch",
      parameters: { id: targetId }, // e.g. "youtube.leanback.v4", "netflix", "com.webos.app.hdmi1"
      onSuccess: function (res) {
        var modeNote = res && res.simulated ? " [Simulated in Browser]" : "";
        logEvent("Launched " + label + modeNote);
      },
      onFailure: function (err) {
        logEvent("Launch failed (" + label + "): " + (err && err.errorText ? err.errorText : "App unavailable"));
      }
    });
  }

  function handleAction(action, el) {
    var now = Date.now();
    if (now - lastActionTime < 180) return;
    lastActionTime = now;

    if (action === "launch-app") {
      var appId = el ? el.getAttribute("data-app-id") : "youtube.leanback.v4";
      var appTitle = el ? el.getAttribute("data-app-title") : appId;
      launchNativeApp(appId, appTitle);
    } else if (action === "refresh-weather") {
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
          logEvent("Luna bus OK (returnValue: " + res.returnValue + ")");
        },
        onFailure: function (err) {
          logEvent("Luna error: " + (err.errorText || "unknown"));
        }
      });
    } else if (action === "toggle-eco") {
      ecoEnabled = !ecoEnabled;
      if (ecoEnabled) {
        document.body.classList.add("oled-pure-black");
      } else {
        document.body.classList.remove("oled-pure-black");
      }
      document.getElementById("powerUsage").textContent = ecoEnabled ? "0.78 kW" : "1.42 kW";
      document.getElementById("ecoState").textContent = ecoEnabled
        ? "Pixel Shift: Active · Mode: OLED Pure Black Eco"
        : "Pixel Shift: Active · Mode: Standard OLED";
      logEvent("77\" OLED Pure Black Eco " + (ecoEnabled ? "ENABLED" : "DISABLED"));
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

    // LG Magic Remote Pointer (Air Mouse) hover + click integration
    focusables.forEach(function (el) {
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
    });

    // Native webOS Magic Remote cursor visibility state change event
    document.addEventListener("cursorStateChange", function (e) {
      var visible = e && e.detail && e.detail.visibility;
      setRemoteBadge(visible ? "🪄 Magic Pointer Active" : "🎮 D-Pad & Wheel Mode");
      logEvent("Magic Remote pointer " + (visible ? "shown" : "hidden"));
    });

    // LG Magic Remote Scroll Wheel support
    window.addEventListener("wheel", function (e) {
      var now = Date.now();
      if (now - lastWheelTime < 140) return;
      lastWheelTime = now;

      setRemoteBadge("◎ Magic Wheel Scroll");
      var current = document.activeElement;
      var idx = focusables.indexOf(current);
      if (idx === -1) {
        if (focusables.length > 0) focusables[0].focus();
        return;
      }
      var dir = e.deltaY > 0 ? 1 : -1;
      var nextIdx = (idx + dir + focusables.length) % focusables.length;
      focusables[nextIdx].focus();
    }, { passive: true });

    // LG Magic Remote Keydown (D-Pad, Wheel OK, Back 461, Color Buttons 403-406, Channel Keys)
    document.addEventListener("keydown", function (e) {
      var current = document.activeElement;
      var idx = focusables.indexOf(current);
      var code = e.keyCode || e.which;

      // Handle Wheel Click / OK / Enter button on Magic Remote (keyCode 13)
      if (e.key === "Enter" || code === 13) {
        if (current && current.classList.contains("focusable")) {
          e.preventDefault();
          handleAction(current.getAttribute("data-action"), current);
        }
        return;
      }

      // Handle webOS Back button (keyCode 461) or Escape / Backspace
      if (code === 461 || e.key === "Escape" || e.key === "Backspace" || e.key === "GoBack") {
        e.preventDefault();
        if (focusables.length > 0 && current !== focusables[0]) {
          focusables[0].focus();
          logEvent("Back pressed – returned to home tile");
        } else {
          logEvent("Back pressed at root – invoking webOS platformBack");
          webOS.platformBack();
        }
        return;
      }

      // Magic Remote Color Shortcut Buttons (Red: 403, Green: 404, Yellow: 405, Blue: 406)
      if (code === 403 || e.key === "ColorF0Red") {
        e.preventDefault();
        launchNativeApp("youtube.leanback.v4", "YouTube (Red Key)");
        return;
      }
      if (code === 404 || e.key === "ColorF1Green") {
        e.preventDefault();
        handleAction("toggle-eco");
        return;
      }
      if (code === 405 || e.key === "ColorF2Yellow") {
        e.preventDefault();
        handleAction("ping-luna");
        return;
      }
      if (code === 406 || e.key === "ColorF3Blue") {
        e.preventDefault();
        launchNativeApp("com.webos.app.hdmi1", "HDMI 1 (Blue Key)");
        return;
      }

      // Magic Remote Channel Up / Down (427 / 428 or PageUp / PageDown) -> cycle weather
      if (code === 427 || code === 428 || e.key === "PageUp" || e.key === "PageDown") {
        e.preventDefault();
        handleAction("refresh-weather");
        return;
      }

      // Spatial 2D D-Pad Arrow navigation based on bounding rectangles
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) !== -1 ||
          [37, 38, 39, 40].indexOf(code) !== -1) {
        e.preventDefault();
        setRemoteBadge("🎮 D-Pad & Wheel Mode");
        if (idx === -1 && focusables.length > 0) {
          focusables[0].focus();
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

        focusables.forEach(function (candidate) {
          if (candidate === current) return;
          var r = candidate.getBoundingClientRect();
          var cx = r.left + r.width / 2;
          var cy = r.top + r.height / 2;
          var dx = cx - curCx;
          var dy = cy - curCy;

          var valid = false;
          if (isRight && dx > 16) valid = true;
          if (isLeft && dx < -16) valid = true;
          if (isDown && dy > 16) valid = true;
          if (isUp && dy < -16) valid = true;

          if (valid) {
            var dist = Math.sqrt(dx * dx + dy * dy);
            var orthoPenalty = (isLeft || isRight) ? Math.abs(dy) * 2.4 : Math.abs(dx) * 2.4;
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
    setInterval(runOledPixelShift, 60000);
    setupNavigation();
    initWebOS();
  });
})();
