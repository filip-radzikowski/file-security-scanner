from src.scanner import scan_file

scan = scan_file("tests/test_file.txt")

print("RESULT:")
print(scan["result"])

print("\nAUDIT LOG:")
print(scan["log"])