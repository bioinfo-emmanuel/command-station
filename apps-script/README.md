# Data endpoint (Google Apps Script)

Browsers cannot read a Google Calendar iCal link directly, and your Sheet and tasks should stay private.
This small script runs in your own Google account and serves one JSON feed to the dashboard.
The feed is protected by a token that only you and the tablet know.

## Set up (about 10 minutes, once)

1. Create a Google Sheet for the dashboard. Add three tabs named exactly `Writing`, `Focus` and `Research`.
   Import the starter files from `templates/` (File > Import > Upload, "Replace current sheet") or copy the headers by hand.
2. In the Sheet: **Extensions > Apps Script**. Delete the sample code and paste in `Code.gs` from this folder.
3. Enable tasks: left sidebar **Services (+) > Google Tasks API > Add**.
4. Set your token: **Project Settings (gear) > Script properties > Add script property**.
   Property `TOKEN`, value any long random string (for example 30 random letters and digits). Save.
5. **Deploy > New deployment > Web app.**
   Execute as: **Me**. Who has access: **Anyone**. Deploy and approve the permission prompts
   (Calendar, Sheets, Tasks). Copy the **Web app URL** (ends in `/exec`).
6. On the dashboard, open **Settings**, paste the URL and the token, and press **Test connection**.

"Anyone" means anyone who has the URL, and the script still refuses requests without your token. Treat the URL and token like a password.

## After you change the script

Deploy > Manage deployments > edit (pencil) > Version: **New version** > Deploy. The URL stays the same.

## Feed shape

```json
{
  "updatedAt": "2026-11-02T01:00:00.000Z",
  "events":   [{ "title": "", "start": "ISO", "end": "ISO", "allDay": false, "location": "", "calendar": "" }],
  "tasks":    [{ "title": "", "due": "ISO or empty", "list": "", "done": false }],
  "writing":  [{ "project": "", "words_this_week": 0, "last_touched": "ISO", "sections_total": 5, "sections_done": 2, "touched_dates": "2026-10-30, 2026-11-01" }],
  "focus":    [{ "date": "ISO", "minutes": 0 }],
  "research": [{ "title": "", "group": "", "role": "", "steps": "A > B > C", "current_step": 2,
                 "next_milestone": "", "milestone_date": "ISO", "last_update": "ISO", "public": false }]
}
```

## Camera snapshots (optional)

`Code.gs` also accepts pictures from the Windows camera agent (`agent/README.md`). After pasting a newer `Code.gs` you must redeploy: **Deploy > Manage deployments > pencil > Version: New version > Deploy**. The link stays the same. Snapshots are held in the script cache for up to 6 hours and are not saved to your Drive.
