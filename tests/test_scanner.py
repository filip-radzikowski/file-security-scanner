from src.scanner import scan_file

result = scan_file("tests/test_file.txt")

print(f"File: {result['path']}")
print(f"SHA-256: {result['sha256']}")
print(f"Findings: {result['findings']}")