import { useRef } from 'react';

interface UploadPanelProps {
  onFilesSelected: (files: FileList) => void;
  isParsing: boolean;
  error: string | null;
}

export function UploadPanel({ onFilesSelected, isParsing, error }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="panel upload-panel">
      <div>
        <h2>Upload Perf Sweeps</h2>
        <p>Drop one or many `.xlsx` files. Comparison is the default view.</p>
      </div>
      <div className="upload-actions">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={isParsing}>
          {isParsing ? 'Parsing…' : 'Select .xlsx files'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files?.length) onFilesSelected(event.target.files);
            event.target.value = '';
          }}
        />
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
