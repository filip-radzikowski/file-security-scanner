def calculate_risk(findings):
    if not findings:
        return "LOW"

    if len(findings) == 1:
        return "MEDIUM"

    return "HIGH"