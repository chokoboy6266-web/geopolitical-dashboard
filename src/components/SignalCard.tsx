import React, { useState } from "react";
import type { Signal } from "../services/aiService";

const CATEGORY_COLORS: Record<string, string> = {
  security: '#f03e3e',
  energy: '#fab005',
  technology: '#15aabf',
  diplomacy: '#40c057'
};

const CATEGORY_BG_COLORS: Record<string, string> = {
  security: 'rgba(240, 62, 62, 0.08)',
  energy: 'rgba(250, 176, 5, 0.08)',
  technology: 'rgba(21, 170, 191, 0.08)',
  diplomacy: 'rgba(64, 192, 87, 0.08)'
};

const CATEGORY_BORDER_COLORS: Record<string, string> = {
  security: 'rgba(240, 62, 62, 0.15)',
  energy: 'rgba(250, 176, 5, 0.15)',
  technology: 'rgba(21, 170, 191, 0.15)',
  diplomacy: 'rgba(64, 192, 87, 0.15)'
};

const CATEGORY_BADGES: Record<string, string> = {
  security: '🛡️ SECURITY',
  energy: '⚡ ENERGY',
  technology: '💻 TECH',
  diplomacy: '🕊️ DIPLOMACY'
};

interface SignalCardProps {
  signal: Signal;
  voicesEnabled: boolean;
}

