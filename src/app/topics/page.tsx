'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import './topics.css';

interface TopicPrediction {
  title: string;
  participants: number;
  timeLeft?: string;
}

interface Topic {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  activePredictions: number;
  totalParticipants: string;
  trending: boolean;
  growthRate?: string;
  topPredictions: TopicPrediction[];
  description: string;
}

const TOPICS: Topic[] = [
  {
    id: 'movies-tv',
    name: 'Movies & TV',
    emoji: '🎬',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #6366f1 100%)',
    activePredictions: 1247,
    totalParticipants: '24.3k',
    trending: true,
    growthRate: '+18%',
    description: 'What to watch, award predictions, and entertainment debates',
    topPredictions: [
      { title: 'Best horror movie of 2026?', participants: 892, timeLeft: '3d left' },
      { title: 'Will Stranger Things S5 stick the landing?', participants: 1456 },
      { title: 'Oscar Best Picture predictions', participants: 734, timeLeft: '1d left' },
    ],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    emoji: '🎮',
    gradient: 'linear-gradient(135deg, #00d4aa 0%, #00a0aa 50%, #008899 100%)',
    activePredictions: 2134,
    totalParticipants: '41.2k',
    trending: true,
    growthRate: '+24%',
    description: 'Game releases, esports, and gaming culture predictions',
    topPredictions: [
      { title: 'GTA 6 release date speculation', participants: 3421, timeLeft: '2d left' },
      { title: 'Is Elden Ring worth it in 2026?', participants: 1203 },
      { title: 'Will Nintendo announce Switch 2?', participants: 2156, timeLeft: '5h left' },
    ],
  },
  {
    id: 'sports',
    name: 'Sports',
    emoji: '⚽',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
    activePredictions: 1876,
    totalParticipants: '52.7k',
    trending: true,
    growthRate: '+31%',
    description: 'Match predictions, player performance, and sports analysis',
    topPredictions: [
      { title: 'India vs Australia Test match', participants: 4523, timeLeft: '1d left' },
      { title: 'NBA Finals champion 2026', participants: 2891 },
      { title: 'Premier League top 4 predictions', participants: 1967 },
    ],
  },
  {
    id: 'technology',
    name: 'Technology',
    emoji: '💻',
    gradient: 'linear-gradient(135deg, #ff6b4a 0%, #ff8566 50%, #ff9f82 100%)',
    activePredictions: 1523,
    totalParticipants: '38.4k',
    trending: true,
    growthRate: '+15%',
    description: 'Tech trends, product launches, and innovation forecasts',
    topPredictions: [
      { title: 'GPT-5 release date predictions', participants: 2847, timeLeft: '6d left' },
      { title: 'Will Apple Vision Pro succeed?', participants: 1923 },
      { title: 'Next big AI breakthrough?', participants: 1456 },
    ],
  },
  {
    id: 'career',
    name: 'Career & Work',
    emoji: '💼',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #c026d3 100%)',
    activePredictions: 892,
    totalParticipants: '19.8k',
    trending: false,
    description: 'Job advice, salary negotiations, and career decisions',
    topPredictions: [
      { title: 'Should I take the startup offer?', participants: 1089, timeLeft: '4d left' },
      { title: 'Best time to ask for a raise?', participants: 743 },
      { title: 'Remote work in 2027: still a thing?', participants: 1234 },
    ],
  },
  {
    id: 'world-events',
    name: 'World Events',
    emoji: '🌍',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
    activePredictions: 2341,
    totalParticipants: '67.9k',
    trending: true,
    growthRate: '+42%',
    description: 'Global affairs, politics, and major world developments',
    topPredictions: [
      { title: 'Mars landing in 2027?', participants: 5234, timeLeft: '2d left' },
      { title: 'Climate summit outcomes', participants: 2876 },
      { title: '2026 election predictions', participants: 4123, timeLeft: '12h left' },
    ],
  },
  {
    id: 'science',
    name: 'Science',
    emoji: '🔬',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
    activePredictions: 673,
    totalParticipants: '15.3k',
    trending: false,
    description: 'Research breakthroughs, space exploration, and discoveries',
    topPredictions: [
      { title: 'JWST next major discovery?', participants: 1456 },
      { title: 'Cancer cure timeline predictions', participants: 2103, timeLeft: '5d left' },
      { title: 'Quantum computing breakthrough', participants: 987 },
    ],
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    emoji: '✨',
    gradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #db2777 100%)',
    activePredictions: 1156,
    totalParticipants: '28.6k',
    trending: false,
    description: 'Life advice, travel, food, and personal decisions',
    topPredictions: [
      { title: 'Best vacation spot for 2026?', participants: 1821 },
      { title: 'Is intermittent fasting worth it?', participants: 1345, timeLeft: '3d left' },
      { title: 'Top restaurant trends this year', participants: 923 },
    ],
  },
];

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Topics', icon: '🌟' },
  { id: 'trending', label: 'Trending', icon: '🔥' },
  { id: 'popular', label: 'Most Active', icon: '⚡' },
  { id: 'new', label: 'New', icon: '✨' },
];

