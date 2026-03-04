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
  id: string;
  coords: [number, number][][];
  color: string;
  label: string;
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
}

const GlobeView: React.FC<GlobeViewProps> = ({ 
  assets, 
  paths, 
  bars, 
  zones, 
  markers, 
  labels = [], 
  isRotating = false,
  onMarkerClick
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
      .pointRadius(0.3) // Slightly larger for mobile
      .pointsData(assets)
      // Arcs (Paths)
      .arcColor('color')
      .arcDashLength(0.6)
      .arcDashGap(1)
      .arcDashInitialGap(() => Math.random() * 5)
      .arcDashAnimateTime(2000)
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
      .polygonCapColor(d => (d as any).color)
      .polygonSideColor(() => 'rgba(6, 182, 212, 0.15)')
      .polygonStrokeColor(() => '#06b6d4')
      .polygonLabel(d => (d as any).label)
      // Labels (Country Names)
      .labelsData(labels)
      .labelLat(d => (d as any).lat)
      .labelLng(d => (d as any).lng)
      .labelText(d => (d as any).name)
      .labelSize(d => (d as any).size || 0.6)
      .labelDotRadius(d => (d as any).dotRadius || 0.3)
      .labelColor(() => 'rgba(255, 255, 255, 0.9)')
      .labelResolution(2)
      // HTML Markers (Incident Icons)
      .htmlLat(d => (d as any).lat)
      .htmlLng(d => (d as any).lng)
      .htmlElement((d: any) => {
        const el = document.createElement('div');
        const icon = d.type === 'strike' ? '💥' : d.type === 'blockade' ? '⚓' : '⚔️';
        el.innerHTML = `
          <div class="flex flex-col items-center group cursor-pointer touch-none">
            <div class="text-2xl md:text-xl filter drop-shadow-[0_0_10px_rgba(6,182,212,0.9)] animate-pulse hover:scale-125 transition-transform">${icon}</div>
            <div class="hidden md:group-hover:block absolute top-full mt-1 bg-slate-950/90 border border-cyan-500 px-2 py-1 rounded text-[10px] font-mono text-white whitespace-nowrap z-[100] shadow-[0_0_15px_rgba(6,182,212,0.5)] pointer-events-none">
              ${d.label}
              <div class="text-[8px] text-cyan-400 mt-0.5 uppercase tracking-tighter">Analytical Report Available</div>
            </div>
          </div>
        `;
        el.style.pointerEvents = 'auto';
        el.onclick = (e) => {
          e.stopPropagation();
          onMarkerClick?.(d);
        };
        return el;
      })
      .htmlElementsData(markers)
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
      globeInstance.current.pointsData(assets);
      globeInstance.current.arcsData(paths);
      globeInstance.current.hexBinPointsData(bars);
      globeInstance.current.polygonsData(zones);
      globeInstance.current.labelsData(labels);
      globeInstance.current.htmlElementsData(markers);
      globeInstance.current.controls().autoRotate = isRotating;
    }
  }, [assets, paths, bars, zones, markers, labels, isRotating]);

  return (
    <div ref={globeRef} className="w-full h-full relative z-0" />
  );
};

export default GlobeView;
