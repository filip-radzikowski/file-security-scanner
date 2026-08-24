from pathlib import Path

from src.analyser import analyze_file
from src.risk_engine import calculate_risk


def test_normal_file(tmp_path):
    file = tmp_path / "normal.txt"
    file.write_text("hello")

    findings = analyze_file(file)
    risk = calculate_risk(findings)

    assert findings == []
    assert risk["level"] == "LOW"
    assert risk["score"] == 0


def test_suspicious_extension(tmp_path):
    file = tmp_path / "test.exe"
    file.write_bytes(b"MZ")

    findings = analyze_file(file)
    risk = calculate_risk(findings)

    assert "Suspicious file extension: .exe" in findings
    assert risk["score"] >= 30


def test_double_extension(tmp_path):
    file = tmp_path / "invoice.pdf.exe"
    file.write_bytes(b"MZ")

    findings = analyze_file(file)

    assert "Double extension detected" in findings


def test_valid_jpeg(tmp_path):
    file = tmp_path / "photo.jpg"
    file.write_bytes(
        b"\xff\xd8\xff" + b"test image data"
    )

    findings = analyze_file(file)

    assert "Extension/content mismatch" not in findings


def test_empty_jpeg_not_mismatch(tmp_path):
    file = tmp_path / "empty.jpg"
    file.write_bytes(b"")

    findings = analyze_file(file)

    assert "Extension/content mismatch" not in findings


def test_hidden_file(tmp_path):
    file = tmp_path / "hidden.txt"
    file.write_text("hidden")

    # Hidden attribute testing is Windows-specific.
    import ctypes

    ctypes.windll.kernel32.SetFileAttributesW(
        str(file),
        0x2
    )

    findings = analyze_file(file)

    assert "Hidden file detected" in findings