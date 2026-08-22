from src.scanner import scan_file
from src.report import generate_report


result = scan_file("tests/fixtures/test_file.txt")

print(generate_report(result["result"]))