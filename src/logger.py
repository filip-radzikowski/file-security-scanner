from datetime import datetime
from pathlib import Path


LOG_FILE = Path("logs/scan.log")


def log_scan(result):
    """Create and save an audit record for a completed file scan."""

    timestamp = datetime.now().isoformat()

    log_entry = {
        "timestamp": timestamp,
        "file": result["path"],
        "sha256": result["sha256"],
        "findings": result["findings"],
        "risk": result["risk"]
    }

    LOG_FILE.parent.mkdir(exist_ok=True)

    with LOG_FILE.open("a", encoding="utf-8") as log:
        log.write(f"{log_entry}\n")

    return log_entry