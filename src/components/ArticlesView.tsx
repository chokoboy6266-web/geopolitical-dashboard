import React, { useState, useEffect } from 'react';
import { fetchArticles } from '../services/aiService';
import type { Article } from '../services/aiService';

interface ArticlesViewProps {
  selectedArticleId: string | null;
  onSelectArticle: (id: string | null) => void;
}

const ArticlesView: React.FC<ArticlesViewProps> = ({ selectedArticleId, onSelectArticle }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const loadArticles = async () => {
      setLoading(true);
      const data = await fetchArticles();
      setArticles(data);
      setLoading(false);
    };
    loadArticles();
  }, []);

  const filteredArticles = articles.filter(art => 
    art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    art.telegramAnalysis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentArticle = articles.find(art => art.id === selectedArticleId) || articles[0];

  // Custom renderer for structured realist article sections
  const renderArticleContent = (content: string) => {
    if (!content) return null;
    
    // Split content by headers
    const sections = content.split(/(?=# )/g);
    
    return sections.map((sec, idx) => {
      const lines = sec.trim().split('\n');
      const title = lines[0].replace('# ', '').trim();
      const body = lines.slice(1).join('\n').trim();
      
      if (!title) return null;

      // Icon and color coding by section type
      let icon = '📋';
      let accentColor = '#4dabf7';
      let bgGrad = 'rgba(77, 171, 247, 0.03)';
      let borderCol = 'rgba(77, 171, 247, 0.15)';

      if (title.toLowerCase().includes('strategic')) {
        icon = '🧠';
        accentColor = '#f03e3e'; // Red for risk/strategy
        bgGrad = 'rgba(240, 62, 62, 0.03)';
        borderCol = 'rgba(240, 62, 62, 0.15)';
      } else if (title.toLowerCase().includes('economic') || title.toLowerCase().includes('resource')) {
        icon = '⚡';
        accentColor = '#fab005'; // Yellow/Gold for economics/energy
        bgGrad = 'rgba(250, 176, 5, 0.03)';
        borderCol = 'rgba(250, 176, 5, 0.15)';
      } else if (title.toLowerCase().includes('path') || title.toLowerCase().includes('watch')) {
        icon = '👁️';
        accentColor = '#12b886'; // Teal for future watch
        bgGrad = 'rgba(18, 184, 134, 0.03)';
        borderCol = 'rgba(18, 184, 134, 0.15)';
      }

      return (
        <div 
          key={idx} 
          style={{ 
            background: bgGrad,
            border: `1px solid ${borderCol}`,
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.25rem',
            boxShadow: `0 4px 20px rgba(0,0,0,0.15)`,
            transition: 'transform 0.2s ease'
          }}
        >
          <h3 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.6rem', 
            color: accentColor, 
            fontSize: '1.1rem', 
            fontWeight: '800', 
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 0.8rem 0'
          }}>
            <span>{icon}</span> {title}
          </h3>
          <p style={{ 
            color: '#ddd', 
            lineHeight: '1.6', 
            fontSize: '0.95rem', 
            margin: 0,
            whiteSpace: 'pre-line' 
          }}>
            {body}
          </p>
        </div>
      );
    });
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#050505', color: '#fff' }}>
      
      {/* Sidebar List */}
      <div style={{ 
        width: '320px', 
        borderRight: '1px solid rgba(255,255,255,0.05)', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        backgroundColor: '#0a0a0a',
        flexShrink: 0
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>Strategic Library</h2>
          <input 
            type="text" 
            placeholder="Search articles..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.6rem 1rem', 
              borderRadius: '8px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              backgroundColor: '#151515', 
              color: '#fff',
              fontSize: '0.85rem' 
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>Loading articles...</div>
          ) : filteredArticles.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>No articles found.</div>
          ) : (
            filteredArticles.map(art => {
              const isActive = currentArticle && art.id === currentArticle.id;
              return (
                <div 
                  key={art.id}
                  onClick={() => onSelectArticle(art.id)}
                  style={{ 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    backgroundColor: isActive ? 'rgba(77, 171, 247, 0.1)' : 'transparent',
                    border: isActive ? '1px solid rgba(77, 171, 247, 0.3)' : '1px solid transparent',
                    marginBottom: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <h4 style={{ 
                    margin: '0 0 0.5rem 0', 
                    fontSize: '0.9rem', 
                    fontWeight: '700', 
                    color: isActive ? '#4dabf7' : '#fff',
                    lineHeight: '1.4'
                  }}>
                    {art.title}
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#666' }}>
                    <span>{art.source}</span>
                    <span>{new Date(art.date).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reader Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', backgroundColor: '#050505' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
            Retrieving Strategic Intelligence...
          </div>
        ) : !currentArticle ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
            Select an article from the library to begin reading.
          </div>
        ) : (
          <div style={{ padding: '2.5rem max(2rem, 8%)', maxWidth: '850px', margin: '0 auto', width: '100%' }}>
            
            {/* Header metadata */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
              <span style={{ 
                background: 'rgba(77, 171, 247, 0.15)', 
                color: '#4dabf7', 
                fontSize: '0.7rem', 
                padding: '0.2rem 0.6rem', 
                borderRadius: '4px', 
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Strategic Analysis
              </span>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>
                {new Date(currentArticle.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </span>
            </div>

            {/* Title */}
            <h1 style={{ 
              fontSize: '2.25rem', 
              fontWeight: '850', 
              color: '#fff', 
              lineHeight: '1.25',
              letterSpacing: '-0.02em',
              margin: '0 0 1.5rem 0'
            }}>
              {currentArticle.title}
            </h1>

            {/* Author/Source Badge & Share buttons */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              paddingBottom: '1.5rem', 
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #4dabf7, #228be6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  color: '#000'
                }}>
                  SP
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#eee' }}>Shivam Punjabi</div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>Creator</div>
                </div>
              </div>

              {/* Share links */}
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🚨 Shivam Punjabi Intel Digest: ${currentArticle.title}\n\nRead the full report here: `)}${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: '#fff', 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '6px', 
                    fontSize: '0.75rem', 
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  🚀 Share on X
                </a>
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(`🚨 Shivam Punjabi Intel Digest: ${currentArticle.title}\n\nRead the full report here: `)}${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    background: 'rgba(37, 211, 102, 0.1)', 
                    border: '1px solid rgba(37, 211, 102, 0.2)', 
                    color: '#25D366', 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '6px', 
                    fontSize: '0.75rem', 
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  📱 WhatsApp
                </a>
                <a 
                  href={currentArticle.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid rgba(255,255,255,0.05)', 
                    color: '#aaa', 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '6px', 
                    fontSize: '0.75rem', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  🌐 Original Source
                </a>
              </div>
            </div>

            {/* Quick Summary Block */}
            <div style={{ 
              background: 'rgba(77, 171, 247, 0.05)', 
              borderLeft: '4px solid #4dabf7', 
              padding: '1.25rem', 
              borderRadius: '0 8px 8px 0', 
              marginBottom: '2rem' 
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4dabf7', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                Bullet Summary (Telegram Feed)
              </span>
              <p style={{ margin: 0, color: '#eee', fontStyle: 'italic', fontSize: '0.95rem', lineHeight: '1.5' }}>
                "{currentArticle.telegramAnalysis}"
              </p>
            </div>

            {/* Markdown rendered sections */}
            <div className="article-body">
              {renderArticleContent(currentArticle.fullArticle)}
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

export default ArticlesView;
