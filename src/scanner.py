from pathlib import Path
from datetime import datetime

from src.hasher import calculate_sha256
from src.analyser import analyze_file
from src.risk_engine import calculate_risk
from src.logger import log_scan


def scan_file(file_path):
    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError(f"File not found: {file_path}")

    file_hash = calculate_sha256(path)
    findings = analyze_file(path)
    risk = calculate_risk(findings)

    stat = path.stat()

    result = {
        "path": str(path),
        "name": path.name,
        "extension": path.suffix.lower(),
        "size": stat.st_size,
        "created": datetime.fromtimestamp(
            stat.st_ctime
        ).isoformat(timespec="seconds"),
        "modified": datetime.fromtimestamp(
            stat.st_mtime
        ).isoformat(timespec="seconds"),
        "sha256": file_hash,
        "findings": findings,
        "risk": risk["level"],
        "risk_score": risk["score"]
    }

    log_entry = log_scan(result)

    return {
        "result": result,
        "log": log_entry
    }


def scan_directory(directory_path):
    directory = Path(directory_path)

    if not directory.is_dir():
        raise NotADirectoryError(
            f"Directory not found: {directory_path}"
        )

    results = []

    for file_path in directory.rglob("*"):
        if file_path.is_file():
            try:
                scan = scan_file(file_path)
                results.append(scan)

            except (OSError, PermissionError) as error:
                results.append({
                    "result": {
                        "path": str(file_path),
                        "name": file_path.name,
                        "extension": file_path.suffix.lower(),
                        "size": None,
                        "created": None,
                        "modified": None,
                        "sha256": None,
                        "findings": [
                            f"Unable to scan file: {error}"
                        ],
                        "risk": "UNKNOWN",
                        "risk_score": 0
                    },
                    "log": None
                })

    summary = {
        "total": len(results),
        "low": sum(
            1 for item in results
            if item["result"]["risk"] == "LOW"
        ),
        "medium": sum(
            1 for item in results
            if item["result"]["risk"] == "MEDIUM"
        ),
        "high": sum(
            1 for item in results
            if item["result"]["risk"] == "HIGH"
        ),
        "unknown": sum(
            1 for item in results
            if item["result"]["risk"] == "UNKNOWN"
        )
    }

    # UNKNOWN takes priority because the folder
    # could not be completely assessed.
    unknown_count = summary["unknown"]

    if unknown_count > 0:
        overall_risk = "UNKNOWN"
        overall_score = 0
        highest_risk_file = None

    else:
        overall_risk = "LOW"
        overall_score = 0
        highest_risk_file = None

        for item in results:
            result = item["result"]

            if result["risk_score"] > overall_score:
                overall_score = result["risk_score"]
                overall_risk = result["risk"]
                highest_risk_file = result["path"]

    return {
        "directory": str(directory),
        "results": results,
        "summary": summary,
        "risk": overall_risk,
        "risk_score": overall_score,
        "highest_risk_file": highest_risk_file
    }