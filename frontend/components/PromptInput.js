'use client';

export default function PromptInput({ value, onChange, filePrompts, fileName, onFileChange, fileInputRef }) {
  const totalPrompts = value.split('\n').filter(line => line.trim().length > 0).length + filePrompts.length;

  return (
    <div className="mb-3">
      <label htmlFor="prompts" className="form-label">
        Prompts {totalPrompts > 0 && <span className="badge bg-secondary ms-2">{totalPrompts} total</span>}
      </label>

      {/* Manual Text Entry */}
      <textarea
        className="form-control prompt-textarea mb-2"
        id="prompts"
        placeholder="Enter prompts, one per line...&#10;Example:&#10;A serene mountain landscape at sunset&#10;A futuristic city with flying cars&#10;An astronaut floating in space"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {/* File Upload */}
      <div className="mb-2">
        <label htmlFor="fileUpload" className="file-upload-label">
          <input
            type="file"
            className="file-upload-input"
            id="fileUpload"
            accept=".txt"
            onChange={onFileChange}
            ref={fileInputRef}
          />
          <span>
            {fileName || 'Or upload .txt file (one prompt per line)'}
          </span>
        </label>
      </div>

      {fileName && (
        <div className="alert alert-success py-2" role="alert">
          <small>{fileName}</small>
        </div>
      )}
    </div>
  );
}
