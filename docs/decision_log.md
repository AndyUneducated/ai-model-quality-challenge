# Decision Log (Chosen vs Ruled Out)

## Task 1 UI

| Decision | Chosen | Ruled out | Why |
|---|---|---|---|
| Frontend stack | React + Vite + TypeScript | Streamlit / Gradio | Pure browser parsing, zero backend, static GitHub Pages deploy, clean upload contract |
| Parsing location | Client-side Web parsing | Server upload API | Avoid rebuild/deploy for new sweeps; satisfies "upload without code changes" |
| Primary layout | Comparison-first | Single-model detail page | Spec says multi-upload comparison is common case |
| Validation | zod + alias-based column map | Hard-coded per-model views | Supports unseen Model L and column drift |
| Cut from scope | Auth, DB persistence, pricing engine | — | Not in xlsx contract; would add complexity without rubric value |

## Task 2 Pruning

| Decision | Chosen | Ruled out | Why |
|---|---|---|---|
| Core selector | Coverage + disagreement + difficulty + facility-location greedy | Random / top-k hardest / hand-picked | Explicitly forbidden and weak for go/no-go preservation |
| Validation | Kendall/Spearman + decision agreement + LOMO + bootstrap CI | Single-point accuracy delta | Better models unknown 4th model and judge noise |
| Integration style | evalscope_ext package + registry hook | Standalone notebook | Required by spec; upstream PR-friendly layout |
| Part B probe | Encoder sensitivity with text-prior filtering | Generic random multimodal subset | Spec asks for encoder degradation, not generic capability gaps |

## Deployment

| Decision | Chosen | Ruled out | Why |
|---|---|---|---|
| Hosting | GitHub Pages (Actions) | Self-hosted VM | Same repo as submission; auto-deploy on push; no extra accounts |
