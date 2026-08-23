RISK_THRESHOLDS = {
    "LOW": 0,
    "MEDIUM": 30,
    "HIGH": 60,
}


FINDING_WEIGHTS = {
    "suspicious file extension": 30,
    "double extension": 25,
    "extension/content mismatch": 40,
    "hidden file detected": 10,
}


def calculate_risk(findings):
    score = 0

    for finding in findings:
        finding_lower = finding.lower()

        for indicator, weight in FINDING_WEIGHTS.items():
            if indicator in finding_lower:
                score += weight

    if score >= RISK_THRESHOLDS["HIGH"]:
        level = "HIGH"
    elif score >= RISK_THRESHOLDS["MEDIUM"]:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "level": level,
        "score": score
    }