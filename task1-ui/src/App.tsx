import { useMemo, useState } from 'react';
import './App.css';
import { UploadPanel } from './components/UploadPanel';
import { CustomerDecisionView } from './components/CustomerDecisionView';
import { InternalSanityView } from './components/InternalSanityView';
import { ComparisonView } from './components/ComparisonView';
import { InferencePanel } from './components/InferencePanel';
import { AssumptionPanel, ThresholdPanel } from './components/ThresholdPanel';
import { parseSweepFile } from './lib/parseSweep';
import { DEFAULT_THRESHOLDS } from './lib/types';
import type { ParsedSweep, Thresholds } from './lib/types';

type AudienceTab = 'customer' | 'internal';

function App() {
  const [sweeps, setSweeps] = useState<ParsedSweep[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [tab, setTab] = useState<AudienceTab>('customer');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedSweeps = useMemo(
    () =>
      [...sweeps].sort((a, b) =>
        `${a.identity.modelId}-${a.identity.profileId}`.localeCompare(
          `${b.identity.modelId}-${b.identity.profileId}`,
        ),
      ),
    [sweeps],
  );

  async function handleFilesSelected(files: FileList) {
    setIsParsing(true);
    setError(null);
    try {
      const parsed = await Promise.all(Array.from(files).map((file) => parseSweepFile(file)));
      setSweeps((prev) => {
        const map = new Map(prev.map((s) => [`${s.identity.modelId}-${s.identity.profileId}-${s.identity.fileName}`, s]));
        for (const sweep of parsed) {
          map.set(`${sweep.identity.modelId}-${sweep.identity.profileId}-${sweep.identity.fileName}`, sweep);
        }
        return Array.from(map.values());
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse uploaded files.');
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Cerebras Perf Projection Explorer</p>
          <h1>Upload sweeps. Compare models. Decide faster.</h1>
          <p>Client-side parsing only — no rebuild required for new models like Model L.</p>
        </div>
      </header>

      <UploadPanel onFilesSelected={handleFilesSelected} isParsing={isParsing} error={error} />
      <ThresholdPanel thresholds={thresholds} onChange={setThresholds} />
      <AssumptionPanel />

      {sortedSweeps.length ? (
        <>
          <ComparisonView sweeps={sortedSweeps} thresholds={thresholds} />
          <InferencePanel sweeps={sortedSweeps} />
          <div className="tab-row">
            <button type="button" className={tab === 'customer' ? 'active' : ''} onClick={() => setTab('customer')}>
              Customer / PM
            </button>
            <button type="button" className={tab === 'internal' ? 'active' : ''} onClick={() => setTab('internal')}>
              Internal engineer
            </button>
          </div>
          {tab === 'customer' ? (
            <CustomerDecisionView sweeps={sortedSweeps} thresholds={thresholds} />
          ) : (
            <InternalSanityView sweeps={sortedSweeps} />
          )}
        </>
      ) : (
        <section className="panel empty-state">
          <p>Upload one or more `.xlsx` perf sweeps to start comparing.</p>
        </section>
      )}
    </div>
  );
}

export default App;
