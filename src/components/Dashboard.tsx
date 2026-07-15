import React, { useEffect, useState, useRef } from 'react';
import { fetchProcessedSignals } from '../services/aiService';
import type { Signal } from '../services/aiService';
import SidePanel from './SidePanel';
import Globe from 'react-globe.gl';
import ArticlesView from './ArticlesView';

const CATEGORY_COLORS: Record<string, string> = {
  security: '#f03e3e',
  energy: '#fab005',
  technology: '#15aabf',
  diplomacy: '#40c057'
};

const Dashboard: React.FC = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [voicesEnabled, setVoicesEnabled] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const globeRef = useRef<any>(null);

  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<'globe' | 'news' | 'articles'>('globe');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && activeTab === 'news') setActiveTab('globe'); // Reset tab on desktop
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  useEffect(() => {
    // Read query parameters on load
    const params = new URLSearchParams(window.location.search);
    const articleParam = params.get('article');
    const tabParam = params.get('tab');

    if (articleParam) {
      setSelectedArticleId(articleParam);
      setActiveTab('articles');
    } else if (tabParam === 'articles') {
      setActiveTab('articles');
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchProcessedSignals();
      setSignals(data);
    } catch (error) {
      console.error("Failed to fetch signals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Center the globe on the news itself once it loads, instead of the default Atlantic-facing view.
    if (!loading && signals.length > 0 && globeRef.current) {
      globeRef.current.pointOfView({
        lat: signals[0].context.coordinates.lat,
        lng: signals[0].context.coordinates.lng,
        altitude: 1.8
      }, 1000);
    }
  }, [loading]);

  const handleSelectArticle = (id: string | null) => {
    setSelectedArticleId(id);
    if (id) {
      window.history.pushState({}, '', `?article=${id}`);
    } else {
      window.history.pushState({}, '', `?tab=articles`);
    }
  };

  const handleTabChange = (tab: 'globe' | 'articles') => {
    setActiveTab(tab);
    if (tab === 'articles') {
      window.history.pushState({}, '', `?tab=articles` + (selectedArticleId ? `&article=${selectedArticleId}` : ''));
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  // Filter signals based on selected threat category
  const filteredSignals = signals.filter(s => {
    if (selectedCategory === 'all') return true;
    return s.category === selectedCategory;
  });

  // Dynamic Point Markers for the Globe
  const pointsData = filteredSignals.map(s => {
    const isSelected = s.id === selectedSignalId;
    return {
      lat: s.context.coordinates.lat,
      lng: s.context.coordinates.lng,
      size: isSelected ? 1.5 : 0.8,
      color: CATEGORY_COLORS[s.category] || '#f03e3e',
      label: `<b>${s.summary}</b><br/>Risk Level: ${s.riskScore}<br/>Category: <span style="color: ${CATEGORY_COLORS[s.category]}">${s.category.toUpperCase()}</span>`,
      id: s.id
    };
  });

  // Dynamic animated strategic arcs connecting countries
  const arcsData = filteredSignals.flatMap(s => {
    const isSelected = s.id === selectedSignalId;
    return (s.connections || []).map(conn => {
      const color = isSelected
        ? [CATEGORY_COLORS[s.category], '#ffffff']
        : [`${CATEGORY_COLORS[s.category]}40`, `${CATEGORY_COLORS[s.category]}10`];
      return {
        startLat: s.context.coordinates.lat,
        startLng: s.context.coordinates.lng,
        endLat: conn.targetCoords.lat,
        endLng: conn.targetCoords.lng,
        color: color,
        altitude: isSelected ? 0.35 : 0.22,
        stroke: isSelected ? 1.0 : 0.35,
        dashLength: isSelected ? 0.6 : 0.3,
        dashGap: isSelected ? 0.15 : 0.4,
        dashAnimateTime: isSelected ? 1500 : 4000
      };
    });
  });

  const handlePointClick = (point: any) => {
    setSelectedSignalId(point.id);
    if (isMobile) setActiveTab('news'); // Auto-switch to news on mobile when point is clicked
    
    // Deep Zoom to the region
    if (globeRef.current) {
      globeRef.current.pointOfView({ 
        lat: point.lat, 
        lng: point.lng, 
        altitude: 0.6 
      }, 1500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000' }}>
      
      {/* Top Global Navigation Bar */}
      <header style={{
        height: '60px',
        backgroundColor: '#0a0a0a',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 1rem' : '0 2rem',
        boxSizing: 'border-box',
        zIndex: 100,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.8rem' : '1.5rem' }}>
          <h1 style={{ fontSize: isMobile ? '1.05rem' : '1.25rem', fontWeight: '900', letterSpacing: '-0.02em', margin: 0, color: '#fff' }}>
            GEOPOLITICAL DASHBOARD
          </h1>
          
          {/* Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '0.3rem' }}>
            <button 
              onClick={() => handleTabChange('globe')}
              style={{
                background: activeTab !== 'articles' ? 'rgba(77, 171, 247, 0.1)' : 'transparent',
                border: activeTab !== 'articles' ? '1px solid rgba(77, 171, 247, 0.3)' : '1px solid transparent',
                color: activeTab !== 'articles' ? '#4dabf7' : '#aaa',
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
            >
              🌐 Globe
            </button>
            <button 
              onClick={() => handleTabChange('articles')}
              style={{
                background: activeTab === 'articles' ? 'rgba(77, 171, 247, 0.1)' : 'transparent',
                border: activeTab === 'articles' ? '1px solid rgba(77, 171, 247, 0.3)' : '1px solid transparent',
                color: activeTab === 'articles' ? '#4dabf7' : '#aaa',
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
            >
              📚 Library
            </button>
          </nav>
        </div>

        {/* Global Action Header Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {!isMobile && (
            <button 
              onClick={async (e) => {
                const btn = e.currentTarget;
                const originalText = btn.innerText;
                btn.innerText = '📡 Sweeping...';
                btn.disabled = true;
                try {
                  await fetch('/api/poll');
                  btn.innerText = '✅ Alert Sent';
                  setTimeout(() => {
                    btn.innerText = originalText;
                    btn.disabled = false;
                  }, 3000);
                } catch (err) {
                  btn.innerText = '❌ Failed';
                  setTimeout(() => {
                    btn.innerText = originalText;
                    btn.disabled = false;
                  }, 3000);
                }
              }}
              style={{ 
                background: 'rgba(77, 171, 247, 0.1)', 
                border: '1px solid rgba(77, 171, 247, 0.2)', 
                color: '#4dabf7', 
                fontSize: '0.7rem', 
                padding: '0.35rem 0.7rem', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
            >
              📡 Manual Intel Sweep
            </button>
          )}
          <a 
            href="https://t.me/IndiaWorldIntel" 
            target="_blank"
            rel="noreferrer"
            style={{ 
              background: '#0088cc', 
              color: 'white', 
              fontSize: '0.7rem', 
              padding: '0.35rem 0.7rem', 
              borderRadius: '6px', 
              textDecoration: 'none',
              fontWeight: 'bold',
              boxShadow: '0 0 10px rgba(0, 136, 204, 0.3)'
            }}
          >
            🚀 Join Feed
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1,
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        width: '100%', 
        overflow: 'hidden' 
      }}>
        {activeTab === 'articles' ? (
          <ArticlesView selectedArticleId={selectedArticleId} onSelectArticle={handleSelectArticle} />
        ) : (
          <>
            {/* Globe Container */}
            <div style={{ 
              flex: 1, 
              position: 'relative', 
              overflow: 'hidden', 
              display: isMobile && activeTab !== 'globe' ? 'none' : 'block' 
            }}>
              <div style={{ 
                position: 'absolute', 
                top: '1rem', 
                left: '1rem', 
                zIndex: 10, 
                pointerEvents: 'none',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                backdropFilter: 'blur(5px)'
              }}>
                <span style={{ color: '#4dabf7', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '0.05em' }}>📡 GLOBE FEED ACTIVE</span>
              </div>

              {loading ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="loading-spinner">Initializing Globe...</div>
                </div>
              ) : (
                <Globe
                  ref={globeRef}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                  bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                  backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                  
                  pointsData={pointsData}
                  pointColor="color"
                  pointAltitude={0.05}
                  pointRadius={0.5}
                  pointsMerge={false}
                  onPointClick={handlePointClick}
                  pointLabel="label"
                  
                  arcsData={arcsData}
                  arcStartLat="startLat"
                  arcStartLng="startLng"
                  arcEndLat="endLat"
                  arcEndLng="endLng"
                  arcColor="color"
                  arcAltitude="altitude"
                  arcStroke="stroke"
                  arcDashLength="dashLength"
                  arcDashGap="dashGap"
                  arcDashAnimateTime="dashAnimateTime"

                  atmosphereColor="#8ec6ff"
                  atmosphereAltitude={0.15}
                  width={isMobile ? window.innerWidth : undefined}
                  height={isMobile ? window.innerHeight : undefined}
                />
              )}
            </div>

            {/* Side Panel */}
            <div style={{ 
              display: !isMobile || activeTab === 'news' ? 'flex' : 'none',
              width: isMobile ? '100%' : 'auto',
              height: isMobile ? '100%' : '100%',
              flexShrink: 0
            }}>
              <SidePanel
                signals={filteredSignals}
                loading={loading}
                selectedIsoCode={selectedSignalId}
                voicesEnabled={voicesEnabled}
                onToggleVoices={() => setVoicesEnabled(!voicesEnabled)}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onClearSelection={() => {
                  setSelectedSignalId(null);
                  if (globeRef.current) {
                    globeRef.current.pointOfView({ altitude: 2.5 }, 1000);
                  }
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Mobile Tab Switcher */}
      {isMobile && (
        <div style={{ 
          position: 'fixed', 
          bottom: '1.5rem', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 1000,
          display: 'flex',
          gap: '0.5rem',
          background: 'rgba(0,0,0,0.85)',
          padding: '0.4rem 0.6rem',
          borderRadius: '40px',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(15px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <button 
            onClick={() => {
              setActiveTab('globe');
              window.history.pushState({}, '', '/');
            }}
            style={{ 
              padding: '0.4rem 0.9rem', 
              borderRadius: '20px', 
              border: 'none', 
              background: activeTab === 'globe' ? '#4dabf7' : 'transparent',
              color: activeTab === 'globe' ? '#000' : '#fff',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🌐 Map
          </button>
          <button 
            onClick={() => {
              setActiveTab('news');
              window.history.pushState({}, '', '/');
            }}
            style={{ 
              padding: '0.4rem 0.9rem', 
              borderRadius: '20px', 
              border: 'none', 
              background: activeTab === 'news' ? '#4dabf7' : 'transparent',
              color: activeTab === 'news' ? '#000' : '#fff',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🗞️ News
          </button>
          <button 
            onClick={() => handleTabChange('articles')}
            style={{ 
              padding: '0.4rem 0.9rem', 
              borderRadius: '20px', 
              border: 'none', 
              background: activeTab === 'articles' ? '#4dabf7' : 'transparent',
              color: activeTab === 'articles' ? '#000' : '#fff',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📚 Library
          </button>
        </div>
      )}

      {/* Floating Telegram Growth Button */}
      {!isMobile && activeTab !== 'articles' && (
        <a 
          href="https://t.me/IndiaWorldIntel" 
          target="_blank"
          rel="noreferrer"
          className="pulse-button"
          style={{ 
            position: 'fixed',
            bottom: '2rem',
            right: '27rem', // Placed just before the sidepanel
            zIndex: 1000,
            background: '#0088cc',
            color: 'white',
            padding: '0.8rem 1.5rem',
            borderRadius: '50px',
            textDecoration: 'none',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            fontSize: '0.9rem'
          }}
        >
          <span>📢</span> Join Official Intel Feed
        </a>
      )}
    </div>
  );
};

export default Dashboard;
