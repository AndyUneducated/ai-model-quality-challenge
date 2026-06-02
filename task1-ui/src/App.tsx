import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { UploadPanel } from './components/UploadPanel';
import { CustomerDecisionView } from './components/CustomerDecisionView';
import { InternalSanityView } from './components/InternalSanityView';
import { ComparisonView } from './components/ComparisonView';
import { InferencePanel } from './components/InferencePanel';
import { AssumptionPanel, ThresholdPanel } from './components/ThresholdPanel';
import { parseSweepFile } from './lib/parseSweep';
import { loadDefaultSweeps } from './lib/defaultData';
import { DEFAULT_THRESHOLDS } from './lib/types';
import type { ParsedSweep, Thresholds } from './lib/types';

type AudienceTab = 'customer' | 'internal';

function App() {
  const [sweeps, setSweeps] = useState<ParsedSweep[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [tab, setTab] = useState<AudienceTab>('customer');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  const [defaultsError, setDefaultsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDefaultSweeps()
      .then((defaults) => {
        if (cancelled) return;
        setSweeps((prev) => {
          if (prev.length) return prev;
          return defaults;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setDefaultsError(
          err instanceof Error ? err.message : 'Could not load the pre-loaded perf models.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDefaults(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const modelCount = useMemo(
    () => new Set(sweeps.map((s) => s.identity.modelId)).size,
    [sweeps],
  );

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
          <h1>Compare models. Decide faster.</h1>
          <p>
            {modelCount > 0
              ? `${modelCount} perf models pre-loaded — upload more .xlsx sweeps anytime (e.g. an unseen Model L).`
              : 'Client-side parsing only — no rebuild required for new models like Model L.'}
          </p>
        </div>
      </header>

      <UploadPanel onFilesSelected={handleFilesSelected} isParsing={isParsing} error={error} />
      {defaultsError ? (
        <p className="error">Pre-loaded data unavailable ({defaultsError}). You can still upload sweeps manually.</p>
      ) : null}
      <ThresholdPanel thresholds={thresholds} onChange={setThresholds} />
      <AssumptionPanel />

      {isLoadingDefaults && !sortedSweeps.length ? (
        <section className="panel empty-state">
          <p>Loading pre-loaded perf models…</p>
        </section>
      ) : sortedSweeps.length ? (
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
