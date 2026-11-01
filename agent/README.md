# Camera agent (Windows)

A small Python script that sends one still picture from your Tapo camera to your own Google Apps Script every couple of minutes. The dashboard shows the newest picture on the Downstairs card.

It is not a video stream. Each run takes about a second of light work, then the script sleeps until the next one, so it costs the laptop almost nothing. When the laptop sleeps or shuts down the pictures stop and the card shows "Camera is resting".

## What you need

- Python 3 (`python --version` in PowerShell)
- ffmpeg (`ffmpeg -version`; install with `winget install Gyan.FFmpeg`, then reopen PowerShell)
- Your Apps Script link and token (the same ones in the dashboard Settings)
- The camera's RTSP address that already plays in VLC

## 1. Update the Apps Script (once)

1. Open the Apps Script project, replace its code with the new `apps-script/Code.gs`.
2. **Deploy > Manage deployments > pencil icon > Version: New version > Deploy.** The link stays the same.

## 2. Make your private config

In PowerShell, from the repo folder:

```powershell
Copy-Item agent\config.example.json agent\config.json
notepad agent\config.json
```

Fill in `source` (the RTSP address with your camera account), `endpoint` (the Apps Script link) and `token`. `interval` is in seconds: 60 to 180 is a good range, 120 is the default.

`agent\config.json` is ignored by git, so your camera password stays on this laptop.

## 3. Test it once

```powershell
python agent\camera.py --once
```

You should see `sent snapshot (NN KB)`. Open the dashboard: the Downstairs card should show the picture within a minute.

## 4. Run it all the time

Try it in the foreground first: `python agent\camera.py` (Ctrl+C to stop). To start it hidden when you sign in to Windows:

```powershell
$here = (Resolve-Path agent).Path
$pyw = (Get-Command pythonw).Source
$lnk = (New-Object -ComObject WScript.Shell).CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Command Station Camera.lnk")
$lnk.TargetPath = $pyw
$lnk.Arguments = "`"$here\camera.py`""
$lnk.WorkingDirectory = $here
$lnk.WindowStyle = 7
$lnk.Save()
```

To stop it for good, delete that shortcut and end `pythonw.exe` in Task Manager. Errors are written to `agent\camera.log` (never your password).

## Troubleshooting

| Message | Meaning |
| --- | --- |
| `Missing ...config.json` | Step 2 not done. |
| `endpoint said: unauthorized` | Token differs from the Script property `TOKEN`. |
| `endpoint said: unknown action` / HTML error | Apps Script not redeployed as a New version (step 1). |
| `ffmpeg` not found | Reopen PowerShell after installing, or restart Windows once. |
| `Connection ... timed out` | Camera unreachable: laptop on a different network than the camera. |
