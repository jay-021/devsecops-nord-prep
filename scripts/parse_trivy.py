#!/usr/bin/env python3
"""
parse_trivy.py — Trivy JSON report parser
Reads trivy-results.json, prints a severity summary + top CRITICAL CVEs.
Exits with code 1 if any CRITICAL vulnerabilities found (fails CI gate).
"""

import json
import sys
import os
from collections import defaultdict

TRIVY_RESULTS_FILE = os.environ.get("TRIVY_RESULTS_FILE", "trivy-results.json")
SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
COLORS = {
    "CRITICAL": "\033[1;31m",  # bold red
    "HIGH":     "\033[0;31m",  # red
    "MEDIUM":   "\033[0;33m",  # yellow
    "LOW":      "\033[0;32m",  # green
    "UNKNOWN":  "\033[0;37m",  # grey
    "RESET":    "\033[0m",
}

def color(text, severity):
    return f"{COLORS.get(severity, '')}{text}{COLORS['RESET']}"

def load_results(path):
    if not os.path.exists(path):
        print(f"[WARN] {path} not found — skipping Trivy parse.")
        sys.exit(0)
    with open(path) as f:
        return json.load(f)

def extract_vulns(data):
    vulns = []
    results = data.get("Results", [])
    for result in results:
        for v in result.get("Vulnerabilities") or []:
            vulns.append({
                "id":          v.get("VulnerabilityID", "N/A"),
                "severity":    v.get("Severity", "UNKNOWN"),
                "package":     v.get("PkgName", "N/A"),
                "installed":   v.get("InstalledVersion", "N/A"),
                "fixed":       v.get("FixedVersion", "not fixed"),
                "title":       v.get("Title", "")[:80],
                "target":      result.get("Target", ""),
            })
    return vulns

def summarize(vulns):
    counts = defaultdict(int)
    for v in vulns:
        counts[v["severity"]] += 1
    return counts

def print_summary(counts, total):
    print("\n" + "=" * 60)
    print("  TRIVY VULNERABILITY SUMMARY")
    print("=" * 60)
    for sev in SEVERITY_ORDER:
        count = counts.get(sev, 0)
        bar = "█" * min(count, 40)
        print(f"  {color(f'{sev:<10}', sev)} {count:>4}  {bar}")
    print(f"  {'TOTAL':<10} {total:>4}")
    print("=" * 60)

def print_top_criticals(vulns, limit=5):
    criticals = [v for v in vulns if v["severity"] == "CRITICAL"]
    if not criticals:
        print(color("\n  No CRITICAL vulnerabilities found.\n", "HIGH"))
        return
    print(f"\n  TOP {min(limit, len(criticals))} CRITICAL CVEs")
    print("-" * 60)
    for v in criticals[:limit]:
        print(f"  CVE:      {color(v['id'], 'CRITICAL')}")
        print(f"  Package:  {v['package']} @ {v['installed']}")
        print(f"  Fix:      {v['fixed']}")
        print(f"  Target:   {v['target']}")
        if v["title"]:
            print(f"  Title:    {v['title']}")
        print()

def main():
    data   = load_results(TRIVY_RESULTS_FILE)
    vulns  = extract_vulns(data)
    counts = summarize(vulns)

    print_summary(counts, len(vulns))
    print_top_criticals(vulns)

    critical_count = counts.get("CRITICAL", 0)
    if critical_count > 0:
        print(color(f"  FAIL: {critical_count} CRITICAL CVE(s) found. Fix before merging.\n", "CRITICAL"))
        sys.exit(1)
    else:
        print(color("  PASS: No CRITICAL CVEs found.\n", "LOW"))
        sys.exit(0)

if __name__ == "__main__":
    main()
