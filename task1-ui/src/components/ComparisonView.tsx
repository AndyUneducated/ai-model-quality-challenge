import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ParsedSweep, Thresholds } from '../lib/types';
import { evaluateSweep } from '../lib/decision';

interface ComparisonViewProps {
  sweeps: ParsedSweep[];
  thresholds: Thresholds;
}

export function ComparisonView({ sweeps, thresholds }: ComparisonViewProps) {
  const chartData = sweeps.map((sweep) => {
    const decision = evaluateSweep(sweep, thresholds);
    return {
      name: `${sweep.identity.modelId}-P${sweep.identity.profileId}`,
      throughput: Math.round(decision.headline.throughputTps / 1000),
      ttftMs: Math.round(decision.headline.ttftSec * 1000),
      genSpeed: Math.round(decision.headline.genSpeedTpsUser),
    };
  });

  return (
    <section className="panel">
      <h2>Model Comparison</h2>
      <p className="subtitle">Side-by-side view across all uploaded sweeps.</p>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="throughput" name="Throughput (k tok/s)" fill="#2563eb" />
            <Bar dataKey="genSpeed" name="Gen speed (tok/s/user)" fill="#059669" />
            <Bar dataKey="ttftMs" name="TTFT (ms)" fill="#dc2626" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Profile</th>
            <th>Throughput</th>
            <th>TTFT</th>
            <th>Gen speed</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {sweeps.map((sweep) => {
            const decision = evaluateSweep(sweep, thresholds);
            return (
              <tr key={`${sweep.identity.modelId}-${sweep.identity.profileId}`}>
                <td>{sweep.identity.modelId}</td>
                <td>{sweep.identity.profileId}</td>
                <td>{Math.round(decision.headline.throughputTps).toLocaleString()}</td>
                <td>{decision.headline.ttftSec.toFixed(2)}s</td>
                <td>{decision.headline.genSpeedTpsUser.toFixed(0)}</td>
                <td>{decision.verdict.toUpperCase()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
