from src.scanner import scan_file

result = scan_file("test_file.txt")

print(f"File: {result['path']}")
print(f"SHA-256: {result['sha256']}")