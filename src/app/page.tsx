'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

export default function Home() {
  const [activeSidebarItem, setActiveSidebarItem] = useState('For You');
  const router = useRouter();

  return (
    <>
      <Navigation />

      {/* Main Container */}
      <div className="main-container">
        {/* Left Sidebar */}
        <aside className="left-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">Discover</div>
            {[
              { icon: '🏠', label: 'For You' },
              { icon: '🔥', label: 'Trending' },
              { icon: '✨', label: 'Fresh Takes' },
              { icon: '⚡', label: 'Closing Soon' },
            ].map((item) => (
              <button
                key={item.label}
                className={`sidebar-item ${activeSidebarItem === item.label ? 'active' : ''}`}
                onClick={() => setActiveSidebarItem(item.label)}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-title">Your Topics</div>
            {[
              { icon: '🎬', label: 'Movies & TV' },
              { icon: '🎮', label: 'Gaming' },
              { icon: '⚽', label: 'Sports' },
              { icon: '💼', label: 'Career' },
              { icon: '🌍', label: 'World Events' },
            ].map((item) => (
              <button
                key={item.label}
                className="sidebar-item"
                onClick={() => setActiveSidebarItem(item.label)}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Main Feed */}
        <main className="main-feed">
          <div className="feed-header">
            <h1 className="feed-title">What&apos;s Next?</h1>
            <p className="feed-subtitle">
              Predictions, advice, and debates from people who care about being right
            </p>
          </div>

          {/* Prediction Card 1 - Movie Recommendation */}
          <article className="prediction-card">
            <div className="card-author">
              <div className="author-avatar">🎬</div>
              <div className="author-info">
                <div className="author-name">Sarah Chen</div>
                <div className="author-interests">🎬 Horror · 🎭 Thriller · 📚 Psychological</div>
              </div>
              <div className="card-time">2h ago</div>
            </div>

            <h2 className="card-question">Which horror movie should I watch tonight?</h2>
            <p className="card-context">
              I loved Hereditary and The Witch — looking for something genuinely scary but with
              substance. Not a fan of cheap jumpscares or torture porn.
            </p>

            <div className="outcome-options">
              {[
                { emoji: '👻', text: 'The Exorcist (1973)', percentage: 42 },
                { emoji: '🔪', text: 'Sinister', percentage: 31 },
                { emoji: '🌊', text: 'The Lighthouse', percentage: 18 },
                { emoji: '👀', text: 'Something else', percentage: 9 },
              ].map((option) => (
                <div
                  key={option.text}
                  className="outcome-option"
                  style={{ '--fill-width': `${option.percentage}%` } as React.CSSProperties}
                >
                  <div className="outcome-option-content">
                    <span className="outcome-emoji">{option.emoji}</span>
                    <span className="outcome-text">{option.text}</span>
                  </div>
                  <div className="outcome-belief">
                    <div className="belief-dots">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`belief-dot ${i < Math.round(option.percentage / 20) ? 'active' : ''}`}
                        ></div>
                      ))}
                    </div>
                    <span className="belief-text">{option.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="card-actions">
              <div className="action-buttons">
                <button className="action-btn">
                  <span>💬</span> 47 comments
                </button>
                <button className="action-btn">
                  <span>👍</span> Agree
                </button>
                <button className="action-btn">
                  <span>⭐</span> Save
                </button>
              </div>
              <div className="credibility-badge">
                <span>✓</span> Horror fans agree
              </div>
            </div>
          </article>

          {/* Prediction Card 2 - Sports */}
          <article className="prediction-card">
            <div className="card-author">
              <div
                className="author-avatar"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
              >
                🏏
              </div>
              <div className="author-info">
                <div className="author-name">Raj Patel</div>
                <div className="author-interests">🏏 Cricket · ⚽ Football · 📊 Stats Nerd</div>
              </div>
              <div className="card-time">5h ago</div>
            </div>

            <h2 className="card-question">Will India win the next Test match vs Australia?</h2>
            <p className="card-context">
              BGT 2026, third test at Sydney. India needs this to stay in the series. Pitch
              historically favors spin.
            </p>

            <div className="outcome-options">
              {[
                { emoji: '🇮🇳', text: 'India wins', percentage: 58 },
                { emoji: '🇦🇺', text: 'Australia wins', percentage: 28 },
                { emoji: '🤝', text: 'Draw', percentage: 14 },
              ].map((option) => (
                <div
                  key={option.text}
                  className="outcome-option"
                  style={{ '--fill-width': `${option.percentage}%` } as React.CSSProperties}
                >
                  <div className="outcome-option-content">
                    <span className="outcome-emoji">{option.emoji}</span>
                    <span className="outcome-text">{option.text}</span>
                  </div>
                  <div className="outcome-belief">
                    <div className="belief-dots">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`belief-dot ${i < Math.round(option.percentage / 20) ? 'active' : ''}`}
                        ></div>
                      ))}
                    </div>
                    <span className="belief-text">{option.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="card-actions">
              <div className="action-buttons">
                <button className="action-btn">
                  <span>💬</span> 124 comments
                </button>
                <button className="action-btn">
                  <span>👍</span> Agree
                </button>
                <button className="action-btn">
                  <span>⭐</span> Save
                </button>
              </div>
              <div className="credibility-badge">
                <span>🔥</span> Trending in Sports
              </div>
            </div>
          </article>

          {/* Prediction Card 3 - Career Advice */}
          <article className="prediction-card">
            <div className="card-author">
              <div
                className="author-avatar"
                style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)' }}
              >
                💼
              </div>
              <div className="author-info">
                <div className="author-name">Alex Kim</div>
                <div className="author-interests">💼 Career · 💻 Tech · 🚀 Startups</div>
              </div>
              <div className="card-time">1d ago</div>
            </div>

            <h2 className="card-question">Should I take the startup offer or stay at BigCo?</h2>
            <p className="card-context">
              Got an offer from a Series A startup (0.2% equity, $140k) vs staying at current FAANG
              role ($220k TC). I&apos;m 28, no dependents, want to learn fast.
            </p>

            <div className="outcome-options">
              {[
                { emoji: '🚀', text: 'Take the startup offer', percentage: 67 },
                { emoji: '🏢', text: 'Stay at BigCo', percentage: 23 },
                { emoji: '🎯', text: 'Keep interviewing', percentage: 10 },
              ].map((option) => (
                <div
                  key={option.text}
                  className="outcome-option"
                  style={{ '--fill-width': `${option.percentage}%` } as React.CSSProperties}
                >
                  <div className="outcome-option-content">
                    <span className="outcome-emoji">{option.emoji}</span>
                    <span className="outcome-text">{option.text}</span>
                  </div>
                  <div className="outcome-belief">
                    <div className="belief-dots">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`belief-dot ${i < Math.round(option.percentage / 20) ? 'active' : ''}`}
                        ></div>
                      ))}
                    </div>
                    <span className="belief-text">{option.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="card-actions">
              <div className="action-buttons">
                <button className="action-btn">
                  <span>💬</span> 89 comments
                </button>
                <button className="action-btn">
                  <span>👍</span> Agree
                </button>
                <button className="action-btn">
                  <span>⭐</span> Save
                </button>
              </div>
              <div className="credibility-badge">
                <span>✓</span> Founders agree
              </div>
            </div>
          </article>

          {/* Prediction Card 4 - Gaming */}
          <article className="prediction-card">
            <div className="card-author">
              <div
                className="author-avatar"
                style={{ background: 'linear-gradient(135deg, #00d4aa, #00a0aa)' }}
              >
                🎮
              </div>
              <div className="author-info">
                <div className="author-name">Maya Rodriguez</div>
                <div className="author-interests">🎮 RPGs · 🗡️ Souls-like · 🏆 Completionist</div>
              </div>
              <div className="card-time">6h ago</div>
            </div>

            <h2 className="card-question">Is Elden Ring worth starting in 2026?</h2>
            <p className="card-context">
              Never played a FromSoft game before. Friends say it&apos;s amazing but super hard. I
              have ~20 hours/week to game. Should I dive in or is the hype over?
            </p>

            <div className="outcome-options">
              {[
                { emoji: '⚔️', text: 'Absolutely worth it', percentage: 81 },
                { emoji: '⏰', text: 'Wait for sale', percentage: 12 },
                { emoji: '❌', text: 'Not worth the time', percentage: 7 },
              ].map((option) => (
                <div
                  key={option.text}
                  className="outcome-option"
                  style={{ '--fill-width': `${option.percentage}%` } as React.CSSProperties}
                >
                  <div className="outcome-option-content">
                    <span className="outcome-emoji">{option.emoji}</span>
                    <span className="outcome-text">{option.text}</span>
                  </div>
                  <div className="outcome-belief">
                    <div className="belief-dots">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`belief-dot ${i < Math.round(option.percentage / 20) ? 'active' : ''}`}
                        ></div>
                      ))}
                    </div>
                    <span className="belief-text">{option.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="card-actions">
              <div className="action-buttons">
                <button className="action-btn">
                  <span>💬</span> 203 comments
                </button>
                <button className="action-btn">
                  <span>👍</span> Agree
                </button>
                <button className="action-btn">
                  <span>⭐</span> Save
                </button>
              </div>
              <div className="credibility-badge">
                <span>✓</span> RPG veterans agree
              </div>
            </div>
          </article>
        </main>

        {/* Right Sidebar */}
        <aside className="right-sidebar">
          {/* Create Prediction Card */}
          <div className="create-prediction-card" onClick={() => router.push('/create')}>
            <div className="create-card-content">
              <div className="create-icon-wrapper">
                <div className="create-icon">✨</div>
              </div>
              <h3 className="create-card-title">Create Prediction</h3>
              <p className="create-card-subtitle">Share your insights and predictions with the community</p>
              <button className="create-card-btn">
                <span className="create-btn-icon">+</span>
                New Prediction
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="sidebar-widget stats-widget">
            <h3 className="widget-title">Your Activity</h3>
            <div className="quick-stats-grid">
              <div className="quick-stat">
                <div className="quick-stat-value">12</div>
                <div className="quick-stat-label">Active</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat-value">73%</div>
                <div className="quick-stat-label">Win Rate</div>
              </div>
              <div className="quick-stat">
                <div className="quick-stat-value">8</div>
                <div className="quick-stat-label">Streak</div>
              </div>
            </div>
          </div>

          {/* Suggested Users */}
          <div className="sidebar-widget">
            <h3 className="widget-title">Smart People to Follow</h3>

            {[
              {
                emoji: '🎯',
                name: 'David Park',
                expertise: '📊 Economics · 92% accurate',
                gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              },
              {
                emoji: '🧠',
                name: 'Lisa Chen',
                expertise: '🔬 Science · 88% accurate',
                gradient: 'linear-gradient(135deg, #a78bfa, #818cf8)',
              },
              {
                emoji: '⚡',
                name: 'Marcus Johnson',
                expertise: '⚽ Sports · 85% accurate',
                gradient: 'linear-gradient(135deg, #00d4aa, #00a0aa)',
              },
            ].map((user, index) => (
              <div key={index} className="suggested-user">
                <div className="suggested-avatar" style={{ background: user.gradient }}>
                  {user.emoji}
                </div>
                <div className="suggested-info">
                  <div className="suggested-name">{user.name}</div>
                  <div className="suggested-expertise">{user.expertise}</div>
                </div>
                <button className="follow-btn">Follow</button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