const SignalCard: React.FC<SignalCardProps> = ({ signal, voicesEnabled }) => {
  const [showContext, setShowContext] = useState(false);
  const [showPerspectives, setShowPerspectives] = useState(false);

  if (!signal) return null;

  return (
    <div className="signal-card" style={{ 
      marginBottom: '1.5rem', 
      border: '1px solid rgba(255,255,255,0.05)', 
      borderRadius: '12px', 
      background: 'rgba(255,255,255,0.01)', 
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      {/* What Changed Highlight */}
      <div style={{ 
        background: CATEGORY_BG_COLORS[signal.category] || 'rgba(0, 150, 255, 0.08)', 
        padding: '0.6rem 1rem', 
        fontSize: '0.75rem', 
        color: CATEGORY_COLORS[signal.category] || '#4dabf7', 
        borderBottom: `1px solid ${CATEGORY_BORDER_COLORS[signal.category] || 'rgba(0, 150, 255, 0.1)'}`,
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        letterSpacing: '0.02em',
        textTransform: 'uppercase'
      }}>
        <span style={{ opacity: 0.8 }}>⚡</span> {signal.intelligence.whatChanged}
      </div>

      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', lineHeight: '1.4', flex: 1, marginRight: '1rem', color: '#fff' }}>{signal.summary}</h3>
          <div style={{ display: 'flex', gap: '0.4rem', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
            <div style={{ background: 'rgba(255, 69, 69, 0.15)', color: '#ff4545', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              RISK {signal.riskScore}
            </div>
            <div style={{ 
              background: CATEGORY_BG_COLORS[signal.category] || 'rgba(255,255,255,0.05)', 
              color: CATEGORY_COLORS[signal.category] || '#aaa', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '6px', 
              fontSize: '0.65rem', 
              fontWeight: '700', 
              letterSpacing: '0.02em',
              border: `1px solid ${CATEGORY_BORDER_COLORS[signal.category] || 'transparent'}`,
              whiteSpace: 'nowrap'
            }}>
              {CATEGORY_BADGES[signal.category] || signal.category.toUpperCase()}
            </div>
          </div>
        </div>

        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>{signal.whyItMatters}</p>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button 
            onClick={() => setShowContext(!showContext)}
            style={{ 
              flex: 1, 
              background: 'transparent', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: '#aaa', 
              padding: '0.6rem', 
              borderRadius: '8px', 
              fontSize: '0.75rem', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            {showContext ? "Hide Context" : "Analyst Context"}
          </button>
          <button 
            onClick={() => setShowPerspectives(!showPerspectives)}
            style={{ 
              flex: 1, 
              background: showPerspectives ? 'rgba(77, 171, 247, 0.15)' : 'transparent', 
              border: '1px solid rgba(77, 171, 247, 0.3)', 
              color: '#4dabf7', 
              padding: '0.6rem', 
              borderRadius: '8px', 
              fontSize: '0.75rem', 
              cursor: 'pointer', 
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            {showPerspectives ? "Hide Perspectives" : "Perspectives"}
            <span style={{ transform: showPerspectives ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>↓</span>
          </button>
        </div>

        {/* X Post Button (Enhanced Hook Engine) */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <a 
            href={`https://x.com/intent/tweet?text=${(() => {
              const hook = signal.riskScore >= 8 ? "🔴 CRITICAL ALERT:" : signal.riskScore >= 6 ? "🔍 STRATEGIC BRIEF:" : "📡 INTEL UPDATE:";
              const summary = signal.summary;
              const insight = signal.voices.keyTakeaway.split('.')[0] + ".";
              const url = signal.sourceUrl ? `\n\nFull Report: ${signal.sourceUrl}` : "";
              const question = `\n\nWhat's your take on this shift? 👇`;
              const tags = `\n\n#Geopolitics #${signal.context.region.replace(/\s+/g, '')}`;
              
              // Build the post and ensure it's punchy
              const fullPost = `${hook}\n${summary}\n\n💡 ${insight}${url}${question}${tags}`;
              return encodeURIComponent(fullPost);
            })()}`}
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              flex: 1,
              background: '#fff', 
              color: '#000', 
              border: 'none', 
              padding: '0.6rem', 
              borderRadius: '8px', 
              fontSize: '0.75rem', 
              fontWeight: '800', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              transition: 'all 0.2s',
              textDecoration: 'none'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#eee'}
            onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
          >
            <i className="fab fa-x-twitter" style={{ fontSize: '0.9rem' }}></i> Post to X
          </a>

          {signal.sourceUrl && (
            <a 
              href={signal.sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                flex: 1,
                background: 'rgba(255,255,255,0.05)', 
                color: '#aaa', 
                border: '1px solid rgba(255,255,255,0.1)', 
                padding: '0.6rem', 
                borderRadius: '8px', 
                fontSize: '0.75rem', 
                fontWeight: '600', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem',
                transition: 'all 0.2s',
                textDecoration: 'none'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              📄 Read Full Report
            </a>
          )}
        </div>

        {showContext && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: '#666', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Historical Context</div>
              <p style={{ color: '#aaa', lineHeight: '1.4' }}>{signal.context.historicalContext}</p>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: '#666', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Existing Tensions</div>
              <p style={{ color: '#aaa', lineHeight: '1.4' }}>{signal.context.existingTensions}</p>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Strategic Impact</div>
              <p style={{ color: '#aaa', lineHeight: '1.4' }}>{signal.intelligence.secondOrderImpact.strategic}</p>
            </div>
          </div>
        )}

        {showPerspectives && (
          <div style={{ 
            marginTop: '0.5rem', 
            borderTop: '1px solid rgba(255,255,255,0.05)', 
            paddingTop: '1.25rem',
            animation: 'slideDown 0.3s ease'
          }}>
            {/* Analytical Lenses */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ color: '#4dabf7', fontSize: '0.75rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', letterSpacing: '0.05em' }}>
                <span style={{ fontSize: '1rem' }}>🔍</span> ANALYTICAL LENSES
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: '700', letterSpacing: '0.05em' }}>Strategic Lens</div>
                  <p style={{ color: '#eee', fontSize: '0.85rem', lineHeight: '1.4' }}>{signal.voices.perspectives.strategic}</p>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: '700', letterSpacing: '0.05em' }}>Economic Lens</div>
                  <p style={{ color: '#eee', fontSize: '0.85rem', lineHeight: '1.4' }}>{signal.voices.perspectives.economic}</p>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: '700', letterSpacing: '0.05em' }}>Risk Lens</div>
                  <p style={{ color: '#eee', fontSize: '0.85rem', lineHeight: '1.4' }}>{signal.voices.perspectives.risk}</p>
                </div>
              </div>
            </div>

            {/* Key Takeaway */}
            <div style={{ 
              marginBottom: '1.5rem', 
              background: 'rgba(77, 171, 247, 0.08)', 
              border: '1px solid rgba(77, 171, 247, 0.15)', 
              padding: '1rem', 
              borderRadius: '10px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '4px', 
                height: '100%', 
                background: '#4dabf7' 
              }}></div>
              <div style={{ color: '#4dabf7', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Takeaway</div>
              <p style={{ color: '#fff', fontSize: '0.9rem', lineHeight: '1.5', fontWeight: '500' }}>{signal.voices.keyTakeaway}</p>
            </div>

            {/* External Commentary */}
            {voicesEnabled && (
              <div>
                <div style={{ color: '#aaa', fontSize: '0.75rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', letterSpacing: '0.05em' }}>
                  <span style={{ fontSize: '1rem' }}>💬</span> EXTERNAL COMMENTARY
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {signal.voices.externalCommentary.length > 0 ? signal.voices.externalCommentary.map((post, idx) => (
                    <div key={idx} style={{ 
                      borderLeft: '2px solid rgba(255,255,255,0.08)', 
                      paddingLeft: '1rem', 
                      paddingBottom: '0.5rem',
                      background: 'rgba(255,255,255,0.01)',
                      padding: '0.75rem 1rem',
                      borderRadius: '0 8px 8px 0'
                    }}>
                      <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.3rem' }}>{post.author}</div>
                      <p style={{ color: '#aaa', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '0.6rem', fontStyle: 'italic' }}>"{post.excerpt}"</p>
                      <a 
                        href={post.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          color: '#4dabf7', 
                          fontSize: '0.75rem', 
                          textDecoration: 'none', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.3rem',
                          fontWeight: '600'
                        }}
                      >
                        Read more <span style={{ fontSize: '0.7rem' }}>↗</span>
                      </a>
                    </div>
                  )) : (
                    <div style={{ fontSize: '0.8rem', color: '#555', padding: '1rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      No external commentary found for this signal.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalCard;
