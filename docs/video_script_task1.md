# Task 1 Video Script (<=5 min)

1. Problem: perf `.xlsx` is engineer-readable, not customer-actionable.
2. Audiences:
   - Customer/PM: go/no-go + tok/s, TTFT, context
   - Internal engineer: anomalies + config sanity
3. Cuts: no backend, no auth, no baked-in model lists.
4. Framework: React/Vite/TS over Streamlit for deploy + upload contract.
5. Assumptions: Summary sheet contract, throughput/TTFT as hard signals.
6. Model size inference: relative band from throughput/box vs TTFT.
7. Profile use-cases: token mix + cache + concurrency heuristics.
8. Future: add live measured data overlay and customer-specific SLA presets.
