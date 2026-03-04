import React, { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';

interface Asset {
  id: string;
  lat: number;
  lng: number;
  alt: number;
  type: 'air' | 'sea';
  color: string;
  label: string;
}

interface Path {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  dashLength?: number;
  altitude?: number;
}

interface CountryBar {
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
}

interface RestrictedZone {
  type: 'Feature';
  properties: {
    id: string;
    label: string;
    color: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

interface IncidentMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'strike' | 'blockade' | 'clash';
  label: string;
}

interface GlobeViewProps {
  assets: Asset[];
  paths: Path[];
  bars: CountryBar[];
  zones: RestrictedZone[];
  markers: IncidentMarker[];
  labels?: any[];
  isRotating?: boolean;
  onMarkerClick?: (marker: IncidentMarker) => void;
  flights: any[];
  ships: any[];
  viewMode: 'all' | 'air' | 'marine' | 'strikes';
}

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};

const GlobeView: React.FC<GlobeViewProps> = ({ 
  assets, 
  paths, 
  bars, 
  zones = [], 
  markers, 
  labels = [], 
  isRotating = false,
  onMarkerClick,
  flights = [],
  ships = [],
  viewMode
}) => {
  const globeRef = useRef<HTMLDivElement>(null);
  const globeInstance = useRef<any>(null);

  useEffect(() => {
    if (!globeRef.current) return;

    // Initialize Globe
    const world = new Globe(globeRef.current)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .showAtmosphere(true)
      .atmosphereColor('#06b6d4')
      .atmosphereAltitude(0.15)
      // Points (Assets)
      .pointColor('color')
      .pointAltitude('alt')
      .pointRadius(d => (d as any).type === 'sea' ? 0.4 : 0.2)
      .pointLabel(d => (d as any).label)
      .pointsData(assets)
      // Arcs (Paths)
      .arcsData(paths)
      .arcColor((d: any) => {
        const color = d.color || '#22d3ee';
        const altitude = d.altitude || 0.2;
        // Adjust opacity based on altitude (higher altitude = more transparent/ethereal)
        const opacity = Math.max(0.1, 0.8 - (altitude * 1.5));
        return [
          `rgba(${hexToRgb(color)}, ${opacity})`,
          `rgba(${hexToRgb(color)}, ${opacity * 0.2})`
        ];
      })
      .arcAltitude((d: any) => d.altitude || 0.2)
      .arcStroke(0.2) // Thinner trails
      .arcDashLength(0.4)
      .arcDashGap(1)
      .arcDashInitialGap(() => Math.random() * 5)
      .arcDashAnimateTime(1500)
      // Bars (Hotspots)
      .hexBinPointsData(bars)
      .hexBinPointWeight('size')
      .hexBinResolution(4)
      .hexTopColor((d: any) => d.points[0].color)
      .hexSideColor((d: any) => d.points[0].color)
      .hexBinMerge(true)
      // Polygons (Restricted Zones)
      .polygonsData(zones)
      .polygonCapColor(d => (d as any).properties?.color || 'rgba(239, 68, 68, 0.2)')
      .polygonSideColor(() => 'rgba(239, 68, 68, 0.1)')
      .polygonStrokeColor(() => '#ef4444')
      .polygonLabel(d => (d as any).properties?.label || 'Restricted Zone')
      // Labels (Country Names)
      .labelsData(labels)
      .labelLat(d => (d as any).lat)
      .labelLng(d => (d as any).lng)
      .labelText(d => (d as any).name)
      .labelSize(d => (d as any).size || 0.6)
      .labelDotRadius(d => (d as any).dotRadius || 0.3)
      .labelColor(() => 'rgba(255, 255, 255, 0.9)')
      .labelResolution(2)
      .htmlElementsData([...markers, ...flights, ...ships])
      .htmlLat(d => (d as any).lat || (d as any).latitude)
      .htmlLng(d => (d as any).lng || (d as any).longitude)
      .htmlElement((d: any) => {
        const el = document.createElement('div');
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
        el.style.width = '0px';
        el.style.height = '0px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        
        // Strike Marker
        if (d.type === 'strike' || d.event_type) {
          el.innerHTML = `
            <div class="relative group flex items-center justify-center" style="transform: translate(-50%, -50%)">
              <div class="absolute w-12 h-12 bg-red-600/20 rounded-full animate-ping"></div>
              <div class="absolute w-8 h-8 bg-red-600/40 rounded-full animate-pulse"></div>
              <svg viewBox="0 0 24 24" class="w-8 h-8 text-red-500 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" fill="currentColor">
                <path d="M13,10H18L12,16L6,10H11V3H13V10M4,19H20V21H4V19Z" />
              </svg>
              <div class="hidden group-hover:block absolute top-full mt-2 bg-slate-950/95 border border-red-500 px-3 py-1.5 rounded text-[11px] font-mono text-white whitespace-nowrap z-[999] shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                <div class="font-bold text-red-500 mb-0.5 uppercase tracking-widest">STRIKE DETECTED</div>
                ${d.label || d.location}
                <div class="text-[9px] text-slate-400 mt-1 uppercase tracking-tighter italic">Click for Intelligence Report</div>
              </div>
            </div>
          `;
          el.onclick = (e) => {
            e.stopPropagation();
            onMarkerClick?.(d);
          };
          return el;
        }

        // Flight Marker
        if (d.icao24 || d.callsign) {
          const isMilitary = d.baro_altitude > 12000 || d.callsign.startsWith('RCH') || d.callsign.startsWith('DUKE') || d.callsign.startsWith('FORTE');
          const color = isMilitary ? '#f87171' : '#22d3ee';
          const rotation = (d.true_track || 0) - 45; // Adjust for SVG orientation
          const scale = isMilitary ? 1.2 : 1.0;
          
          el.innerHTML = `
            <div class="group relative flex items-center justify-center" style="transform: translate(-50%, -50%)">
              <svg viewBox="0 0 24 24" class="transition-transform duration-500" style="width: ${20 * scale}px; height: ${20 * scale}px; color: ${color}; filter: drop-shadow(0 0 4px ${color}); transform: rotate(${rotation}deg)" fill="currentColor">
                ${isMilitary 
                  ? '<path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />' // Fighter/Military
                  : '<path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />' // Standard (using same for now but could differentiate)
                }
              </svg>
              <div class="hidden group-hover:block absolute top-full mt-1 bg-slate-950/90 border border-cyan-500/50 px-2 py-1 rounded text-[9px] font-mono text-white whitespace-nowrap z-[100] shadow-xl">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-cyan-400 font-bold">${d.callsign}</span>
                  ${isMilitary ? '<span class="bg-red-500/20 text-red-400 px-1 rounded border border-red-500/30 text-[7px]">MILITARY</span>' : ''}
                </div>
                <div class="text-slate-400">REG: ${d.icao24} | ${d.origin_country}</div>
                <div class="mt-1 border-t border-white/10 pt-1">
                  ALT: ${Math.round(d.baro_altitude || 0)}m<br/>
                  SPD: ${Math.round(d.velocity || 0)}km/h
                </div>
              </div>
            </div>
          `;
          return el;
        }

        // Ship Marker
        if (d.mmsi || d.type === 'sea') {
          const rotation = (d.heading || 0);
          const shipType = d.type_label || d.type || 'cargo';
          const isMilitary = shipType === 'military' || d.color === '#ef4444';
          const color = isMilitary ? '#ef4444' : (shipType === 'tanker' ? '#f97316' : '#06b6d4');
          
          let shipIcon = '';
          if (isMilitary) {
            // Sleek Warship
            shipIcon = '<path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" />';
          } else if (shipType === 'tanker') {
            // Long Tanker
            shipIcon = '<path d="M20,21V19L17,17V11H15V17L12,19V21H20M10,21V19L7,17V11H5V17L2,19V21H10M12,2V4H10V2H12M13,4V7H11V4H13M14,7V10H12V7H14M15,10V13H13V10H15M16,13V16H14V13H16Z" />';
          } else {
            // Cargo/Generic
            shipIcon = '<path d="M20,21V19L17,17V11H15V17L12,19V21H20M10,21V19L7,17V11H5V17L2,19V21H10M12,2V4H10V2H12M13,4V7H11V4H13M14,7V10H12V7H14M15,10V13H13V10H15M16,13V16H14V13H16Z" />';
          }

          el.innerHTML = `
            <div class="group relative flex items-center justify-center" style="transform: translate(-50%, -50%)">
              <svg viewBox="0 0 24 24" class="w-6 h-6" style="color: ${color}; filter: drop-shadow(0 0 4px ${color}); transform: rotate(${rotation}deg)" fill="currentColor">
                ${shipIcon}
              </svg>
              <div class="hidden group-hover:block absolute top-full mt-1 bg-slate-950/90 border border-orange-500/50 px-2 py-1 rounded text-[9px] font-mono text-white whitespace-nowrap z-[100] shadow-xl">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-orange-400 font-bold">${d.name || d.label || 'UNKNOWN VESSEL'}</span>
                  <span class="bg-white/10 px-1 rounded text-[7px] uppercase">${shipType}</span>
                </div>
                <div class="text-slate-400">MMSI: ${d.mmsi || 'N/A'}</div>
                <div class="mt-1 border-t border-white/10 pt-1">
                  SOG: ${d.speed || 0}kn | HDG: ${d.heading || 0}°
                </div>
              </div>
            </div>
          `;
          return el;
        }

        // Default Marker
        const icon = d.type === 'blockade' ? '⚓' : '⚔️';
        el.innerHTML = `
          <div class="flex flex-col items-center group" style="transform: translate(-50%, -50%)">
            <div class="text-2xl filter drop-shadow-[0_0_10px_rgba(6,182,212,0.9)] animate-pulse">${icon}</div>
          </div>
        `;
        return el;
      })
      .onPointClick((point: any) => {
        world.pointAltitude(0.5);
        setTimeout(() => world.pointAltitude(point.alt), 2000);
      });

    // Custom controls
    const controls = world.controls();
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 0.5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 120;
    controls.maxDistance = 800;

    globeInstance.current = world;

    // Initial camera position: Middle East
    world.pointOfView({ lat: 30, lng: 45, altitude: 2.5 }, 2000);

    // Use ResizeObserver for reliable container-based sizing
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          world.width(width);
          world.height(height);
        }
      }
    });

    if (globeRef.current) {
      resizeObserver.observe(globeRef.current);
    }

    // Initial size set with a small delay to ensure container is rendered
    const initialTimeout = setTimeout(() => {
      if (globeRef.current) {
        world.width(globeRef.current.clientWidth);
        world.height(globeRef.current.clientHeight);
      }
    }, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(initialTimeout);
      if (globeRef.current) {
        globeRef.current.innerHTML = '';
      }
    };
  }, []);

  useEffect(() => {
    if (globeInstance.current) {
      // Filter data based on viewMode
      const filteredMarkers = viewMode === 'all' || viewMode === 'strikes' ? markers : [];
      const filteredFlights = viewMode === 'all' || viewMode === 'air' ? flights : [];
      const filteredShips = viewMode === 'all' || viewMode === 'marine' ? ships : [];
      
      globeInstance.current.pointsData(assets);
      globeInstance.current.arcsData(paths);
      globeInstance.current.hexBinPointsData(bars);
      globeInstance.current.polygonsData(zones);
      globeInstance.current.labelsData(labels);
      globeInstance.current.htmlElementsData([...filteredMarkers, ...filteredFlights, ...filteredShips]);
      globeInstance.current.controls().autoRotate = isRotating;
    }
  }, [assets, paths, bars, zones, markers, labels, isRotating, flights, ships, viewMode]);

  return (
    <div ref={globeRef} className="w-full h-full relative z-0" />
  );
};

export default GlobeView;
