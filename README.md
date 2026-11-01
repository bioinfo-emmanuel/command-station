# Command Station

A full-screen dashboard for a secondary monitor (Galaxy Tab S7 FE in DeX, running in Fully Kiosk or Chrome).
It is a static site: no build step, no server needed for the cloud-backed parts.

## Run it locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Useful URL options:

| Option | Effect |
| --- | --- |
| `?theme=night` | Night theme. Also `light` (default) and `auto` (follows the device). |

The page is designed at 1920x1080 and scales to fit any screen.

## Structure

```
index.html        page shell
css/theme.css     design tokens (light and night)
css/app.css       layout and components
js/main.js        wiring: theme, scaling, clock, pills, heat index
js/heat.js        heat index (Rothfusz) and PAGASA bands
js/companion.js   DNA companion
js/mock.js        sample data, replaced source by source
```

## Roadmap

1. Foundation: header, DNA companion, heat index, status pills (this PR)
2. Agenda and tasks from Google Calendar
3. Metric tiles and research supervision from a Google Sheet
4. Settings panel and the other companions
5. Local agent for the Tapo camera and Bambu A1 Mini

The heat index is computed from forecast temperature and humidity. It is an estimate, not an official PAGASA reading.
