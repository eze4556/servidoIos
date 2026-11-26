"""Instrument only the isolated simulator build for screenshot navigation/readiness."""
from pathlib import Path
p = Path("ios/App/App/SceneDelegate.swift")
s = p.read_text()
assert "ScreenshotBridgeViewController" not in s
s = s.replace("import Capacitor", "import Capacitor\nimport WebKit")
s = s.replace("CAPBridgeViewController()", "ScreenshotBridgeViewController()")
s += "\n" + Path("scripts/ios-screenshot-driver.swift").read_text(encoding="utf-8-sig")
p.write_text(s)
