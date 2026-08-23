import tkinter as tk
from tkinter import filedialog

from src.scanner import scan_file



def main():
    window = tk.Tk()
    window.title("File Security Scanner")
    window.geometry("760x650")
    window.resizable(False, False)

    selected_path = tk.StringVar()

    # Header
    header = tk.Frame(window)
    header.pack(fill="x", padx=30, pady=(25, 10))

    title = tk.Label(
        header,
        text="FILE SECURITY SCANNER",
        font=("Arial", 22, "bold")
    )
    title.pack()

    subtitle = tk.Label(
        header,
        text="Defensive file analysis and risk assessment",
        font=("Arial", 11)
    )
    subtitle.pack(pady=(5, 0))

    # File selection
    file_frame = tk.LabelFrame(
        window,
        text=" File Selection ",
        font=("Arial", 11, "bold"),
        padx=15,
        pady=15
    )
    file_frame.pack(fill="x", padx=30, pady=15)

    selected_file = tk.Label(
        file_frame,
        text="No file selected",
        anchor="w",
        wraplength=650
    )
    selected_file.pack(fill="x")

    # Results
    results_frame = tk.LabelFrame(
        window,
        text=" Scan Results ",
        font=("Arial", 11, "bold"),
        padx=15,
        pady=15
    )
    results_frame.pack(fill="both", expand=True, padx=30, pady=15)

    risk_label = tk.Label(
        results_frame,
        text="Risk: --",
        font=("Arial", 16, "bold")
    )
    risk_label.pack(anchor="w", pady=(0, 15))

    file_label = tk.Label(
        results_frame,
        text="File: --",
        anchor="w",
        wraplength=650
    )
    file_label.pack(fill="x", pady=3)

    hash_label = tk.Label(
        results_frame,
        text="SHA-256: --",
        anchor="w",
        wraplength=650,
        justify="left"
    )
    hash_label.pack(fill="x", pady=3)

    findings_title = tk.Label(
        results_frame,
        text="Findings",
        font=("Arial", 11, "bold"),
        anchor="w"
    )
    findings_title.pack(fill="x", pady=(15, 3))

    findings_label = tk.Label(
        results_frame,
        text="No scan performed.",
        anchor="w",
        justify="left",
        wraplength=650
    )
    findings_label.pack(fill="x")

    decision_label = tk.Label(
        results_frame,
        text="Decision: --",
        font=("Arial", 11, "bold"),
        anchor="w"
    )
    decision_label.pack(fill="x", pady=(15, 3))

    timestamp_label = tk.Label(
        results_frame,
        text="Timestamp: --",
        anchor="w"
    )
    timestamp_label.pack(fill="x", pady=3)

    def select_file():
        file_path = filedialog.askopenfilename()

        if file_path:
            selected_path.set(file_path)
            selected_file.config(text=file_path)

            risk_label.config(
                text="Risk: --",
                fg="black"
            )

            file_label.config(text="File: --")
            hash_label.config(text="SHA-256: --")
            findings_label.config(text="Ready to scan.")
            decision_label.config(text="Decision: --")
            timestamp_label.config(text="Timestamp: --")

    def scan_selected_file():
        file_path = selected_path.get()

        if not file_path:
            findings_label.config(text="Please select a file first.")
            return

        try:
            scan = scan_file(file_path)
            result = scan["result"]

            risk = result["risk"]
            findings = result["findings"]

            risk_label.config(text=f"Risk: {risk}")

            if risk == "LOW":
                risk_label.config(fg="green")
            elif risk == "MEDIUM":
                risk_label.config(fg="orange")
            else:
                risk_label.config(fg="red")

            file_label.config(
                text=f"File: {result['path']}"
            )

            hash_label.config(
                text=f"SHA-256: {result['sha256']}"
            )

            if findings:
                findings_text = "\n".join(
                    f"• {finding}" for finding in findings
                )
            else:
                findings_text = "• No suspicious findings"

            findings_label.config(text=findings_text)

            if risk == "LOW":
                decision = "ALLOWED"
            else:
                decision = "FLAGGED FOR REVIEW"

            decision_label.config(
                text=f"Decision: {decision}"
            )

            timestamp_label.config(
                text=f"Timestamp: {scan['log']['timestamp']}"
            )

        except FileNotFoundError as error:
            findings_label.config(
                text=f"Error: {error}"
            )

    # Buttons
    button_frame = tk.Frame(window)
    button_frame.pack(pady=(0, 25))

    browse_button = tk.Button(
        button_frame,
        text="Browse",
        width=15,
        command=select_file
    )
    browse_button.pack(side="left", padx=8)

    scan_button = tk.Button(
        button_frame,
        text="SCAN",
        width=15,
        command=scan_selected_file
    )
    scan_button.pack(side="left", padx=8)

    window.mainloop()


if __name__ == "__main__":
    main()