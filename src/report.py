from datetime import datetime


def generate_report(result):
    """Generate a human-readable report for a completed file scan."""

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    findings = result["findings"]

    report = [
        "========================================",
        "       FILE SECURITY SCAN REPORT",
        "========================================",
        "",
        f"File:     {result['path']}",
        f"SHA-256:  {result['sha256']}",
        "",
        f"Risk:     {result['risk']}",
        f"Score:    {result['risk_score']}/100",
        "",
        "Findings:"
    ]

    if findings:
        for finding in findings:
            report.append(f"  - {finding}")
    else:
        report.append("  - No suspicious findings")

    decision = (
        "ALLOWED"
        if result["risk"] == "LOW"
        else "FLAGGED FOR REVIEW"
    )

    report.extend([
        "",
        f"Decision: {decision}",
        "",
        f"Timestamp: {timestamp}",
        "========================================"
    ])

    return "\n".join(report)