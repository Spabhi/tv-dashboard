# LG B1 77" OLED Command Center (`com.custom.dashboard`)

Custom 4K (`3840×2160`) 10-foot webOS Smart TV Command Center tailored for the **LG B1 77-inch 4K OLED TV (`OLED77B1`, webOS 6.0 / Chromium 79)** with full **LG Magic Remote (`MR21GA`)** and **Luna Service Bus native app launching** integration.

---

## Core Features

1. **Local Weather Station (`async fetchWeather(lat, lon)`)**:
   - Fetches real-time **temperature**, **wind speed**, **precipitation (`mm`)**, **humidity**, **high/low**, **sky conditions**, and a **4-day forecast** from Open-Meteo (`https://api.open-meteo.com/v1/forecast`) using exact latitude & longitude.
   - Supports **Auto-Detecting Exact Coordinates** (IP / GPS geolocation) or typing a **City Name / Latitude / Longitude** directly via the **LG TV On-Screen Keyboard** (with automatic city geocoding).
   - Persists city coordinates and temperature unit (`°C` / `°F`) in `localStorage` (`tv_coords`).

2. **Dynamic Quick App & External Input Launchers (`tv_apps`)**:
   - Large 4K cards (`min 200px × 200px` on a 4K canvas, `#141414` card surface with `scale(1.05)` and `#ffffff` glow on hover/focus).
   - Launches native webOS apps and external inputs directly via `luna://com.webos.applicationManager`:
     - **YouTube** (`youtube.leanback.v4`), **Disney+** (`com.disney.disneyplus-prod`), **Prime Video** (`amazon`), **Crunchyroll** (`crunchyroll`), **Netflix** (`netflix`)
     - **HDMI 1** (`com.webos.app.hdmi1`), **HDMI 2** (`com.webos.app.hdmi2`), **HDMI 3 4K@120Hz eARC** (`com.webos.app.hdmi3`), **HDMI 4 120Hz** (`com.webos.app.hdmi4`)
     - **Media / USB** (`com.webos.app.photovideo`), **Live TV** (`com.webos.app.livetv`), **Web Browser** (`com.webos.app.browser`), plus any custom shortcut added in the modal.
   - Persists active/checked shortcuts in `localStorage` (`tv_apps`).

3. **On-Screen Customization Modal Overlay**:
   - Opens when clicking **⚙️ Customize** or pressing the **🟢 Green button (`404`)** on the Magic Remote.
   - Check/uncheck app shortcuts (immediately updating the live layout), enter a new city or exact coordinates using the TV's on-screen keyboard, add custom app/device IDs, or switch accent themes.

4. **77" LG B1 OLED Panel Protection**:
   - **True Pitch-Black (`#000000`) Root Background**: Completely turns off unlit self-lit OLED pixels on the 77-inch B1 panel, reducing power draw and preventing burn-in.
   - **10-Minute Idle OLED Dimmer**: Automatically dims the dashboard to **20% opacity (`opacity: 0.2`)** after 10 minutes without mouse, pointer, scroll wheel, or remote key activity, and restores 100% brightness immediately on interaction.
   - **Automatic Pixel Shift**: Subtly shifts the canvas by `±2px` every 60 seconds.

5. **Full LG Magic Remote (`MR21GA`) Integration**:
   - Every interactive card, forecast/metric tile, footer chip, checkbox, and settings input includes `tabindex="0"` for seamless switching between **Magic Remote Air Pointer** (`supportMouse: true`, `cursorStateChange`, `mouseenter`) and the **directional Scroll Wheel / D-Pad**.
   - **Color Shortcut Keys**:
     - 🔴 **Red (`403`)**: Launch **YouTube** (`youtube.leanback.v4`)
     - 🟢 **Green (`404`)**: Open / Close **On-Screen Customization Overlay**
     - 🟡 **Yellow (`405`)**: Refresh Weather (`fetchWeather(lat, lon)`)
     - 🔵 **Blue (`406`)**: Switch to **HDMI 1** (`com.webos.app.hdmi1`)
   - **↩ Back (`461`)**: Closes the Customization Modal if open, returns focus to the Weather Card, or exits to webOS Home (`webOS.platformBack()`).

---

## Packaging & Deployment to LG B1 77" OLED TV

All runtime files, icon assets, official `webOSTV.js` / `webOSTV-dev.js` (`v1.2.4`), and the pre-built package (`com.custom.dashboard_1.0.0_all.ipk`) are included in this repository.

```powershell
# Package directly in project folder (validates against ApplicationDescription.schema)
ares-package .

# Or package, authenticate, install, and launch on your LG B1 TV over LAN
.\deploy-lg-b1.ps1 -TvIp "192.168.1.50" -Passphrase "ABCDEF"
```
