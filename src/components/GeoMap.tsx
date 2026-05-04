import React from "react";

interface GeoMapProps {
  activeIsoCodes: string[];
  onRegionClick: (isoCode: string, name: string) => void;
}

const GeoMap: React.FC<GeoMapProps> = ({ activeIsoCodes, onRegionClick }) => {
  // Ultra-reliable simplified world map paths
  const regions = [
    { id: "NA", name: "North America", d: "M20,30 L70,20 L100,40 L90,80 L40,90 Z", iso: ["USA", "CAN", "MEX", "840"] },
    { id: "SA", name: "South America", d: "M40,90 L70,90 L80,130 L60,140 L35,120 Z", iso: ["BRA", "ARG", "COL"] },
    { id: "AF", name: "Africa", d: "M110,70 L150,60 L170,90 L150,130 L120,130 L110,100 Z", iso: ["EGY", "NGA", "ZAF", "ARE", "784"] },
    { id: "EU", name: "Europe", d: "M110,30 L150,20 L160,50 L130,60 L110,50 Z", iso: ["GBR", "FRA", "DEU", "RUS", "643"] },
    { id: "AS", name: "Asia", d: "M160,20 L260,30 L280,90 L220,110 L160,90 Z", iso: ["CHN", "IND", "JPN", "SAU", "682", "156", "TWN", "158", "PHL", "608"] },
    { id: "OC", name: "Oceania", d: "M240,110 L280,110 L290,140 L250,150 Z", iso: ["AUS", "NZL"] }
  ];

  const handleRegionClick = (region: any) => {
    const activeCode = region.iso.find((code: string) => activeIsoCodes.includes(code));
    onRegionClick(activeCode || region.id, region.name);
  };

  return (
    <div className="geo-map-container" style={{
      width: '100%',
      height: '100%',
      minHeight: '500px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '12px'
    }}>
      <svg viewBox="0 0 300 160" style={{ width: '90%', height: 'auto' }}>
        {regions.map((region) => {
          const isHighlighted = region.iso.some(code => activeIsoCodes.includes(code));

          return (
            <path
              key={region.id}
              d={region.d}
              fill={isHighlighted ? "var(--accent-risk-high)" : "#222"}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.5"
              style={{
                cursor: isHighlighted ? 'pointer' : 'default',
                transition: 'all 0.3s ease'
              }}
              onClick={() => isHighlighted && handleRegionClick(region)}
            />
          );
        })}
      </svg>
    </div>
  );
};

export default GeoMap;
