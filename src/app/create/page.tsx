'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import './create.css';
import { useHakiContract } from "@/hooks/useHakiContract";

interface Option {
  id: string;
  text: string;
}

export default function CreatePage() {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [expiry, setExpiry] = useState("");
  const [options, setOptions] = useState<Option[]>([
    { id: "1", text: "" },
    { id: "2", text: "" },
  ]);
  const [showPreview, setShowPreview] = useState(true);
  const { createMarket, isLoading } = useHakiContract();

  const addOption = () => {
    if (options.length < 6) {
      setOptions([
        ...options,
        {
          id: (Number(options[options.length - 1].id) + 1).toString(),
          text: "",
        },
      ]);
    }
  };

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter((o) => o.id !== id));
    }
  };

  const updateOption = (id: string, value: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, text: value } : o)));
  };

  const handleSubmit = async () => {
    if (
      !label ||
      !description ||
      options.filter((o) => o.text.trim()).length < 2 ||
      !expiry
    ) {
      alert("Please fill in label, description, and at least 2 options");
      return;
    }
    const formattedOptions = options
      .map((opt) => opt.text.trim())
      .filter((text) => text !== "")
      .join(",");
    const epochTimestamp = Math.floor(new Date(expiry).getTime() / 1000);
    try {
      createMarket(label, description, formattedOptions, epochTimestamp);
    } catch (error) {
      console.error("Failed to create market:", error);
    }
  };

  return (
    <>
      <Navigation />

      {/* Create Container */}
      <div className="create-container">
        {/* Form Panel */}
        <div className="form-panel">
          <div className="form-header">
            <h1 className="form-title">Create Market</h1>
            <p className="form-subtitle">
              Deploy a new prediction market on-chain
            </p>
          </div>

          <div className="form-content">
            {/* Label Input */}
            <div className="form-group">
              <label className="form-label">
                Market Label
                <span className="label-badge required">Required</span>
              </label>
              <div className="label-input-wrapper">
                <input
                  type="text"
                  className="form-input label-input"
                  placeholder="bitcoin-2026"
                  value={label}
                  onChange={(e) =>
                    setLabel(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                  maxLength={32}
                />
                <div className="label-suffix">.haki.eth</div>
              </div>
              <p className="form-hint">
                Lowercase letters, numbers, and hyphens only
              </p>
              <div className="char-count">{label.length}/32</div>
            </div>

            {/* Description Input */}
            <div className="form-group">
              <label className="form-label">
                Market Description
                <span className="label-badge required">Required</span>
              </label>
              <textarea
                className="form-textarea"
                placeholder="Describe the market conditions, resolution criteria, and any important details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={5}
              />
              <div className="char-count">{description.length}/500</div>
            </div>

            {/* Options */}
            <div className="form-group">
              <label className="form-label">
                Market Options
                <span className="label-badge">{options.length} options</span>
              </label>
              <div className="options-list">
                {options.map((option, index) => (
                  <div key={option.id} className="option-builder">
                    <div className="option-number">{index + 1}</div>

                    <input
                      type="text"
                      className="option-input"
                      placeholder={`Option ${index + 1}`}
                      value={option.text}
                      onChange={(e) => updateOption(option.id, e.target.value)}
                      maxLength={60}
                    />

                    {options.length > 2 && (
                      <button
                        className="remove-option-btn"
                        onClick={() => removeOption(option.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {options.length < 6 && (
                  <button className="add-option-btn" onClick={addOption}>
                    <span className="add-icon">+</span>
                    Add option
                  </button>
                )}
              </div>
            </div>

            {/* Expiry Date */}
            <div className="form-group">
              <label className="form-label">
                Market Expiry
                <span className="label-badge">Optional</span>
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
              <p className="form-hint">
                When should the market close? Leave empty for indefinite.
              </p>
            </div>

            {/* Submit Button */}
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="submit-icon loading">⟳</span>
                  Deploying...
                </>
              ) : (
                <>
                  <span className="submit-icon">→</span>
                  Deploy Market
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="preview-panel">
          <div className="preview-sticky">
            <div className="preview-header">
              <h3 className="preview-title">Live Preview</h3>
              <button
                className="preview-toggle"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "○" : "●"}
              </button>
            </div>

            {showPreview && (
              <div className="preview-card">
                {/* Market Label Badge */}
                {label && (
                  <div className="market-label-badge">
                    <span className="label-dot">●</span>
                    <span className="label-text">{label}.haki.eth</span>
                  </div>
                )}

                {/* Preview Author */}
                <div className="preview-author">
                  <div className="preview-avatar">
                    <span className="avatar-icon">⬢</span>
                  </div>
                  <div className="preview-author-info">
                    <div className="preview-author-name">Your Wallet</div>
                    <div className="preview-author-time">Just now</div>
                  </div>
                </div>

                {/* Preview Description */}
                <p className="preview-description">
                  {description || "Your market description will appear here..."}
                </p>

                {/* Preview Options */}
                {options.filter((o) => o.text.trim()).length > 0 ? (
                  <div className="preview-options">
                    {options
                      .filter((o) => o.text.trim())
                      .map((option, index) => (
                        <div key={option.id} className="preview-option">
                          <div className="preview-option-content">
                            <span className="preview-option-indicator">▸</span>
                            <span className="preview-option-text">
                              {option.text}
                            </span>
                          </div>
                          <div className="preview-percentage">
                            {Math.max(0, 50 - index * 10)}%
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="preview-empty">
                    <div className="preview-empty-icon">◇</div>
                    <p className="preview-empty-text">
                      Add options to see market preview
                    </p>
                  </div>
                )}

                {/* Preview Footer */}
                {expiry && (
                  <div className="preview-footer">
                    <span className="footer-label">Expires</span>
                    <span className="footer-value">
                      {new Date(expiry).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Info Card */}
            <div className="info-card">
              <h4 className="info-title">⚡ Requirements</h4>
              <ul className="info-list">
                <li>Unique market label (lowercase, alphanumeric)</li>
                <li>Clear, unambiguous description</li>
                <li>At least 2 mutually exclusive options</li>
                <li>Gas fees required for on-chain deployment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
