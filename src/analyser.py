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

    suffix = path.suffix.lower()

    # Existing V1 check
    if suffix in SUSPICIOUS_EXTENSIONS:
        findings.append(
            f"Suspicious file extension: {suffix}"
        )

    # V2: Detect double extensions
    suffixes = [item.lower() for item in path.suffixes]

    if len(suffixes) >= 2:
        previous_extension = suffixes[-2]

        if (
            previous_extension not in SUSPICIOUS_EXTENSIONS
            and suffix in SUSPICIOUS_EXTENSIONS
        ):
            findings.append(
                "Double extension detected"
            )

    return findings