import React, { useEffect, useState, useRef } from 'react';
import { fetchProcessedSignals } from '../services/aiService';
import type { Signal } from '../services/aiService';
import SidePanel from './SidePanel';
import Globe from 'react-globe.gl';

const Dashboard: React.FC = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [voicesEnabled, setVoicesEnabled] = useState<boolean>(true);
  const globeRef = useRef<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchProcessedSignals();
        setSignals(data);
      } catch (error) {
        console.error("Failed to fetch signals:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Natural Earth Data
  const pointsData = signals.map(s => ({
    lat: s.context.coordinates.lat,
    lng: s.context.coordinates.lng,
    size: 0.8,
    color: '#ff2d2d',
    label: `<b>${s.summary}</b><br/>Risk Level: ${s.riskScore}`,
    id: s.id
  }));

  const handlePointClick = (point: any) => {
    setSelectedSignalId(point.id);
    // Deep Zoom to the region (altitude 0.5 is very close)
    if (globeRef.current) {
      globeRef.current.pointOfView({ 
        lat: point.lat, 
        lng: point.lng, 
        altitude: 0.6 
      }, 1500);
    }
  };

  return (
    <div className="dashboard-layout" style={{ display: 'flex', width: '100%', height: '100vh', backgroundColor: '#000', color: 'white', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'grab' }}>
        <header style={{ 
          position: 'absolute', 
          top: '2rem', 
          left: '2rem', 
          zIndex: 10, 
          pointerEvents: 'none',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#fff' }}>Geopolitical Dashboard</h1>
          <p style={{ color: '#eee', fontSize: '0.9rem' }}>Global Intelligence • Visual Context</p>
        </header>

        {loading ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Rendering Natural Globe...
          </div>
        ) : (
          <Globe
            ref={globeRef}
            // Natural Day Texture
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            
            // Interaction
            pointsData={pointsData}
            pointColor="color"
            pointAltitude={0.05}
            pointRadius={1.2}
            pointsMerge={false}
            onPointClick={handlePointClick}
            pointLabel="label"
            
            // Atmosphere & Lighting
            atmosphereColor="#8ec6ff"
            atmosphereAltitude={0.15}
          />
        )}
      </div>

      <SidePanel 
        signals={signals} 
        selectedIsoCode={selectedSignalId} 
        voicesEnabled={voicesEnabled}
        onToggleVoices={() => setVoicesEnabled(!voicesEnabled)}
        onClearSelection={() => {
          setSelectedSignalId(null);
          // Zoom out back to world view
          if (globeRef.current) {
            globeRef.current.pointOfView({ altitude: 2.5 }, 1000);
          }
        }}
      />
    </div>
  );
};

export default Dashboard;
