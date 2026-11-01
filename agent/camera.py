#!/usr/bin/env python3
"""
Command Station camera agent.

Every INTERVAL seconds it grabs one frame from your camera with ffmpeg, shrinks it,
and sends it to your own Google Apps Script. It does not stream video: each run is a
second or so of light work, then it sleeps.

Needs: Python 3 (standard library only) and ffmpeg on PATH.
Setup: see agent/README.md. Your camera password lives only in agent/config.json on this computer.
"""
import base64
import json
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG = HERE / "config.json"
LOG = HERE / "camera.log"
MAX_B64 = 95_000          # Apps Script cache values are limited to about 100 KB
MIN_INTERVAL = 30


def log(msg):
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')}  {msg}"
    try:
        print(line, flush=True)
    except Exception:
        pass
    try:
        if LOG.exists() and LOG.stat().st_size > 200_000:
            LOG.write_text("")
        with LOG.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def load_config():
    try:
        cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(f"Missing {CONFIG}. Copy agent/config.example.json to agent/config.json and fill it in.")
    for key in ("source", "endpoint", "token"):
        if not cfg.get(key) or "PASTE" in str(cfg[key]) or "USERNAME" in str(cfg[key]):
            sys.exit(f"config.json: please fill in '{key}'.")
    cfg["interval"] = max(MIN_INTERVAL, int(cfg.get("interval", 120)))
    return cfg


def grab(source, width, quality):
    """Return one JPEG frame as bytes, or raise."""
    cmd = ["ffmpeg", "-loglevel", "error"]
    if source.lower().startswith("rtsp://"):
        cmd += ["-rtsp_transport", "tcp"]
    cmd += ["-i", source, "-frames:v", "1", "-vf", f"scale={width}:-2", "-q:v", str(quality), "-f", "mjpeg", "pipe:1"]
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)  # no console flash on Windows
    res = subprocess.run(cmd, capture_output=True, timeout=25, creationflags=flags)
    if res.returncode != 0 or not res.stdout:
        err = res.stderr.decode("utf-8", "replace").strip().splitlines()
        raise RuntimeError(err[-1] if err else "ffmpeg returned no image")
    return res.stdout


def fit_frame(source):
    """Try progressively smaller or lower-quality frames until the base64 fits the cache limit."""
    for width, quality in ((640, 7), (640, 12), (480, 12), (400, 16)):
        jpg = grab(source, width, quality)
        b64 = base64.b64encode(jpg).decode("ascii")
        if len(b64) <= MAX_B64:
            return b64
    raise RuntimeError("frame too large even at lowest quality")


def send(endpoint, token, b64):
    url = endpoint + ("&" if "?" in endpoint else "?") + urllib.parse.urlencode({"action": "camera", "token": token})
    body = json.dumps({"image": b64, "takenAt": time.strftime("%Y-%m-%dT%H:%M:%S%z")}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "text/plain;charset=utf-8"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        out = json.loads(resp.read().decode("utf-8", "replace") or "{}")
    if out.get("error"):
        raise RuntimeError(f"endpoint said: {out['error']}")


def once(cfg):
    b64 = fit_frame(cfg["source"])
    send(cfg["endpoint"], cfg["token"], b64)
    log(f"sent snapshot ({len(b64) // 1024} KB)")


def main():
    cfg = load_config()
    if "--once" in sys.argv:
        try:
            once(cfg)
        except Exception as e:
            sys.exit(f"failed: {e}")
        return
    log(f"started, every {cfg['interval']} s")
    fails = 0
    while True:
        try:
            once(cfg)
            fails = 0
        except Exception as e:
            fails += 1
            log(f"attempt failed ({fails}): {e}")
        time.sleep(min(cfg["interval"] * (1 + min(fails, 3)), 600) if fails else cfg["interval"])


if __name__ == "__main__":
    main()
