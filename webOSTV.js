/*
 * webOSTV.js – Lightweight LG webOS TV SDK Bridge & Browser Development Polyfill
 * Target: LG B1 77" 4K OLED TV (OLED77B1 / webOS 6.0 / Chromium 79)
 * Provides window.webOS APIs (service.request, launchApp, deviceInfo, systemInfo, fetchAppId, platformBack, keyboard)
 */
(function (global) {
  "use strict";

  var isWebOSTV =
    typeof global.PalmSystem !== "undefined" ||
    typeof global.PalmServiceBridge !== "undefined" ||
    /web0s|webos|netcast|lg browser/i.test(navigator.userAgent);

  var webOS = {
    apiVersion: "1.2.8",
    platform: {
      tv: isWebOSTV
    },

    keyboard: {
      isShowing: function () {
        return !!(global.PalmSystem && global.PalmSystem.isKeyboardVisible);
      }
    },

    fetchAppId: function () {
      if (global.PalmSystem && global.PalmSystem.identifier) {
        return global.PalmSystem.identifier.split(" ")[0];
      }
      return "com.spabhi.tvdashboard";
    },

    fetchAppRootPath: function () {
      var base = window.location.href;
      if ("baseURI" in window.document) {
        base = window.document.baseURI;
      } else {
        var baseTags = window.document.getElementsByTagName("base");
        if (baseTags.length > 0) base = baseTags[0].href;
      }
      var match = base.match(new RegExp(".*://[^#]*?/"));
      return match ? match[0] : "";
    },

    fetchAppInfo: function (callback, path) {
      var infoPath = path || (this.fetchAppRootPath() + "appinfo.json");
      if (typeof global.XMLHttpRequest !== "undefined") {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", infoPath, true);
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 0) {
              try {
                if (callback) callback(JSON.parse(xhr.responseText));
                return;
              } catch (e) {
                // Fall through
              }
            }
            if (callback) callback(undefined);
          }
        };
        xhr.send(null);
      } else if (typeof fetch !== "undefined") {
        fetch(infoPath)
          .then(function (r) { return r.json(); })
          .then(function (info) { if (callback) callback(info); })
          .catch(function () { if (callback) callback(undefined); });
      }
    },

    deviceInfo: function (callback) {
      if (!this.device) {
        this.device = {
          modelName: isWebOSTV ? "LG OLED77B1 4K Smart TV" : "OLED77B1 Sim (77\" 4K OLED)",
          version: "06.40.50",
          versionMajor: 6,
          versionMinor: 40,
          versionDot: 50,
          sdkVersion: "6.0",
          screenWidth: global.screen ? global.screen.width : 1920,
          screenHeight: global.screen ? global.screen.height : 1080,
          uhd: true,
          oled: true,
          hdr10: true,
          dolbyVision: true,
          dolbyAtmos: true
        };
      }
      if (isWebOSTV) {
        this.service.request("luna://com.webos.service.tv.systemproperty", {
          method: "getSystemInfo",
          parameters: { keys: ["modelName", "firmwareVersion", "UHD", "sdkVersion", "oled"] },
          onSuccess: function (res) {
            webOS.device.modelName = res.modelName || webOS.device.modelName;
            webOS.device.version = res.firmwareVersion || webOS.device.version;
            webOS.device.sdkVersion = res.sdkVersion || webOS.device.sdkVersion;
            if (typeof res.UHD !== "undefined") {
              webOS.device.uhd = res.UHD === "true" || res.UHD === true;
            }
            if (typeof res.oled !== "undefined") {
              webOS.device.oled = res.oled === "true" || res.oled === true;
            }
            if (callback) callback(webOS.device);
          },
          onFailure: function () {
            if (callback) callback(webOS.device);
          }
        });
      } else {
        setTimeout(function () { if (callback) callback(webOS.device); }, 10);
      }
    },

    systemInfo: function () {
      var tz = "UTC";
      try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      } catch (e) {
        tz = "UTC";
      }
      return {
        country: "DE",
        smartServiceCountry: "DE",
        timezone: tz
      };
    },

    platformBack: function () {
      if (global.PalmSystem && global.PalmSystem.platformBack) {
        global.PalmSystem.platformBack();
      }
    },

    // Launch native apps directly from your custom dashboard button
    launchApp: function (appId, launchParams, callbacks) {
      var targetId = appId || "youtube.leanback.v4";
      var cb = callbacks || {};
      var payload = { id: targetId };
      if (launchParams && typeof launchParams === "object") {
        payload.params = launchParams;
      }
      return this.service.request("luna://com.webos.applicationManager", {
        method: "launch",
        parameters: payload, // e.g. { id: "youtube.leanback.v4" }, "netflix", "com.webos.app.hdmi1"
        onSuccess: function (res) {
          if (cb.onSuccess) cb.onSuccess(res);
        },
        onFailure: function (err) {
          if (cb.onFailure) cb.onFailure(err);
        }
      });
    },

    service: {
      request: function (uri, params) {
        params = params || {};
        var cleanUri = (uri || "").replace(/\/+$/, "");
        var fullUri = params.method ? (cleanUri + "/" + params.method.replace(/^\/+/, "")) : cleanUri;
        if (typeof global.PalmServiceBridge !== "undefined") {
          var bridge = new global.PalmServiceBridge();
          bridge.onservicecallback = function (msg) {
            try {
              var parsed = typeof msg === "string" ? JSON.parse(msg) : msg;
              if (parsed.returnValue === false || parsed.errorCode) {
                if (params.onFailure) params.onFailure(parsed);
              } else {
                if (params.onSuccess) params.onSuccess(parsed);
              }
              if (params.onComplete) params.onComplete(parsed);
            } catch (e) {
              if (params.onFailure) params.onFailure({ errorText: e.message });
            }
          };
          bridge.call(fullUri, JSON.stringify(params.parameters || {}));
          return {
            cancel: function () {
              if (bridge.cancel) bridge.cancel();
            }
          };
        } else {
          // Local browser simulation response
          setTimeout(function () {
            var mock = {
              returnValue: true,
              simulated: true,
              uri: fullUri,
              parameters: params.parameters || {},
              timestamp: Date.now()
            };
            if (params.onSuccess) params.onSuccess(mock);
            if (params.onComplete) params.onComplete(mock);
          }, 40);
          return { cancel: function () {} };
        }
      }
    }
  };

  global.webOS = webOS;
})(window);
