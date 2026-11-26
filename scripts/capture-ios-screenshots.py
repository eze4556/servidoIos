"""Capture the actual unsigned simulator app; no mocked UI or production writes.
Only the copied simulator bundle's Capacitor start route changes between captures.
Run on the isolated Codemagic Mac after building for iphonesimulator.
"""
import json
import os
from pathlib import Path
import subprocess
import time
import zipfile

ROOT = Path.cwd()
APP = ROOT / "build/screenshots/Build/Products/Debug-iphonesimulator/App.app"
OUT = ROOT / "build/app-store-screenshots"
BUNDLE = "ar.com.servido.app"
ROUTES = [("01-inicio", ""), ("02-productos", "products/"),
          ("03-servicios", "services/"), ("04-restaurantes", "restaurantes/")]


def run(*args, capture=False, check=True):
    return subprocess.run(args, check=check, text=True, capture_output=capture)


def main():
    if not APP.is_dir():
        raise RuntimeError(f"Missing simulator app: {APP}")
    OUT.mkdir(parents=True, exist_ok=True)
    devices = json.loads(run("xcrun", "simctl", "list", "devices", "available", "--json", capture=True).stdout)
    available = [d for group in devices["devices"].values() for d in group if d.get("isAvailable")]
    def pick(names):
        for name in names:
            matches = [d for d in available if d["name"] == name]
            if matches:
                return matches[0]
        raise RuntimeError(f"No supported simulator for {names}; available: {[d['name'] for d in available]}")
    targets = [("iphone", pick(["iPhone 17 Pro Max", "iPhone 16 Pro Max"])),
               ("ipad", pick(["iPad Pro 13-inch (M5)", "iPad Pro 13-inch (M4)", "iPad Pro (13-inch) (M4)"]))]
    config_path = APP / "capacitor.config.json"
    original = config_path.read_text()
    manifest = {"commit": os.getenv("CM_COMMIT"), "source": "Native iOS Simulator, actual bundled Servido UI and public catalog, no login or writes", "captures": []}
    try:
        for family, device in targets:
            udid = device["udid"]
            run("xcrun", "simctl", "boot", udid, check=False)
            run("xcrun", "simctl", "bootstatus", udid, "-b")
            run("xcrun", "simctl", "status_bar", udid, "override", "--time", "9:41", "--dataNetwork", "wifi", "--wifiMode", "active", "--wifiBars", "3", "--batteryState", "charged", "--batteryLevel", "100")
            run("xcrun", "simctl", "install", udid, str(APP))
            # Simulator-only permission and synthetic location: never a real user location.
            run("xcrun", "simctl", "privacy", udid, "grant", "location", BUNDLE)
            run("xcrun", "simctl", "location", udid, "set", "-32.94682,-60.63932")
            container = Path(run("xcrun", "simctl", "get_app_container", udid, BUNDLE, "data", capture=True).stdout.strip())
            for label, route in ROUTES:
                run("xcrun", "simctl", "terminate", udid, BUNDLE, check=False)
                state_file = container / "Documents/capture-state.json"
                state_file.unlink(missing_ok=True)
                env = dict(os.environ, SIMCTL_CHILD_SERVIDO_SCREENSHOT_ROUTE="/" + route)
                subprocess.run(["xcrun", "simctl", "launch", udid, BUNDLE], env=env, check=True)
                deadline = time.monotonic() + 180
                state = {}
                while time.monotonic() < deadline:
                    time.sleep(5)
                    if state_file.exists():
                        state = json.loads(state_file.read_text())
                        if state.get("ready"):
                            break
                else:
                    raise RuntimeError(f"Screen did not settle: {family}/{route}: {state}")
                print(f"Verified actual app screen: {state}", flush=True)
                filename = f"{family}-{label}.png"
                run("xcrun", "simctl", "io", udid, "screenshot", str(OUT / filename))
                manifest["captures"].append({"file": filename, "device": device["name"], "route": "/" + route})
                print(f"Captured {filename} on {device['name']}", flush=True)
            run("xcrun", "simctl", "shutdown", udid)
    finally:
        config_path.write_text(original)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    with zipfile.ZipFile(OUT.parent / "Servido_App_Store_Capturas.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(OUT.iterdir()):
            archive.write(file, file.name)


if __name__ == "__main__":
    main()
