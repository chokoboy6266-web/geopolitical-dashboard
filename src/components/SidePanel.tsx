import React, { useState } from "react";
import type { Signal } from "../services/aiService";
import SignalCard from "./SignalCard";

interface SidePanelProps {
  signals: Signal[];
  loading: boolean;
  selectedIsoCode: string | null;
  voicesEnabled: boolean;
  onToggleVoices: () => void;
  onClearSelection: () => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const SidePanel: React.FC<SidePanelProps> = ({
  signals,
  loading,
  selectedIsoCode,
  voicesEnabled,
  onToggleVoices,
  onClearSelection,
  selectedCategory,
  onSelectCategory
}) => {
  const [showTopOnly, setShowTopOnly] = useState(false);

  const categoriesList = [
    { id: 'all', label: 'All', emoji: '🌐', color: '#4dabf7' },
    { id: 'security', label: 'Security', emoji: '🛡️', color: '#f03e3e' },
    { id: 'energy', label: 'Energy', emoji: '⚡', color: '#fab005' },
    { id: 'technology', label: 'Tech', emoji: '💻', color: '#15aabf' },
    { id: 'diplomacy', label: 'Diplomacy', emoji: '🕊️', color: '#40c057' }
  ];

  // Filter by selected region OR specific signal ID
  let filteredSignals = selectedIsoCode 
    ? signals.filter(s => s.id === selectedIsoCode || s.context.isoAlpha3.includes(selectedIsoCode))
    : signals;

  // Mode: Top 7 Signals (Highest Risk + Confidence)
  if (showTopOnly) {
    filteredSignals = [...signals]
      .sort((a, b) => (b.riskScore + b.intelligence.confidenceScore) - (a.riskScore + a.intelligence.confidenceScore))
      .slice(0, 7);
  }

  // Clustering Check
  const regionCounts = signals.reduce((acc, s) => {
    acc[s.context.region] = (acc[s.context.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hotspots = Object.entries(regionCounts)
    .filter(([_, count]) => count > 1)
    .map(([region, _]) => region);

  return (
    <div className="side-panel" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', background: 'rgba(255, 255, 255, 0.01)', height: '100%', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Global Intelligence</h2>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem', borderRadius: '8px' }}>
            <button 
              onClick={() => setShowTopOnly(false)}
              style={{ padding: '0.4rem 0.8rem', border: 'none', background: !showTopOnly ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#fff', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              All
            </button>
            <button 
              onClick={() => setShowTopOnly(true)}
              style={{ padding: '0.4rem 0.8rem', border: 'none', background: showTopOnly ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#fff', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Top 7
            </button>
          </div>
        </div>

        {/* Voices Layer Toggle */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '1rem', 
          background: voicesEnabled ? 'rgba(77, 171, 247, 0.05)' : 'rgba(255,255,255,0.01)', 
          borderRadius: '12px', 
          marginBottom: '1.5rem',
          border: voicesEnabled ? '1px solid rgba(77, 171, 247, 0.2)' : '1px solid rgba(255,255,255,0.03)',
          boxShadow: voicesEnabled ? '0 0 20px -5px rgba(77, 171, 247, 0.2)' : 'none',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.1rem', filter: voicesEnabled ? 'none' : 'grayscale(1) opacity(0.5)' }}>🌐</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: voicesEnabled ? '#4dabf7' : '#555', letterSpacing: '0.02em' }}>Voices Layer</span>
            </div>
            <span style={{ fontSize: '0.65rem', color: '#555', marginLeft: '1.7rem' }}>External Perspective Engine</span>
          </div>
          <button 
            onClick={onToggleVoices}
            style={{ 
              background: voicesEnabled ? '#4dabf7' : 'rgba(255,255,255,0.05)', 
              color: voicesEnabled ? '#000' : '#888', 
              border: 'none', 
              padding: '0.4rem 0.8rem', 
              borderRadius: '20px', 
              fontSize: '0.7rem', 
              fontWeight: '800', 
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              letterSpacing: '0.05em',
              boxShadow: voicesEnabled ? '0 2px 10px rgba(77, 171, 247, 0.4)' : 'none'
            }}
          >
            {voicesEnabled ? "ACTIVE" : "OFF"}
          </button>
        </div>

        {/* Category Filters */}
        <div 
          className="category-filters" 
          style={{ 
            display: 'flex', 
            overflowX: 'auto', 
            gap: '0.4rem', 
            marginBottom: '1rem',
            paddingBottom: '0.4rem',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {categoriesList.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '20px',
                  border: isSelected ? `1px solid ${cat.color}` : '1px solid rgba(255,255,255,0.06)',
                  background: isSelected ? `${cat.color}15` : 'rgba(255,255,255,0.02)',
                  color: isSelected ? cat.color : '#888',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Clustering Alert - Styled as info, not error */}
        {!selectedIsoCode && !showTopOnly && hotspots.length > 0 && (
          <div style={{ background: 'rgba(77, 171, 247, 0.1)', border: '1px solid rgba(77, 171, 247, 0.2)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4dabf7', fontSize: '0.8rem', fontWeight: '600' }}>
              <span style={{ fontSize: '1rem' }}>ℹ️</span>
              Multiple signals detected in {hotspots.join(", ")}
            </div>
          </div>
        )}

        {selectedIsoCode && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Targeted Intel Focus</span>
            <button onClick={onClearSelection} style={{ background: 'transparent', border: 'none', color: '#4dabf7', cursor: 'pointer', fontSize: '0.8rem' }}>Clear</button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>Fetching live intelligence feed...</div>
        ) : filteredSignals.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>No active signals in this region.</div>
        ) : (
          filteredSignals.map(signal => (
            <SignalCard key={signal.id} signal={signal} voicesEnabled={voicesEnabled} />
          ))
        )}
      </div>
    </div>
  );
};

export default SidePanel;
