'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import './create.css';

interface OutcomeOption {
  id: string;
  emoji: string;
  text: string;
}

const EMOJI_SUGGESTIONS = [
  '🎬', '🎮', '⚽', '🏀', '🎯', '🎲', '🎪', '🎨',
  '🚀', '💡', '⭐', '🔥', '✨', '💎', '🏆', '🎭',
  '🌟', '💫', '⚡', '🌈', '🎵', '📚', '💼', '🌍',
  '🏃', '🎤', '🎸', '🎹', '🎺', '🎻', '🥁', '🎧',
  '📱', '💻', '🖥️', '⌚', '📷', '🎥', '📺', '🎞️',
  '✅', '❌', '⭕', '🔴', '🟢', '🟡', '🔵', '🟣',
];

const CATEGORIES = [
  { id: 'movies', label: 'Movies & TV', emoji: '🎬', gradient: 'linear-gradient(135deg, #a78bfa, #818cf8)' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', gradient: 'linear-gradient(135deg, #00d4aa, #00a0aa)' },
  { id: 'sports', label: 'Sports', emoji: '⚽', gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
  { id: 'tech', label: 'Technology', emoji: '💻', gradient: 'linear-gradient(135deg, #ff6b4a, #ff8566)' },
  { id: 'career', label: 'Career', emoji: '💼', gradient: 'linear-gradient(135deg, #a78bfa, #818cf8)' },
  { id: 'world', label: 'World Events', emoji: '🌍', gradient: 'linear-gradient(135deg, #00d4aa, #00a0aa)' },
  { id: 'lifestyle', label: 'Lifestyle', emoji: '✨', gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
  { id: 'science', label: 'Science', emoji: '🔬', gradient: 'linear-gradient(135deg, #ff6b4a, #00d4aa)' },
];

export default function CreatePage() {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [outcomes, setOutcomes] = useState<OutcomeOption[]>([
    { id: '1', emoji: '✅', text: '' },
    { id: '2', emoji: '❌', text: '' },
  ]);
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const addOutcome = () => {
    if (outcomes.length < 6) {
      setOutcomes([
        ...outcomes,
        { id: Date.now().toString(), emoji: '⭕', text: '' },
      ]);
    }
  };

  const removeOutcome = (id: string) => {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((o) => o.id !== id));
    }
  };

  const updateOutcome = (id: string, field: 'emoji' | 'text', value: string) => {
    setOutcomes(
      outcomes.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  const selectedCategoryData = CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <>
      <Navigation />

      {/* Create Container */}
      <div className="create-container">
        {/* Form Panel */}
        <div className="form-panel">
          <div className="form-header">
            <h1 className="form-title">Create a Prediction</h1>
            <p className="form-subtitle">
              Ask a question, present the options, and let the community weigh in
            </p>
          </div>

          <div className="form-content">
            {/* Question Input */}
            <div className="form-group">
              <label className="form-label">
                Your Question
                <span className="label-badge">Required</span>
              </label>
              <input
                type="text"
                className="form-input large"
                placeholder="What's your question or prediction?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={120}
              />
              <div className="char-count">{question.length}/120</div>
            </div>

            {/* Context Input */}
            <div className="form-group">
              <label className="form-label">
                Context & Details
                <span className="label-badge">Optional</span>
              </label>
              <textarea
                className="form-textarea"
                placeholder="Provide background, constraints, or details that help people make an informed prediction..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <div className="char-count">{context.length}/500</div>
            </div>

            {/* Category Selection */}
            <div className="form-group">
              <label className="form-label">
                Category
                <span className="label-badge">Required</span>
              </label>
              <div className="category-grid">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={
                      selectedCategory === cat.id
                        ? { background: cat.gradient }
                        : undefined
                    }
                  >
                    <span className="category-emoji">{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Outcome Options */}
            <div className="form-group">
              <label className="form-label">
                Outcome Options
                <span className="label-badge">{outcomes.length} options</span>
              </label>
              <div className="outcomes-list">
                {outcomes.map((outcome, index) => (
                  <div key={outcome.id} className="outcome-builder">
                    <div className="outcome-number">{index + 1}</div>

                    <div className="emoji-picker-wrapper">
                      <button
                        className="emoji-trigger"
                        onClick={() =>
                          setActiveEmojiPicker(
                            activeEmojiPicker === outcome.id ? null : outcome.id
                          )
                        }
                      >
                        {outcome.emoji}
                      </button>

                      {activeEmojiPicker === outcome.id && (
                        <div className="emoji-picker">
                          {EMOJI_SUGGESTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              className="emoji-option"
                              onClick={() => {
                                updateOutcome(outcome.id, 'emoji', emoji);
                                setActiveEmojiPicker(null);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      className="outcome-input"
                      placeholder={`Option ${index + 1}`}
                      value={outcome.text}
                      onChange={(e) =>
                        updateOutcome(outcome.id, 'text', e.target.value)
                      }
                      maxLength={60}
                    />

                    {outcomes.length > 2 && (
                      <button
                        className="remove-outcome-btn"
                        onClick={() => removeOutcome(outcome.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {outcomes.length < 6 && (
                  <button className="add-outcome-btn" onClick={addOutcome}>
                    <span className="add-icon">+</span>
                    Add another option
                  </button>
                )}
              </div>
            </div>

            {/* Close Date */}
            <div className="form-group">
              <label className="form-label">
                Close Date
                <span className="label-badge">Optional</span>
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
              />
              <p className="form-hint">
                When should predictions close? Leave empty for no deadline.
              </p>
            </div>

            {/* Submit Button */}
            <button className="submit-btn">
              <span className="submit-icon">✨</span>
              Publish Prediction
              <div className="submit-glow"></div>
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
                {showPreview ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            {showPreview && (
              <div className="preview-card">
                {/* Preview Author */}
                <div className="preview-author">
                  <div
                    className="preview-avatar"
                    style={{
                      background: selectedCategoryData?.gradient || 'linear-gradient(135deg, #a78bfa, #818cf8)',
                    }}
                  >
                    {selectedCategoryData?.emoji || '✨'}
                  </div>
                  <div className="preview-author-info">
                    <div className="preview-author-name">You</div>
                    <div className="preview-author-category">
                      {selectedCategoryData?.label || 'Select a category'}
                    </div>
                  </div>
                  <div className="preview-time">Just now</div>
                </div>

                {/* Preview Question */}
                <h2 className="preview-question">
                  {question || 'Your question will appear here...'}
                </h2>

                {context && <p className="preview-context">{context}</p>}

                {/* Preview Options */}
                {outcomes.filter((o) => o.text.trim()).length > 0 && (
                  <div className="preview-outcomes">
                    {outcomes
                      .filter((o) => o.text.trim())
                      .map((outcome, index) => (
                        <div
                          key={outcome.id}
                          className="preview-outcome"
                          style={{
                            '--preview-fill': `${Math.max(0, 60 - index * 15)}%`,
                          } as React.CSSProperties}
                        >
                          <div className="preview-outcome-content">
                            <span className="preview-outcome-emoji">
                              {outcome.emoji}
                            </span>
                            <span className="preview-outcome-text">
                              {outcome.text}
                            </span>
                          </div>
                          <div className="preview-belief">
                            <div className="preview-belief-dots">
                              {[...Array(5)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`preview-belief-dot ${
                                    i < 3 - index ? 'active' : ''
                                  }`}
                                ></div>
                              ))}
                            </div>
                            <span className="preview-belief-text">
                              {Math.max(0, 60 - index * 15)}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Preview Actions */}
                <div className="preview-actions">
                  <div className="preview-action-buttons">
                    <button className="preview-action-btn">
                      <span>💬</span> Comment
                    </button>
                    <button className="preview-action-btn">
                      <span>👍</span> Agree
                    </button>
                    <button className="preview-action-btn">
                      <span>⭐</span> Save
                    </button>
                  </div>
                </div>

                {/* Empty State */}
                {outcomes.filter((o) => o.text.trim()).length === 0 && (
                  <div className="preview-empty">
                    <div className="preview-empty-icon">🎯</div>
                    <p className="preview-empty-text">
                      Add outcome options to see your prediction come to life
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tips Card */}
            <div className="tips-card">
              <h4 className="tips-title">💡 Pro Tips</h4>
              <ul className="tips-list">
                <li>Be specific and clear in your question</li>
                <li>Provide enough context for informed predictions</li>
                <li>Use emojis to make options visually distinct</li>
                <li>Keep options mutually exclusive</li>
                <li>Set a close date for time-sensitive predictions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
