from src.scanner import scan_file
from src.report import generate_report


def main():
    print("=" * 40)
    print("       FILE SECURITY SCANNER")
    print("=" * 40)

    file_path = input("\nEnter file path: ").strip()

    if not file_path:
        print("\nError: No file path provided.")
        return

    try:
        scan = scan_file(file_path)
        report = generate_report(scan["result"])

        print("\n" + report)

    except FileNotFoundError:
        print("\nError: File not found.")


if __name__ == "__main__":
    main()