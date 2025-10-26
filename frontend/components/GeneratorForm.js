'use client';

import { useState, useRef } from 'react';
import { api } from '../lib/api';
import PromptInput from './PromptInput';

export default function GeneratorForm({ user }) {
  const [manualPrompts, setManualPrompts] = useState('');
  const [filePrompts, setFilePrompts] = useState([]);
  const [fileName, setFileName] = useState('');
  const [ratio, setRatio] = useState('16:9');
  const [customWidth, setCustomWidth] = useState('1920');
  const [customHeight, setCustomHeight] = useState('1080');
  const [saveTarget, setSaveTarget] = useState('browser');
  const [maxWorkers, setMaxWorkers] = useState(user.maxWorkers);
  const [model, setModel] = useState('fast');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await api.prompts.upload(file);
      setFilePrompts(response.prompts);
      setFileName(`${response.filename} (${response.count} lines detected)`);
      setError('');
    } catch (err) {
      setError(err.message);
      setFilePrompts([]);
      setFileName('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Combine manual and file prompts
    const manual = manualPrompts
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const allPrompts = [...manual, ...filePrompts];

    if (allPrompts.length === 0) {
      setError('Please enter at least one prompt');
      return;
    }

    setLoading(true);

    try {
      const jobData = {
        prompts: allPrompts,
        ratio: ratio === 'custom' ? 'custom' : ratio,
        customWidth: ratio === 'custom' ? parseInt(customWidth) : undefined,
        customHeight: ratio === 'custom' ? parseInt(customHeight) : undefined,
        saveTarget,
        maxWorkers: Math.min(maxWorkers, user.maxWorkers),
        ...(user.role === 'PREMIUM' && { model })
      };

      const response = await api.jobs.create(jobData);
      setSuccess(`Job created successfully! ID: ${response.jobId}`);

      // Clear form
      setManualPrompts('');
      setFilePrompts([]);
      setFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPremium = user.role === 'PREMIUM';

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="mb-0">Video Generation</h5>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Prompt Input */}
          <PromptInput
            value={manualPrompts}
            onChange={setManualPrompts}
            filePrompts={filePrompts}
            fileName={fileName}
            onFileChange={handleFileUpload}
            fileInputRef={fileInputRef}
          />

          {/* Ratio Selector */}
          <div className="mb-3">
            <label htmlFor="ratio" className="form-label">
              Aspect Ratio
            </label>
            <select
              className="form-select"
              id="ratio"
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
            >
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="4:5">4:5 (Social)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Custom Ratio Inputs */}
          {ratio === 'custom' && (
            <div className="mb-3">
              <label className="form-label">Custom Resolution</label>
              <div className="custom-ratio-inputs">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Width"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  min="1"
                  max="7680"
                />
                <span className="custom-ratio-separator">×</span>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Height"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  min="1"
                  max="4320"
                />
              </div>
            </div>
          )}

          {/* Model Picker (Premium only) */}
          <div className="mb-3">
            <label htmlFor="model" className="form-label">
              Model
              {!isPremium && (
                <span className="badge bg-warning premium-badge" title="Premium feature">
                  PREMIUM
                </span>
              )}
            </label>
            <select
              className={`form-select ${!isPremium ? 'premium-locked' : ''}`}
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!isPremium}
              title={!isPremium ? 'Premium only' : ''}
            >
              <option value="mini">Mini (Fast, Lower Quality)</option>
              <option value="fast">Fast (Balanced)</option>
              <option value="lite">Lite (Good Quality)</option>
              <option value="pro">Pro (Best Quality)</option>
            </select>
            {!isPremium && (
              <small className="text-muted">Upgrade to Premium to access model selection</small>
            )}
          </div>

          {/* Save Target */}
          <div className="mb-3">
            <label htmlFor="saveTarget" className="form-label">
              Save Target
            </label>
            <select
              className="form-select"
              id="saveTarget"
              value={saveTarget}
              onChange={(e) => setSaveTarget(e.target.value)}
            >
              <option value="browser">Browser (Local Download)</option>
              <option value="google_drive">Google Drive</option>
            </select>
          </div>

          {/* Google Drive Connect (if selected) */}
          {saveTarget === 'google_drive' && (
            <div className="alert alert-info mb-3">
              <strong>Google Drive:</strong> Click to authorize access.
              <button type="button" className="btn btn-sm btn-primary ms-2">
                Connect Google Drive
              </button>
            </div>
          )}

          {/* Max Workers */}
          <div className="mb-3">
            <label htmlFor="maxWorkers" className="form-label">
              Max Workers (Your limit: {user.maxWorkers})
            </label>
            <input
              type="number"
              className="form-control"
              id="maxWorkers"
              value={maxWorkers}
              onChange={(e) => setMaxWorkers(Math.min(parseInt(e.target.value) || 1, user.maxWorkers))}
              min="1"
              max={user.maxWorkers}
            />
            <small className="text-muted">
              Using more workers processes prompts faster
            </small>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Generating...
              </>
            ) : (
              'Generate Videos'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
