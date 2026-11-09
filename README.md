# LG B1 77" OLED Smart TV Dashboard (`com.custom.dashboard`)

Custom 10-foot webOS Smart TV Command Center tailored for the **LG B1 77-inch 4K OLED TV (`OLED77B1`, webOS 6.0 / Chromium 79)** with full **LG Magic Remote (`MR21GA`)** and **Luna Service Bus native app launching** integration.

---

## Compatibility & Optimizations for LG B1 77" OLED (webOS 6.0)

1. **webOS 6.0 / Chromium 79 Web Engine Compatibility**:
   - Uses explicit margin fallbacks alongside CSS Grid `grid-gap`/`gap` so layouts render identically on webOS 6.0's Chromium 79 engine (which predates Flexbox `gap` in Chrome 84).
   - Uses `XMLHttpRequest` (`status === 0` / `200`) in `webOSTV.js` so `appinfo.json` loads reliably from the TV's local `file://` package filesystem.
   - Includes both `icon.png` (`80×80`) and `largeIcon.png` (`130×130`) required by the webOS 6.0 Full-Screen Home Launcher.
2. **77" OLED Panel Care**:
   - **Automatic Pixel Shift**: Subtly shifts the dashboard canvas by `±2px` every 60 seconds to prevent static image retention on the 77" OLED panel.
   - **OLED Pure Black Eco Mode**: Switches the background to `#000000` (turning off unlit OLED subpixels completely) via the **OLED Care & Energy** card or the **🟢 Green Magic Remote button**.
   - **HDMI 2.1 (4K@120Hz / eARC) Quick Input**: Dedicated tile for **HDMI 3** (the LG B1's 4K@120Hz eARC/VRR port) and **HDMI 1**.
3. **LG Magic Remote (`MR21GA`) Full Integration**:
   - **🪄 Air Mouse Pointer**: Hovering and clicking any card or app tile synchronizes focus automatically (`mouseenter` + `cursorStateChange`), preventing dual-highlight conflicts between pointer hover and D-Pad focus.
   - **◎ Scroll Wheel**: Rolling the physical wheel cycles focus smoothly across dashboard cards and tiles; pressing the wheel (`keyCode 13`) activates the selection.
   - **▲▼◄► D-Pad Spatial Navigation**: 2D bounding-box spatial navigation between cards and the 4×2 quick-launch grid.
   - **🔴 🟢 🟡 🔵 Color Shortcut Keys**:
     - 🔴 **Red (`403`)**: Launch **YouTube** (`youtube.leanback.v4`)
     - 🟢 **Green (`404`)**: Toggle **77" OLED Pure Black Eco Mode**
     - 🟡 **Yellow (`405`)**: Ping **Luna System Bus** (`luna://com.webos.service.systemservice/clock/getTime`)
     - 🔵 **Blue (`406`)**: Switch to **HDMI 1** (`com.webos.app.hdmi1`)
   - **↩ Back Button (`461`)**: Returns focus to the first card, or exits to the webOS Home Launcher via `webOS.platformBack()` when pressed at the root tile.

---

## Required Software / Files to Download for TV Deployment

All runtime code (`webOSTV.js`, `webOSTV-dev.js`, `app.js`, `index.html`, `styles.css`, `appinfo.json`, `icon.png`, `largeIcon.png`) and the pre-built package (`com.custom.dashboard_1.0.0_all.ipk`) are **already included in this repository**.

To package and install the `.ipk` onto your **77" LG B1 OLED TV**, you only need:

1. **On your LG B1 OLED TV**:
   - Open the **LG Content Store** (Apps) and download the official **Developer Mode** app.
   - Sign in with your free LG Developer account, toggle **Dev Mode Status: ON** (the TV will reboot), and enable **Key Server**. Note the **TV IP Address** and **6-character Passphrase**.
2. **On your PC**:
   - **LG webOS CLI (`@webos-tools/cli`)** — automatically installed by running `.\deploy-lg-b1.ps1`, or manually via:
     ```powershell
     npm install -g @webos-tools/cli
     ```

### Build & Deploy with One Command

```powershell
# Package directly in project folder (creates com.custom.dashboard_1.0.0_all.ipk)
ares-package .

# Or use the deployment script to package, authenticate, install, and launch on your LG B1 TV
.\deploy-lg-b1.ps1 -TvIp "192.168.1.50" -Passphrase "ABCDEF"
```

