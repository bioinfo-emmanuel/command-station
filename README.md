# Command Station

A full-screen dashboard for a secondary monitor (Galaxy Tab S7 FE in DeX, running in Fully Kiosk or Chrome).
It is a static site: no build step, no server needed for the cloud-backed parts.

## Run it locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Open the gear icon for **Settings**: your name, theme, coordinates (weather, heat index, rain outlook) and the private data link.
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
js/companion.js   DNA companion
js/mock.js        sample status data
js/model.js       sample model and normalizer for the Apps Script feed
js/cards.js       card renderers (all external text is escaped)
js/config.js      on-device settings (localStorage)
js/weather.js     live forecast from Open-Meteo, with cached and sample fallbacks
js/flood.js       rain-only flood watch heuristic
js/backend.js     reads calendar, tasks and Sheet tabs from your Apps Script link
apps-script/      the script you paste into Google (setup in its README)
templates/        starter CSVs for the Sheet tabs
sw.js, manifest.webmanifest, icons/   installable app support
```

## Data sources

| Source | Where it runs | Status |
| --- | --- | --- |
| Weather, heat index, rain outlook | Open-Meteo, from the tablet | Live |
| Calendar, tasks, Sheet tabs | Your own Google Apps Script | Cards built; show sample data until the link is connected |
| Camera, printer, laptop stats | Local agent at home | Cards built with sample visuals; agent not built yet |

The flood watch is a rain-only estimate from forecast rainfall. It is not a river-level reading.

## Roadmap

1. Foundation: header, DNA companion, heat index, status pills (done)
1b. Data layer: settings, live weather and rain outlook, data link, installable app (done)
2. Cards: agenda, tasks, tiles, research, camera, printer (this PR, on sample data)
3. Full research view and editable steps
4. Companion picker and the other companions
5. Local agent for the Tapo camera and Bambu A1 Mini

The heat index is computed from forecast temperature and humidity. It is an estimate, not an official PAGASA reading.
