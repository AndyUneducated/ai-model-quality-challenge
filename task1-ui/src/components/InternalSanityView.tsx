import { analyzeDataHealth } from '../lib/dataHealth';
import type { ParsedSweep } from '../lib/types';

interface InternalSanityViewProps {
  sweeps: ParsedSweep[];
}

export function InternalSanityView({ sweeps }: InternalSanityViewProps) {
  return (
    <section className="panel">
      <h2>Internal Engineer View</h2>
      <p className="subtitle">Sanity checks, anomalies, and config deltas before customer delivery.</p>
      <div className="card-grid">
        {sweeps.map((sweep) => {
          const issues = analyzeDataHealth(sweep);
          const row = sweep.rows[sweep.rows.length - 1];
          return (
            <article key={`${sweep.identity.modelId}-${sweep.identity.profileId}`} className="sanity-card">
              <header>
                <strong>
                  Model {sweep.identity.modelId} · Profile {sweep.identity.profileId}
                </strong>
                <span>{sweep.identity.fileName}</span>
              </header>
              <MetricRow label="Rows parsed" value={String(sweep.rows.length)} />
              <MetricRow label="G method" value={row.gMethod ?? 'n/a'} />
              <MetricRow label="Batch / concurrency" value={`${row.batchSize ?? 'n/a'} / ${row.concurrency ?? 'n/a'}`} />
              <MetricRow label="Max S" value={row.maxS?.toLocaleString() ?? 'n/a'} />
              <h3>Data health</h3>
              <ul className="issues">
                {issues.map((issue) => (
                  <li key={`${issue.code}-${issue.message}`} className={issue.severity}>
                    [{issue.severity}] {issue.message}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
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
