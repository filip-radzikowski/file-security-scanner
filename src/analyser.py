from pathlib import Path


SUSPICIOUS_EXTENSIONS = {
    ".exe",
    ".bat",
    ".cmd",
    ".scr",
    ".ps1",
    ".vbs",
    ".js",
}


def analyze_file(file_path):
    path = Path(file_path)
    findings = []

    if path.suffix.lower() in SUSPICIOUS_EXTENSIONS:
        findings.append(
            f"Suspicious file extension: {path.suffix.lower()}"
        )

    return findings