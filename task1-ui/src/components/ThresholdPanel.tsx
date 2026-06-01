import type { Thresholds } from '../lib/types';

interface ThresholdPanelProps {
  thresholds: Thresholds;
  onChange: (next: Thresholds) => void;
}

export function ThresholdPanel({ thresholds, onChange }: ThresholdPanelProps) {
  return (
    <section className="panel compact">
      <h2>Threshold Controls</h2>
      <div className="threshold-grid">
        <label>
          Min throughput (tok/s)
          <input
            type="number"
            value={thresholds.minThroughputTps}
            onChange={(e) => onChange({ ...thresholds, minThroughputTps: Number(e.target.value) })}
          />
        </label>
        <label>
          Max TTFT (sec)
          <input
            type="number"
            step="0.01"
            value={thresholds.maxTtftSec}
            onChange={(e) => onChange({ ...thresholds, maxTtftSec: Number(e.target.value) })}
          />
        </label>
        <label>
          Min gen speed (tok/s/user)
          <input
            type="number"
            value={thresholds.minGenSpeedTpsUser}
            onChange={(e) => onChange({ ...thresholds, minGenSpeedTpsUser: Number(e.target.value) })}
          />
        </label>
      </div>
    </section>
  );
}

export function AssumptionPanel() {
  return (
    <section className="panel compact">
      <h2>Assumptions</h2>
      <ul>
        <li>Hard signal: throughput, TTFT, per-user gen speed from Summary sheet.</li>
        <li>Proxy signal: inferred model size/use-case from workload shape.</li>
        <li>Cost implications are not in the sheet; PM should treat throughput/TTFT as capacity proxies.</li>
      </ul>
    </section>
  );
}
