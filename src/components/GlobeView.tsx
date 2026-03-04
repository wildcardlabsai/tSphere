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
      .arcColor('color')
      .arcDashLength(0.4)
      .arcDashGap(1)
      .arcDashInitialGap(() => Math.random() * 5)
      .arcDashAnimateTime(1500)
      .arcsData(paths)
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
        
        // Strike Marker
        if (d.type === 'strike' || d.event_type) {
          const icon = '💥';
          el.innerHTML = `
            <div class="flex flex-col items-center group" style="transform: translate(-50%, -50%)">
              <div class="text-4xl filter drop-shadow-[0_0_20px_rgba(239,68,68,1)] animate-ping absolute opacity-50">💥</div>
              <div class="text-3xl filter drop-shadow-[0_0_15px_rgba(239,68,68,0.9)] animate-bounce relative z-10">${icon}</div>
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
          const isMilitary = d.baro_altitude > 12000 || d.callsign.startsWith('RCH') || d.callsign.startsWith('DUKE');
          const color = isMilitary ? '#f87171' : '#22d3ee';
          el.innerHTML = `
            <div class="group relative" style="transform: translate(-50%, -50%)">
              <div class="w-2 h-2 rounded-full animate-pulse" style="background: ${color}; box-shadow: 0 0 10px ${color}"></div>
              <div class="hidden group-hover:block absolute top-full mt-1 bg-slate-950/90 border border-cyan-500/50 px-2 py-1 rounded text-[9px] font-mono text-white whitespace-nowrap z-[100]">
                <span class="text-cyan-400 font-bold">${d.callsign}</span> [${d.origin_country}]<br/>
                ALT: ${Math.round(d.baro_altitude || 0)}m | SPD: ${Math.round(d.velocity || 0)}km/h
              </div>
            </div>
          `;
          return el;
        }

        // Ship Marker
        if (d.mmsi) {
          el.innerHTML = `
            <div class="group relative" style="transform: translate(-50%, -50%)">
              <div class="text-xl filter drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">🚢</div>
              <div class="hidden group-hover:block absolute top-full mt-1 bg-slate-950/90 border border-orange-500/50 px-2 py-1 rounded text-[9px] font-mono text-white whitespace-nowrap z-[100]">
                <span class="text-orange-400 font-bold">${d.name}</span><br/>
                SOG: ${d.speed}kn | HDG: ${d.heading}°
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
