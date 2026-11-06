/*
 * webOSTV.js – Lightweight LG webOS TV SDK Bridge & Browser Development Polyfill
 * Provides window.webOS APIs (service.request, deviceInfo, systemInfo, fetchAppId, platformBack)
 */
(function (global) {
  "use strict";

  var isWebOSTV = typeof global.PalmSystem !== "undefined" || /web0s|webos/i.test(navigator.userAgent);

  var webOS = {
    apiVersion: "1.2.8",
    platform: {
      tv: isWebOSTV
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
      fetch(infoPath)
        .then(function (r) { return r.json(); })
        .then(function (info) { if (callback) callback(info); })
        .catch(function () { if (callback) callback(undefined); });
    },

    deviceInfo: function (callback) {
      if (!this.device) {
        this.device = {
          modelName: isWebOSTV ? "LG webOS Smart TV" : "Browser Simulator (1080p)",
          version: "6.0.0",
          versionMajor: 6,
          versionMinor: 0,
          versionDot: 0,
          sdkVersion: "6.0",
          screenWidth: global.screen ? global.screen.width : 1920,
          screenHeight: global.screen ? global.screen.height : 1080,
          uhd: (global.screen && global.screen.width >= 3840) || false
        };
      }
      if (isWebOSTV) {
        this.service.request("luna://com.webos.service.tv.systemproperty", {
          method: "getSystemInfo",
          parameters: { keys: ["modelName", "firmwareVersion", "UHD", "sdkVersion"] },
          onSuccess: function (res) {
            webOS.device.modelName = res.modelName || webOS.device.modelName;
            webOS.device.version = res.firmwareVersion || webOS.device.version;
            webOS.device.sdkVersion = res.sdkVersion || webOS.device.sdkVersion;
            webOS.device.uhd = res.UHD === "true" || res.UHD === true;
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
      return {
        country: "DE",
        smartServiceCountry: "DE",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      };
    },

    platformBack: function () {
      if (global.PalmSystem && global.PalmSystem.platformBack) {
        global.PalmSystem.platformBack();
      }
    },

    service: {
      request: function (uri, params) {
        params = params || {};
        var fullUri = uri + "/" + (params.method || "");
        if (typeof global.PalmServiceBridge !== "undefined") {
          var bridge = new global.PalmServiceBridge();
          bridge.onservicecallback = function (msg) {
            try {
              var parsed = JSON.parse(msg);
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
            cancel: function () { bridge.cancel(); }
          };
        } else {
          // Local browser simulation response
          setTimeout(function () {
            var mock = { returnValue: true, simulated: true, uri: fullUri, timestamp: Date.now() };
            if (params.onSuccess) params.onSuccess(mock);
            if (params.onComplete) params.onComplete(mock);
          }, 50);
          return { cancel: function () {} };
        }
      }
    }
  };

  global.webOS = webOS;
})(window);
