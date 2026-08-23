from pathlib import Path
import ctypes


SUSPICIOUS_EXTENSIONS = {
    ".exe",
    ".bat",
    ".cmd",
    ".scr",
    ".ps1",
    ".vbs",
    ".js",
}


FILE_SIGNATURES = {
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".png": b"\x89PNG\r\n\x1a\n",
    ".gif": b"GIF8",
    ".pdf": b"%PDF",
    ".zip": b"PK\x03\x04",
    ".exe": b"MZ",
}


def is_hidden_file(path):
    """Return True if a file has the Windows Hidden attribute."""

    try:
        attributes = ctypes.windll.kernel32.GetFileAttributesW(str(path))

        if attributes == -1:
            return False

        return bool(attributes & 0x2)

    except AttributeError:
        return False


def analyze_file(file_path):
    path = Path(file_path)
    findings = []

    suffix = path.suffix.lower()

    # V1: Suspicious extension check
    if suffix in SUSPICIOUS_EXTENSIONS:
        findings.append(
            f"Suspicious file extension: {suffix}"
        )

    # V2: Double extension detection
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

    # V2: Extension/content mismatch detection
    expected_signature = FILE_SIGNATURES.get(suffix)

    if expected_signature:
        try:
            with path.open("rb") as file:
                file_signature = file.read(
                    len(expected_signature)
                )

            detected_extension = None

            for extension, signature in FILE_SIGNATURES.items():
                if file_signature.startswith(signature):
                    detected_extension = extension
                    break

            if (
                detected_extension
                and detected_extension != suffix
            ):
                findings.append(
                    "Extension/content mismatch"
                )

        except OSError:
            pass

    # V2: Hidden file detection
    if is_hidden_file(path):
        findings.append(
            "Hidden file detected"
        )

    return findings