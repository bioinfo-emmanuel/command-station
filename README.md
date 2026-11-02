# Command Station

A full-screen dashboard for a secondary monitor (Galaxy Tab S7 FE in DeX, running in Fully Kiosk or Chrome).
It is a static site: no build step, no server needed for the cloud-backed parts.

## Run it locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Open the gear icon for **Settings**: your name, theme, coordinates (weather, heat index, rain outlook, sun arc), the **companion** (DNA, Mosquito, Shade, Orbit, Pulse, Keycap), the **Motion** switches (all motion, animated icons, ambient life, sun and moon arc, weather moods), the optional **Writing** and **Focus today** tiles, and the private data link.

The right column shows a **Tablet** panel: battery with a 24 hour history, charging or time left, network, this page's memory and storage, how long the page has been running, and how fresh each data feed is. A web page cannot read CPU load or temperature, so those are not shown. Memory is Chrome only.

**Focus timer.** The tomato button in the header opens a Pomodoro card. Pick Classic 25/5/15, Short 15/3/10 or Deep 50/10/30, or nudge each length with the + and - buttons. While it runs the right column widens, Writing and Research step aside, the clock dims and blurs, and the companion speeds up. Breaks keep the same layout. The session only ends when you press and hold **Hold to end** for about a second. A soft chime marks each phase (switch it off in Settings). Finished focus minutes are stored on the tablet and added to the Focus tile; they are not written to the Sheet.

**Colorful cards** (Settings > Look, on by default) tints each card header, colors task tags by name and shows a friendlier "Clear day" panel when nothing is left on the calendar. Switch it off for the plain white look.

The optional Writing tile's streak helix reads an optional `touched_dates` column on the Writing tab (comma separated dates such as `2026-10-30, 2026-11-01`). Without it, only the `last_touched` day is marked.
Settings are saved only in that browser, never in this repo.

## Install it as an app

In Chrome on the tablet open the page, then menu > **Install app** (or Add to Home screen). You get a Command Station icon that opens full-screen.

Useful URL options:

| Option | Effect |
| --- | --- |
| `?theme=night` | Night theme. Also `light` (default) and `auto` (follows the device). |
| `?laptop=asleep` | Preview the laptop-asleep state (camera and printer resting). |

The page is designed at 1920x1080 and scales to fit any screen.

## Structure

```
index.html        page shell
css/theme.css     design tokens (light and night)
css/app.css       header, settings and shared components
css/cards.css     board cards
js/main.js        wiring: theme, scaling, clock, pills, heat index
js/heat.js        heat index (Rothfusz) and PAGASA bands
js/companion.js   the six companions, pace and cheer
js/icons.js       animated card header icons and the data heartbeat
js/sun.js         sunrise and sunset, sun and moon arc
js/tablet.js      tablet health panel
js/pomo.js        focus timer
js/fx.js          bead bursts, rolling numbers, screen wake lock
css/motion.css    all motion and the Settings switches that turn it off
js/mock.js        sample status data
js/model.js       sample model and normalizer for the Apps Script feed
js/cards.js       card renderers (all external text is escaped)
js/config.js      on-device settings (localStorage)
js/weather.js     live forecast from Open-Meteo, with cached and sample fallbacks
js/flood.js       rain-only flood watch heuristic
js/backend.js     reads calendar, tasks, Sheet tabs and the camera snapshot from your Apps Script link
agent/            Windows script that sends camera snapshots (setup in its README)
apps-script/      the script you paste into Google (setup in its README)
templates/        starter CSVs for the Sheet tabs
sw.js, manifest.webmanifest, icons/   installable app support
```

## Data sources

| Source | Where it runs | Status |
| --- | --- | --- |
| Weather, heat index, rain outlook | Open-Meteo, from the tablet | Live |
| Calendar, tasks, Sheet tabs | Your own Google Apps Script | Cards built; show sample data until the link is connected |
| Camera snapshot | `agent/camera.py` on the laptop, via your Apps Script | Live once the script runs; otherwise resting or sample |
| Printer, laptop stats | Local agent at home | Cards built with sample visuals; agent not built yet |

The flood watch is a rain-only estimate from forecast rainfall. It is not a river-level reading.

## Roadmap

1. Foundation: header, DNA companion, heat index, status pills (done)
1b. Data layer: settings, live weather and rain outlook, data link, installable app (done)
2. Cards: agenda, tasks, tiles, research, camera, printer (done)
2b. Camera snapshots every 1 to 3 minutes (this PR)
3. Full research view and editable steps
4. Companion picker, animated icons, tablet panel, motion (done)
5. Local agent for the Bambu A1 Mini

The heat index is computed from forecast temperature and humidity. It is an estimate, not an official PAGASA reading.