export default function TopicsPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('all');
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);

  const filteredTopics = TOPICS.filter((topic) => {
    if (activeFilter === 'trending') return topic.trending;
    if (activeFilter === 'popular') return parseInt(topic.totalParticipants) > 30000;
    return true;
  });

  return (
    <>
      <Navigation />

      {/* Topics Container */}
      <div className="topics-container">
        {/* Hero Section */}
        <div className="topics-hero">
          <div className="hero-content">
            <h1 className="hero-title">Explore Topics</h1>
            <p className="hero-subtitle">
              Dive into communities where curiosity meets collective wisdom
            </p>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="stat-value">8.2k</div>
              <div className="stat-label">Active Predictions</div>
            </div>
            <div className="stat-divider"></div>
            <div className="hero-stat">
              <div className="stat-value">287k</div>
              <div className="stat-label">Total Participants</div>
            </div>
            <div className="stat-divider"></div>
            <div className="hero-stat">
              <div className="stat-value">24</div>
              <div className="stat-label">Closing Today</div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          {FILTER_OPTIONS.map((filter) => (
            <button
              key={filter.id}
              className={`filter-chip ${activeFilter === filter.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              <span className="filter-icon">{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>

        {/* Topics Grid */}
        <div className="topics-grid">
          {filteredTopics.map((topic, index) => (
            <div
              key={topic.id}
              className={`topic-card ${hoveredTopic === topic.id ? 'hovered' : ''} ${
                topic.trending ? 'trending' : ''
              }`}
              onMouseEnter={() => setHoveredTopic(topic.id)}
              onMouseLeave={() => setHoveredTopic(null)}
              style={{
                animationDelay: `${index * 0.08}s`,
              }}
            >
              {/* Topic Header */}
              <div className="topic-header" style={{ background: topic.gradient }}>
                <div className="topic-header-content">
                  <div className="topic-icon">{topic.emoji}</div>
                  <div className="topic-info">
                    <h2 className="topic-name">{topic.name}</h2>
                    <p className="topic-description">{topic.description}</p>
                  </div>
                  {topic.trending && (
                    <div className="trending-badge">
                      <span className="trending-icon">🔥</span>
                      <span className="trending-text">{topic.growthRate}</span>
                    </div>
                  )}
                </div>

                <div className="topic-stats-header">
                  <div className="stat-item">
                    <div className="stat-item-value">{topic.activePredictions.toLocaleString()}</div>
                    <div className="stat-item-label">Predictions</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-item-value">{topic.totalParticipants}</div>
                    <div className="stat-item-label">Participants</div>
                  </div>
                </div>
              </div>

              {/* Topic Body */}
              <div className="topic-body">
                <h3 className="topic-section-title">Trending Now</h3>
                <div className="topic-predictions">
                  {topic.topPredictions.map((prediction, idx) => (
                    <div key={idx} className="topic-prediction-item">
                      <div className="prediction-item-content">
                        <div className="prediction-item-title">{prediction.title}</div>
                        <div className="prediction-item-meta">
                          <span className="prediction-participants">
                            👥 {prediction.participants.toLocaleString()}
                          </span>
                          {prediction.timeLeft && (
                            <>
                              <span className="meta-dot">•</span>
                              <span className="prediction-time">⏰ {prediction.timeLeft}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="prediction-arrow">→</div>
                    </div>
                  ))}
                </div>

                <button className="explore-topic-btn">
                  <span>Explore {topic.name}</span>
                  <span className="explore-icon">→</span>
                </button>
              </div>

              {/* Decorative Elements */}
              <div className="topic-glow" style={{ background: topic.gradient }}></div>
            </div>
          ))}
        </div>

        {/* Create Your Own Section */}
        <div className="create-topic-cta">
          <div className="cta-content">
            <div className="cta-icon">✨</div>
            <h3 className="cta-title">Don't see your interest?</h3>
            <p className="cta-description">
              Create a prediction in any category and help build new communities
            </p>
            <button className="cta-button" onClick={() => router.push('/create')}>
              <span className="cta-button-icon">+</span>
              Create Prediction
            </button>
          </div>
          <div className="cta-decoration">
            <div className="decoration-orb orb-1"></div>
            <div className="decoration-orb orb-2"></div>
            <div className="decoration-orb orb-3"></div>
          </div>
        </div>
      </div>
    </>
  );
}
