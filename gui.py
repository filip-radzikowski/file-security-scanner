import csv
import json
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from src.scanner import scan_file, scan_directory


def main():
    window = tk.Tk()
    window.title("File Security Scanner")
    window.geometry("900x760")
    window.resizable(False, False)

    selected_path = tk.StringVar()

    folder_scan_data = None
    single_scan_data = None

    # ============================================================
    # HEADER
    # ============================================================

    header = tk.Frame(window)

    header.pack(
        side="top",
        fill="x",
        padx=30,
        pady=(20, 8)
    )

    tk.Label(
        header,
        text="FILE SECURITY SCANNER",
        font=("Arial", 22, "bold")
    ).pack()

    tk.Label(
        header,
        text="Defensive file analysis and risk assessment",
        font=("Arial", 11)
    ).pack(pady=(5, 0))

    # ============================================================
    # FIXED BOTTOM BUTTON BAR
    # ============================================================

    button_frame = tk.Frame(window)

    button_frame.pack(
        side="bottom",
        fill="x",
        pady=(8, 18)
    )

    # ============================================================
    # MAIN CONTENT AREA
    # ============================================================

    content_frame = tk.Frame(window)

    content_frame.pack(
        side="top",
        fill="both",
        expand=True,
        padx=30
    )

    # ============================================================
    # FILE SELECTION
    # ============================================================

    selection_frame = tk.LabelFrame(
        content_frame,
        text=" File Selection ",
        font=("Arial", 11, "bold"),
        padx=15,
        pady=12
    )

    selection_frame.pack(
        fill="x",
        pady=(0, 10)
    )

    selected_file = tk.Label(
        selection_frame,
        text="No file or folder selected",
        anchor="w",
        wraplength=800
    )

    selected_file.pack(
        fill="x"
    )

    # ============================================================
    # RESULTS FRAME
    # ============================================================

    results_frame = tk.LabelFrame(
        content_frame,
        text=" Scan Results ",
        font=("Arial", 11, "bold"),
        padx=15,
        pady=12
    )

    results_frame.pack(
        fill="both",
        expand=True
    )

    # ============================================================
    # OVERALL RESULTS
    # ============================================================

    risk_label = tk.Label(
        results_frame,
        text="Risk: --",
        font=("Arial", 16, "bold"),
        anchor="w"
    )

    risk_label.pack(
        anchor="w"
    )

    score_label = tk.Label(
        results_frame,
        text="Score: --",
        font=("Arial", 12, "bold"),
        anchor="w"
    )

    score_label.pack(
        anchor="w",
        pady=(2, 2)
    )

    highest_risk_label = tk.Label(
        results_frame,
        text="Highest-risk file: --",
        anchor="w",
        wraplength=800
    )

    highest_risk_label.pack(
        anchor="w",
        pady=(0, 6)
    )

    # ============================================================
    # FILE METADATA
    # ============================================================

    file_label = tk.Label(
        results_frame,
        text="File: --",
        anchor="w",
        wraplength=800
    )

    file_label.pack(
        fill="x"
    )

    size_label = tk.Label(
        results_frame,
        text="Size: --",
        anchor="w"
    )

    size_label.pack(
        fill="x"
    )

    extension_label = tk.Label(
        results_frame,
        text="Extension: --",
        anchor="w"
    )

    extension_label.pack(
        fill="x"
    )

    created_label = tk.Label(
        results_frame,
        text="Created: --",
        anchor="w"
    )

    created_label.pack(
        fill="x"
    )

    modified_label = tk.Label(
        results_frame,
        text="Modified: --",
        anchor="w"
    )

    modified_label.pack(
        fill="x"
    )

    hash_label = tk.Label(
        results_frame,
        text="SHA-256: --",
        anchor="w",
        wraplength=800
    )

    hash_label.pack(
        fill="x"
    )

    findings_title = tk.Label(
        results_frame,
        text="Findings",
        font=("Arial", 11, "bold"),
        anchor="w"
    )

    findings_title.pack(
        fill="x",
        pady=(4, 2)
    )

    findings_label = tk.Label(
        results_frame,
        text="No scan performed.",
        anchor="w",
        justify="left",
        wraplength=800
    )

    findings_label.pack(
        fill="x"
    )

    decision_label = tk.Label(
        results_frame,
        text="Decision: --",
        font=("Arial", 11, "bold"),
        anchor="w"
    )

    decision_label.pack(
        fill="x",
        pady=(4, 0)
    )

    timestamp_label = tk.Label(
        results_frame,
        text="Timestamp: --",
        anchor="w"
    )

    timestamp_label.pack(
        fill="x"
    )

    # ============================================================
    # FOLDER RESULTS
    # ============================================================

    folder_container = tk.Frame(
        results_frame
    )

    # We deliberately DO NOT use expand=True here.
    # This prevents the folder results from pushing
    # the bottom button bar off the window.

    folder_summary_label = tk.Label(
        folder_container,
        text="",
        font=("Arial", 10, "bold"),
        anchor="w"
    )

    folder_summary_label.pack(
        fill="x",
        pady=(4, 4)
    )

    # ============================================================
    # FILTER / SORT CONTROLS
    # ============================================================

    controls_frame = tk.Frame(
        folder_container
    )

    controls_frame.pack(
        fill="x",
        pady=(0, 5)
    )

    tk.Label(
        controls_frame,
        text="Filter:"
    ).pack(
        side="left"
    )

    filter_var = tk.StringVar(
        value="All"
    )

    filter_box = ttk.Combobox(
        controls_frame,
        textvariable=filter_var,
        values=[
            "All",
            "HIGH",
            "MEDIUM",
            "LOW",
            "UNKNOWN"
        ],
        state="readonly",
        width=10
    )

    filter_box.pack(
        side="left",
        padx=(5, 12)
    )

    tk.Label(
        controls_frame,
        text="Size:"
    ).pack(
        side="left"
    )

    size_var = tk.StringVar(
        value="All"
    )

    size_box = ttk.Combobox(
        controls_frame,
        textvariable=size_var,
        values=[
            "All",
            "Under 10 KB",
            "10 KB - 1 MB",
            "1 MB - 10 MB",
            "Over 10 MB"
        ],
        state="readonly",
        width=16
    )

    size_box.pack(
        side="left",
        padx=(5, 12)
    )

    tk.Label(
        controls_frame,
        text="Sort:"
    ).pack(
        side="left"
    )

    sort_var = tk.StringVar(
        value="Risk (High → Low)"
    )

    sort_box = ttk.Combobox(
        controls_frame,
        textvariable=sort_var,
        values=[
            "Risk (High → Low)",
            "Score (High → Low)",
            "Name (A → Z)",
            "Name (Z → A)",
            "Size (Largest → Smallest)",
            "Size (Smallest → Largest)"
        ],
        state="readonly",
        width=24
    )

    sort_box.pack(
        side="left",
        padx=5
    )

    # ============================================================
    # SCROLLABLE FILE TREE
    # ============================================================

    tree_outer = tk.Frame(
        folder_container
    )

    tree_outer.pack(
        fill="both",
        expand=True
    )

    tree_scrollbar = ttk.Scrollbar(
        tree_outer,
        orient="vertical"
    )

    tree_scrollbar.pack(
        side="right",
        fill="y"
    )

    tree = ttk.Treeview(
        tree_outer,
        columns=(
            "risk",
            "score",
            "size"
        ),
        show="tree headings",
        yscrollcommand=tree_scrollbar.set,
        height=5
    )

    tree_scrollbar.config(
        command=tree.yview
    )

    tree.heading(
        "#0",
        text="File"
    )

    tree.heading(
        "risk",
        text="Risk"
    )

    tree.heading(
        "score",
        text="Score"
    )

    tree.heading(
        "size",
        text="Size"
    )

    tree.column(
        "#0",
        width=460,
        anchor="w"
    )

    tree.column(
        "risk",
        width=80,
        anchor="center"
    )

    tree.column(
        "score",
        width=90,
        anchor="center"
    )

    tree.column(
        "size",
        width=100,
        anchor="center"
    )

    tree.pack(
        side="left",
        fill="both",
        expand=True
    )

    # ============================================================
    # HELPERS
    # ============================================================

    def set_risk_colour(risk):
        if risk == "LOW":
            return "green"

        if risk == "MEDIUM":
            return "orange"

        if risk == "HIGH":
            return "red"

        return "gray"

    def format_size(size):
        if size is None:
            return "Unknown"

        if size < 1024:
            return f"{size} B"

        if size < 1024 * 1024:
            return f"{size / 1024:.2f} KB"

        if size < 1024 * 1024 * 1024:
            return f"{size / (1024 * 1024):.2f} MB"

        return f"{size / (1024 * 1024 * 1024):.2f} GB"

    def size_matches(
        size,
        selected_size
    ):
        if selected_size == "All":
            return True

        if size is None:
            return False

        kb = 1024
        mb = 1024 * 1024

        if selected_size == "Under 10 KB":
            return size < 10 * kb

        if selected_size == "10 KB - 1 MB":
            return (
                10 * kb
                <= size
                <= mb
            )

        if selected_size == "1 MB - 10 MB":
            return (
                mb
                < size
                <= 10 * mb
            )

        if selected_size == "Over 10 MB":
            return size > 10 * mb

        return True

    def reset_results():
        risk_label.config(
            text="Risk: --",
            fg="black"
        )

        score_label.config(
            text="Score: --"
        )

        highest_risk_label.config(
            text="Highest-risk file: --"
        )

        file_label.config(
            text="File: --"
        )

        size_label.config(
            text="Size: --"
        )

        extension_label.config(
            text="Extension: --"
        )

        created_label.config(
            text="Created: --"
        )

        modified_label.config(
            text="Modified: --"
        )

        hash_label.config(
            text="SHA-256: --"
        )

        findings_label.config(
            text="No scan performed."
        )

        decision_label.config(
            text="Decision: --"
        )

        timestamp_label.config(
            text="Timestamp: --"
        )

    def clear_tree():
        for item in tree.get_children():
            tree.delete(item)

    def clear_folder_results():
        folder_container.pack_forget()

        clear_tree()

        folder_summary_label.config(
            text=""
        )

    # ============================================================
    # NEW SCAN
    # ============================================================

    def new_scan():
        nonlocal folder_scan_data
        nonlocal single_scan_data

        folder_scan_data = None
        single_scan_data = None

        selected_path.set("")

        selected_file.config(
            text="No file or folder selected"
        )

        reset_results()

        clear_folder_results()

        filter_var.set("All")
        size_var.set("All")
        sort_var.set(
            "Risk (High → Low)"
        )

    # ============================================================
    # EXPORT
    # ============================================================

    def get_export_data():
        if folder_scan_data is not None:
            return (
                folder_scan_data,
                "folder_scan_results"
            )

        if single_scan_data is not None:
            return (
                single_scan_data,
                "file_scan_result"
            )

        return None, None

    def export_json():
        data, default_name = get_export_data()

        if data is None:
            messagebox.showinfo(
                "Nothing to Export",
                "Please scan a file or folder first."
            )
            return

        save_path = filedialog.asksaveasfilename(
            title="Export JSON",
            defaultextension=".json",
            initialfile=f"{default_name}.json",
            filetypes=[
                (
                    "JSON files",
                    "*.json"
                ),
                (
                    "All files",
                    "*.*"
                )
            ]
        )

        if not save_path:
            return

        try:
            with open(
                save_path,
                "w",
                encoding="utf-8"
            ) as file:
                json.dump(
                    data,
                    file,
                    indent=4,
                    ensure_ascii=False
                )

            messagebox.showinfo(
                "Export Complete",
                f"JSON exported successfully:\n\n{save_path}"
            )

        except OSError as error:
            messagebox.showerror(
                "Export Error",
                f"Could not export JSON:\n\n{error}"
            )

    def export_csv():
        data, default_name = get_export_data()

        if data is None:
            messagebox.showinfo(
                "Nothing to Export",
                "Please scan a file or folder first."
            )
            return

        if folder_scan_data is not None:
            source_results = (
                folder_scan_data["results"]
            )
        else:
            source_results = [
                {
                    "result": single_scan_data
                }
            ]

        rows = []

        for item in source_results:
            result = item["result"]

            rows.append({
                "Name": result.get("name"),
                "Path": result.get("path"),
                "Size": result.get("size"),
                "Extension": result.get("extension"),
                "Created": result.get("created"),
                "Modified": result.get("modified"),
                "SHA-256": result.get("sha256"),
                "Risk": result.get("risk"),
                "Score": result.get("risk_score"),
                "Findings": " | ".join(
                    result.get(
                        "findings",
                        []
                    )
                )
            })

        save_path = filedialog.asksaveasfilename(
            title="Export CSV",
            defaultextension=".csv",
            initialfile=f"{default_name}.csv",
            filetypes=[
                (
                    "CSV files",
                    "*.csv"
                ),
                (
                    "All files",
                    "*.*"
                )
            ]
        )

        if not save_path:
            return

        try:
            with open(
                save_path,
                "w",
                newline="",
                encoding="utf-8"
            ) as file:

                writer = csv.DictWriter(
                    file,
                    fieldnames=[
                        "Name",
                        "Path",
                        "Size",
                        "Extension",
                        "Created",
                        "Modified",
                        "SHA-256",
                        "Risk",
                        "Score",
                        "Findings"
                    ]
                )

                writer.writeheader()
                writer.writerows(rows)

            messagebox.showinfo(
                "Export Complete",
                f"CSV exported successfully:\n\n{save_path}"
            )

        except OSError as error:
            messagebox.showerror(
                "Export Error",
                f"Could not export CSV:\n\n{error}"
            )

    def open_export_menu():
        menu = tk.Menu(
            window,
            tearoff=False
        )

        menu.add_command(
            label="Export as JSON",
            command=export_json
        )

        menu.add_command(
            label="Export as CSV",
            command=export_csv
        )

        try:
            x = export_button.winfo_rootx()

            y = (
                export_button.winfo_rooty()
                - menu.winfo_reqheight()
            )

            menu.tk_popup(
                x,
                y
            )

        finally:
            menu.grab_release()

    # ============================================================
    # DISPLAY FOLDER RESULTS
    # ============================================================

    def display_folder_results():
        if folder_scan_data is None:
            return

        clear_tree()

        results = list(
            folder_scan_data["results"]
        )

        # -------------------------
        # Risk filter
        # -------------------------

        selected_filter = filter_var.get()

        if selected_filter != "All":
            results = [
                item
                for item in results
                if item["result"]["risk"]
                == selected_filter
            ]

        # -------------------------
        # Size filter
        # -------------------------

        selected_size = size_var.get()

        results = [
            item
            for item in results
            if size_matches(
                item["result"]["size"],
                selected_size
            )
        ]

        # -------------------------
        # Sorting
        # -------------------------

        selected_sort = sort_var.get()

        if selected_sort == "Risk (High → Low)":

            risk_order = {
                "HIGH": 3,
                "MEDIUM": 2,
                "LOW": 1,
                "UNKNOWN": 0
            }

            results.sort(
                key=lambda item:
                risk_order.get(
                    item["result"]["risk"],
                    0
                ),
                reverse=True
            )

        elif selected_sort == "Score (High → Low)":

            results.sort(
                key=lambda item:
                item["result"]["risk_score"],
                reverse=True
            )

        elif selected_sort == "Name (A → Z)":

            results.sort(
                key=lambda item:
                item["result"]["name"].lower()
            )

        elif selected_sort == "Name (Z → A)":

            results.sort(
                key=lambda item:
                item["result"]["name"].lower(),
                reverse=True
            )

        elif selected_sort == "Size (Largest → Smallest)":

            results.sort(
                key=lambda item:
                item["result"]["size"] or 0,
                reverse=True
            )

        elif selected_sort == "Size (Smallest → Largest)":

            results.sort(
                key=lambda item:
                item["result"]["size"] or 0
            )

        # -------------------------
        # Populate tree
        # -------------------------

        for item in results:

            result = item["result"]

            file_name = result["name"]
            risk = result["risk"]
            score = result["risk_score"]
            size = result["size"]

            parent_id = tree.insert(
                "",
                "end",
                text=file_name,
                values=(
                    risk,
                    f"{score}/100",
                    format_size(size)
                ),
                open=False
            )

            details = [
                f"Path: {result['path']}",
                f"Size: {format_size(size)}",
                (
                    "Extension: "
                    f"{result['extension'] or 'None'}"
                ),
                (
                    "Created: "
                    f"{result['created'] or 'Unavailable'}"
                ),
                (
                    "Modified: "
                    f"{result['modified'] or 'Unavailable'}"
                ),
                (
                    "SHA-256: "
                    f"{result['sha256'] or 'Unavailable'}"
                ),
                f"Risk: {risk}",
                f"Score: {score}/100"
            ]

            if result["findings"]:

                details.extend(
                    f"Finding: {finding}"
                    for finding in result["findings"]
                )

            else:

                details.append(
                    "Findings: None"
                )

            decision = (
                "ALLOWED"
                if risk == "LOW"
                else "FLAGGED FOR REVIEW"
            )

            details.append(
                f"Decision: {decision}"
            )

            for detail in details:

                tree.insert(
                    parent_id,
                    "end",
                    text=detail,
                    values=(
                        "",
                        "",
                        ""
                    )
                )

    # ============================================================
    # FILE SELECTION
    # ============================================================

    def select_file():

        file_path = filedialog.askopenfilename()

        if not file_path:
            return

        selected_path.set(
            file_path
        )

        selected_file.config(
            text=file_path
        )

        clear_folder_results()

        reset_results()

        findings_label.config(
            text="Ready to scan."
        )

    # ============================================================
    # FOLDER SELECTION
    # ============================================================

    def select_folder():

        folder_path = filedialog.askdirectory()

        if not folder_path:
            return

        selected_path.set(
            folder_path
        )

        selected_file.config(
            text=folder_path
        )

        reset_results()

        clear_folder_results()

        findings_label.config(
            text="Ready to scan folder."
        )

    # ============================================================
    # SINGLE FILE SCAN
    # ============================================================

    def scan_selected_file():

        nonlocal single_scan_data
        nonlocal folder_scan_data

        file_path = selected_path.get()

        if not file_path:

            findings_label.config(
                text="Please select a file first."
            )

            return

        try:

            scan = scan_file(
                file_path
            )

            single_scan_data = scan["result"]

            folder_scan_data = None

            result = single_scan_data

            clear_folder_results()

            risk = result["risk"]
            score = result["risk_score"]

            risk_label.config(
                text=f"Risk: {risk}",
                fg=set_risk_colour(risk)
            )

            score_label.config(
                text=f"Score: {score}/100"
            )

            highest_risk_label.config(
                text="Highest-risk file: --"
            )

            file_label.config(
                text=f"File: {result['path']}"
            )

            size_label.config(
                text=(
                    f"Size: "
                    f"{format_size(result['size'])}"
                )
            )

            extension_label.config(
                text=(
                    "Extension: "
                    f"{result['extension'] or 'None'}"
                )
            )

            created_label.config(
                text=(
                    "Created: "
                    f"{result['created'] or 'Unavailable'}"
                )
            )

            modified_label.config(
                text=(
                    "Modified: "
                    f"{result['modified'] or 'Unavailable'}"
                )
            )

            hash_label.config(
                text=(
                    "SHA-256: "
                    f"{result['sha256'] or 'Unavailable'}"
                )
            )

            if result["findings"]:

                findings_text = "\n".join(
                    f"• {finding}"
                    for finding in result["findings"]
                )

            else:

                findings_text = (
                    "• No suspicious findings"
                )

            findings_label.config(
                text=findings_text
            )

            decision = (
                "ALLOWED"
                if risk == "LOW"
                else "FLAGGED FOR REVIEW"
            )

            decision_label.config(
                text=f"Decision: {decision}"
            )

            timestamp_label.config(
                text=(
                    "Timestamp: "
                    f"{scan['log']['timestamp']}"
                )
            )

        except (
            FileNotFoundError,
            OSError
        ) as error:

            findings_label.config(
                text=f"Error: {error}"
            )

    # ============================================================
    # FOLDER SCAN
    # ============================================================

    def scan_selected_folder():

        nonlocal folder_scan_data
        nonlocal single_scan_data

        folder_path = selected_path.get()

        if not folder_path:

            findings_label.config(
                text="Please select a folder first."
            )

            return

        try:

            folder_scan_data = scan_directory(
                folder_path
            )

            single_scan_data = None

            summary = folder_scan_data[
                "summary"
            ]

            overall_risk = folder_scan_data[
                "risk"
            ]

            overall_score = folder_scan_data[
                "risk_score"
            ]

            highest_file = folder_scan_data[
                "highest_risk_file"
            ]

            risk_label.config(
                text=f"Risk: {overall_risk}",
                fg=set_risk_colour(
                    overall_risk
                )
            )

            score_label.config(
                text=f"Score: {overall_score}/100"
            )

            if highest_file:

                highest_risk_label.config(
                    text=(
                        "Highest-risk file: "
                        f"{highest_file}"
                    )
                )

            elif overall_risk == "UNKNOWN":

                highest_risk_label.config(
                    text=(
                        "Highest-risk file: "
                        "Unable to determine — "
                        "one or more files could not "
                        "be assessed"
                    )
                )

            else:

                highest_risk_label.config(
                    text=(
                        "Highest-risk file: None — "
                        "no elevated-risk files detected"
                    )
                )

            file_label.config(
                text=(
                    "Folder: "
                    f"{folder_scan_data['directory']}"
                )
            )

            size_label.config(
                text=(
                    "Size: Individual file sizes "
                    "available below"
                )
            )

            extension_label.config(
                text=(
                    "Extension: Individual extensions "
                    "available below"
                )
            )

            created_label.config(
                text=(
                    "Created: Individual file "
                    "timestamps available below"
                )
            )

            modified_label.config(
                text=(
                    "Modified: Individual file "
                    "timestamps available below"
                )
            )

            hash_label.config(
                text=(
                    "SHA-256: Individual hashes "
                    "available below"
                )
            )

            findings_label.config(
                text="Folder scan complete."
            )

            if overall_risk == "LOW":

                decision = "ALLOWED"

            elif overall_risk == "UNKNOWN":

                decision = (
                    "INCOMPLETE — "
                    "REVIEW UNKNOWN FILES"
                )

            else:

                decision = "FLAGGED FOR REVIEW"

            decision_label.config(
                text=f"Decision: {decision}"
            )

            timestamp_label.config(
                text=(
                    "Timestamp: Individual scan "
                    "timestamps available in logs"
                )
            )

            folder_summary_label.config(
                text=(
                    f"Files scanned: "
                    f"{summary['total']}    "
                    f"LOW: {summary['low']}    "
                    f"MEDIUM: {summary['medium']}    "
                    f"HIGH: {summary['high']}    "
                    f"UNKNOWN: {summary['unknown']}"
                )
            )

            display_folder_results()

            # IMPORTANT:
            # No expand=True here.
            # The button bar stays fixed at the bottom.

            folder_container.pack(
                fill="both",
                pady=(3, 0)
            )

        except (
            NotADirectoryError,
            OSError
        ) as error:

            findings_label.config(
                text=f"Error: {error}"
            )

    # ============================================================
    # FILTER EVENTS
    # ============================================================

    filter_box.bind(
        "<<ComboboxSelected>>",
        lambda event:
        display_folder_results()
    )

    size_box.bind(
        "<<ComboboxSelected>>",
        lambda event:
        display_folder_results()
    )

    sort_box.bind(
        "<<ComboboxSelected>>",
        lambda event:
        display_folder_results()
    )

    # ============================================================
    # BOTTOM BUTTONS
    # ============================================================

    tk.Button(
        button_frame,
        text="Browse File",
        width=12,
        command=select_file
    ).pack(
        side="left",
        padx=3
    )

    tk.Button(
        button_frame,
        text="SCAN FILE",
        width=12,
        command=scan_selected_file
    ).pack(
        side="left",
        padx=3
    )

    tk.Button(
        button_frame,
        text="Browse Folder",
        width=12,
        command=select_folder
    ).pack(
        side="left",
        padx=3
    )

    tk.Button(
        button_frame,
        text="SCAN FOLDER",
        width=12,
        command=scan_selected_folder
    ).pack(
        side="left",
        padx=3
    )

    export_button = tk.Button(
        button_frame,
        text="EXPORT",
        width=12,
        command=open_export_menu
    )

    export_button.pack(
        side="left",
        padx=3
    )

    tk.Button(
        button_frame,
        text="NEW SCAN",
        width=12,
        command=new_scan
    ).pack(
        side="left",
        padx=3
    )

    # ============================================================
    # START GUI
    # ============================================================

    window.mainloop()


if __name__ == "__main__":
    main()