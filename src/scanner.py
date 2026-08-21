from pathlib import Path
from src.hasher import calculate_sha256
from src.analyser import analyze_file


def scan_file(file_path):
    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError(f"File not found: {file_path}")

    file_hash = calculate_sha256(path)
    findings = analyze_file(path)

    return {
        "path": str(path),
        "sha256": file_hash,
        "findings": findings
    }