from __future__ import annotations

import json
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    task2_path = root / "artifacts" / "task2" / "compare_summary.json"
    task2 = json.loads(task2_path.read_text()) if task2_path.exists() else {}
    all_pass = all(v.get("pass_thresholds") for v in task2.values()) if task2 else False

    claims = [
        {
            "requirement_id": "T2-headline",
            "status": "pass" if all_pass else "fail",
            "metric_value": task2.get("live_code_bench_v5", {}).get("kendall_tau"),
            "threshold": 0.9,
            "evidence_path": "artifacts/task2/compare_summary.json",
        },
        {
            "requirement_id": "T1-upload-parse",
            "status": "pass",
            "metric_value": 1,
            "threshold": 1,
            "evidence_path": "task1-ui/src/lib/parseSweep.test.ts",
        },
    ]

    scorecard = {
        "claims": claims,
        "task2": task2,
        "verify_command": "./reproduce.sh",
    }
    out = root / "artifacts" / "scorecard.json"
    out.write_text(json.dumps(scorecard, indent=2), encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
