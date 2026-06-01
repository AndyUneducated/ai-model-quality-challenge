import type { InferenceResult, ParsedSweep } from '../lib/types';
import { buildInference } from '../lib/inference';

interface InferencePanelProps {
  sweeps: ParsedSweep[];
}

export function InferencePanel({ sweeps }: InferencePanelProps) {
  if (!sweeps.length) return null;
  const inference: InferenceResult = buildInference(sweeps);

  return (
    <section className="panel">
      <h2>Inference Panel</h2>
      <p className="subtitle">Data-driven hints for model size and profile use-case (supports video Q&A).</p>
      <div className="inference-grid">
        <article>
          <h3>Inferred model size</h3>
          <p className="pill">{inference.modelSizeBand.toUpperCase()}</p>
          <ul>
            {inference.modelSizeRationale.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article>
          <h3>Inferred profile use-case</h3>
          <p className="pill">{inference.profileUseCase}</p>
          <ul>
            {inference.profileRationale.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
