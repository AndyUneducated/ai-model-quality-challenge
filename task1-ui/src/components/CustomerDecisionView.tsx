import type { ParsedSweep, Thresholds } from '../lib/types';
import { evaluateSweep, verdictLabel } from '../lib/decision';

interface CustomerDecisionViewProps {
  sweeps: ParsedSweep[];
  thresholds: Thresholds;
}

export function CustomerDecisionView({ sweeps, thresholds }: CustomerDecisionViewProps) {
  const decisions = sweeps.map((sweep) => ({
    sweep,
    decision: evaluateSweep(sweep, thresholds),
  }));

  return (
    <section className="panel">
      <h2>Customer / PM View</h2>
      <p className="subtitle">Go / No-Go signal with customer-facing metrics.</p>
      <div className="card-grid">
        {decisions.map(({ sweep, decision }) => (
          <article key={`${sweep.identity.modelId}-${sweep.identity.profileId}`} className={`decision-card ${decision.verdict}`}>
            <header>
              <strong>
                Model {sweep.identity.modelId} · Profile {sweep.identity.profileId}
              </strong>
              <span className="badge">{verdictLabel(decision.verdict)}</span>
            </header>
            <MetricRow label="Throughput" value={`${Math.round(decision.headline.throughputTps).toLocaleString()} tok/s`} />
            <MetricRow label="TTFT" value={`${decision.headline.ttftSec.toFixed(2)} s`} />
            <MetricRow label="Gen speed" value={`${decision.headline.genSpeedTpsUser.toFixed(0)} tok/s/user`} />
            <MetricRow label="Context" value={`${decision.headline.inputLength.toLocaleString()} in / ${decision.headline.outputLength.toLocaleString()} out`} />
            <ul>
              {decision.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
