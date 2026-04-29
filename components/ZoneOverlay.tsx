import React from 'react';

interface ZoneHeatmap {
  betPercent: number;
  pullPercent: number;
  totalVoters: number;
}

interface ZoneOverlayProps {
  zone: string;
  heatmap: Record<string, ZoneHeatmap>;
  mySuggestions: Record<string, 'bet' | 'pull'>;
  isRolling: boolean;
}

export const ZoneOverlay = ({ 
  zone, 
  heatmap, 
  mySuggestions,
  isRolling 
}: ZoneOverlayProps) => {
  const data = heatmap[zone];
  const mySignal = mySuggestions[zone];

  if (!data && !mySignal) return null;

  return (
    <div 
      className="zone-overlay"
      style={{ 
        opacity: isRolling ? 0 : 1,
        transition: 'opacity 0.3s ease',
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none'
      }}
    >
      {/* Green bet background */}
      {data?.betPercent > 0 && (
        <div
          className="bet-background"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(34, 197, 94, ${Math.max(0.15, data.betPercent / 100 * 0.45)})`,
            borderRadius: 'inherit',
            border: '2px solid rgba(34, 197, 94, 0.7)',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Red pull background */}
      {data?.pullPercent > 0 && (
        <div
          className="pull-background"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(239, 68, 68, ${Math.max(0.15, data.pullPercent / 100 * 0.45)})`,
            borderRadius: 'inherit',
            border: '2px solid rgba(239, 68, 68, 0.7)',
            animation: 'pulse 1.5s infinite',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Percentage labels */}
      <div
        style={{
          position: 'absolute',
          bottom: '2px',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1px',
          pointerEvents: 'none'
        }}
      >
        {data?.betPercent > 0 && (
          <span style={{
            fontSize: '9px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: 'rgba(34, 197, 94, 0.85)',
            padding: '1px 4px',
            borderRadius: '3px',
            lineHeight: 1.2
          }}>
            🟢 {data.betPercent}%
          </span>
        )}
        {data?.pullPercent > 0 && (
          <span style={{
            fontSize: '9px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            padding: '1px 4px',
            borderRadius: '3px',
            lineHeight: 1.2
          }}>
            🔴 {data.pullPercent}%
          </span>
        )}
      </div>

      {/* My selection indicator */}
      {mySignal && (
        <div style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          fontSize: '10px',
          backgroundColor: mySignal === 'bet' 
            ? 'rgba(34, 197, 94, 0.9)' 
            : 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          padding: '1px 3px',
          borderRadius: '3px',
          pointerEvents: 'none'
        }}>
          {mySignal === 'bet' ? '👆' : '👇'} You
        </div>
      )}
    </div>
  );
};
