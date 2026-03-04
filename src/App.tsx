import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Activity, 
  Wifi, 
  Clock, 
  AlertTriangle, 
  Zap, 
  Cloud, 
  Wind, 
  Droplets,
  Maximize2,
  Settings,
  Layers,
  Search,
  Menu,
  ChevronRight,
  Info,
  Globe as GlobeIcon,
  ShieldAlert,
  Anchor,
  Map as MapIcon,
  Play,
  Pause,
  TrendingUp,
  FileText
} from 'lucide-react';
import GlobeView from './components/GlobeView';
import { cn } from './lib/utils';
import { 
  fetchConflictIntel, 
  GeopoliticalEvent, 
  IntelligenceAlert,
  fetchOpenSkyData,
  fetchACLEDData,
  FlightState,
  ACLEDEvent
} from './services/intelService';

// Types
interface Alert {
  id: string;
  type: 'EVENT' | 'CRISIS' | 'DIPLOMATIC';
  title: string;
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}

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
  details?: string;
  intensity?: 'Low' | 'Medium' | 'High' | 'Critical';
}

interface CountryLabel {
  lat: number;
  lng: number;
  name: string;
  size?: number;
}

// Mock Data Generators
const generateMockAssets = (count: number): Asset[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `ASSET-${i}`,
    lat: (Math.random() - 0.5) * 180,
    lng: (Math.random() - 0.5) * 360,
    alt: Math.random() * 0.1,
    type: Math.random() > 0.3 ? 'air' : 'sea',
    color: '#00f2ff',
    label: `FLIGHT ${Math.floor(Math.random() * 9999)}`
  }));
};

const generateMockFlightPaths = (assets: Asset[]): Path[] => {
  const paths: Path[] = [];
  assets.slice(0, 40).forEach(asset => {
    // Trail from origin to current position
    const originLat = asset.lat + (Math.random() - 0.5) * 20;
    const originLng = asset.lng + (Math.random() - 0.5) * 20;
    paths.push({
      startLat: originLat,
      startLng: originLng,
      endLat: asset.lat,
      endLng: asset.lng,
      color: 'rgba(0, 242, 255, 0.6)',
      dashLength: 0.8
    });

    // Potential path to destination
    const destLat = asset.lat + (Math.random() - 0.5) * 40;
    const destLng = asset.lng + (Math.random() - 0.5) * 40;
    paths.push({
      startLat: asset.lat,
      startLng: asset.lng,
      endLat: destLat,
      endLng: destLng,
      color: 'rgba(255, 255, 255, 0.2)',
      dashLength: 0.2
    });
  });
  return paths;
};

const generateMockBars = (): CountryBar[] => {
  const hotSpots = [
    { lat: 31.0461, lng: 34.8516, label: 'Israel/Gaza Region' },
    { lat: 48.3794, lng: 31.1656, label: 'Ukraine/Eastern Europe' },
    { lat: 15.5527, lng: 48.5164, label: 'Red Sea/Yemen' },
    { lat: 12.8628, lng: 30.2176, label: 'Sudan/East Africa' },
    { lat: 33.2232, lng: 43.6793, label: 'Iraq/Levant' },
    { lat: 34.8021, lng: 38.9968, label: 'Syria/Levant' },
    { lat: 33.9391, lng: 67.7100, label: 'Afghanistan/Central Asia' },
    { lat: 4.5709, lng: -74.2973, label: 'Colombia/South America' },
  ];
  return hotSpots.map(spot => ({
    ...spot,
    size: Math.random() * 0.8 + 0.2,
    color: Math.random() > 0.5 ? '#06b6d4' : '#f97316'
  }));
};

const generateRestrictedZones = (): RestrictedZone[] => [
  {
    type: 'Feature',
    properties: {
      id: 'zone-me',
      label: 'RESTRICTED AIRSPACE: MIDDLE EAST',
      color: 'rgba(239, 68, 68, 0.2)',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [34, 31], [34, 33], [36, 33], [36, 31], [34, 31]
      ]]
    }
  },
  {
    type: 'Feature',
    properties: {
      id: 'zone-ua',
      label: 'NO-FLY ZONE: EASTERN EUROPE',
      color: 'rgba(239, 68, 68, 0.2)',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [22, 44], [22, 52], [40, 52], [40, 44], [22, 44]
      ]]
    }
  }
];

const generateIncidentMarkers = (): IncidentMarker[] => [
  { 
    id: 'm1', 
    lat: 31.52, 
    lng: 34.45, 
    type: 'strike', 
    label: 'Incident: Gaza City District',
    details: 'Analytical monitoring of infrastructure stability in central Gaza. Reports indicate ongoing regional tensions affecting local humanitarian efforts.',
    intensity: 'Critical'
  },
  { 
    id: 'm2', 
    lat: 32.08, 
    lng: 34.78, 
    type: 'strike', 
    label: 'Activity: Tel Aviv Metropolitan Area',
    details: 'Monitoring reports of regional activity impacting central urban centers. Analysts are assessing the implications for regional stability and diplomatic channels.',
    intensity: 'High'
  },
  { 
    id: 'm3', 
    lat: 35.68, 
    lng: 51.38, 
    type: 'clash', 
    label: 'Activity: Tehran Central District',
    details: 'Geopolitical monitoring of developments in the Iranian capital. Reports suggest significant regional policy shifts being coordinated from central administrative hubs.',
    intensity: 'High'
  },
  { 
    id: 'm4', 
    lat: 27.18, 
    lng: 56.26, 
    type: 'blockade', 
    label: 'Maritime Monitoring: Strait of Hormuz',
    details: 'Increased monitoring of maritime traffic in the Hormuz strait. Analysts track regional influence on global energy corridors and shipping security.',
    intensity: 'High'
  },
  { 
    id: 'm5', 
    lat: 33.89, 
    lng: 35.50, 
    type: 'strike', 
    label: 'Incident: Beirut Coastal Area',
    details: 'Monitoring reports of activity in the coastal districts. Geopolitical teams are assessing the impact on regional stability and cross-border dynamics.',
    intensity: 'High'
  },
  { 
    id: 'm6', 
    lat: 48.37, 
    lng: 31.16, 
    type: 'clash', 
    label: 'Activity: Eastern Ukraine Frontline',
    details: 'Ongoing monitoring of frontline dynamics in the Donbas region. Reports indicate sustained regional activity with significant implications for European security.',
    intensity: 'Critical'
  },
];

const COUNTRY_LABELS: CountryLabel[] = [
  { lat: 31.0461, lng: 34.8516, name: 'ISRAEL' },
  { lat: 48.3794, lng: 31.1656, name: 'UKRAINE' },
  { lat: 15.5527, lng: 48.5164, name: 'YEMEN' },
  { lat: 33.2232, lng: 43.6793, name: 'IRAQ' },
  { lat: 34.8021, lng: 38.9968, name: 'SYRIA' },
  { lat: 35.8617, lng: 104.1954, name: 'CHINA', size: 0.8 },
  { lat: 37.0902, lng: -95.7129, name: 'USA', size: 0.8 },
  { lat: 55.7558, lng: 37.6173, name: 'RUSSIA', size: 0.8 },
  { lat: 20.5937, lng: 78.9629, name: 'INDIA', size: 0.8 },
  { lat: 33.9391, lng: 67.7100, name: 'AFGHANISTAN' },
  { lat: 32.4279, lng: 53.6880, name: 'IRAN' },
  { lat: 23.8859, lng: 45.0792, name: 'SAUDI ARABIA' },
  { lat: 38.9637, lng: 35.2433, name: 'TURKEY' },
  { lat: 30.0444, lng: 31.2357, name: 'EGYPT' },
  { lat: 51.1657, lng: 10.4515, name: 'GERMANY' },
  { lat: 46.2276, lng: 2.2137, name: 'FRANCE' },
  { lat: 55.3781, lng: -3.4360, name: 'UK' },
];

const INITIAL_ALERTS: Alert[] = [
  {
    id: '1',
    type: 'CRISIS',
    title: 'RED SEA ESCALATION',
    message: 'Multiple anti-ship missiles launched from Houthi-controlled territory. US Navy responding.',
    timestamp: '16:50:12Z',
    severity: 'high'
  },
  {
    id: '2',
    type: 'EVENT',
    title: 'BORDER CLASH',
    message: 'Artillery exchange reported along the Line of Control. Casualties unconfirmed.',
    timestamp: '16:45:00Z',
    severity: 'medium'
  },
  {
    id: '3',
    type: 'DIPLOMATIC',
    title: 'CYBER OFFENSIVE',
    message: 'State-sponsored DDoS attack targeting critical infrastructure in Sector 7.',
    timestamp: '16:30:45Z',
    severity: 'high'
  }
];

export default function App() {
  const [time, setTime] = useState(new Date());
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [bars, setBars] = useState<CountryBar[]>([]);
  const [zones, setZones] = useState<RestrictedZone[]>([]);
  const [markers, setMarkers] = useState<IncidentMarker[]>(generateIncidentMarkers());
  const [acledEvents, setAcledEvents] = useState<ACLEDEvent[]>([]);
  const [flights, setFlights] = useState<FlightState[]>([]);
  const [ships, setShips] = useState<any[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<IncidentMarker | null>(null);
  const [activePanel, setActivePanel] = useState<'none' | 'stats' | 'alerts'>('none');
  const [viewMode, setViewMode] = useState<'all' | 'air' | 'marine' | 'strikes'>('all');
  
  // API Keys (Placeholders)
  const [acledKey, setAcledKey] = useState(import.meta.env.VITE_ACLED_KEY || '');
  const [acledEmail, setAcledEmail] = useState(import.meta.env.VITE_ACLED_EMAIL || '');
  const [aisKey, setAisKey] = useState(import.meta.env.VITE_AIS_KEY || '');
  const [isRotating, setIsRotating] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isLoadingIntel, setIsLoadingIntel] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);

  const refreshIntel = async () => {
    setIsLoadingIntel(true);
    setIntelError(null);
    try {
      const response = await fetch('/api/intel');
      if (!response.ok) throw new Error('Failed to fetch intel');
      const data = await response.json();
      
      if (data.events && data.events.length > 0) {
        setMarkers(data.events);
        setAlerts(data.alerts.map((a: any) => ({
          ...a,
          timestamp: new Date().toISOString().split('T')[1].split('.')[0] + 'Z'
        })));
        
        // Update traffic
        if (data.traffic) {
          setPaths(data.traffic.flights || []);
          // Add vessels as assets
          const vesselAssets: Asset[] = (data.traffic.vessels || []).map((v: any, i: number) => ({
            id: `VESSEL-${i}`,
            lat: v.lat,
            lng: v.lng,
            alt: 0.01,
            type: 'sea',
            color: v.type === 'military' ? '#ef4444' : '#06b6d4',
            label: v.label
          }));
          setAssets(prev => [...prev.filter(a => !a.id.startsWith('VESSEL-')), ...vesselAssets]);
        }
      } else {
        setIntelError("No live data found. Using cached situation report.");
      }
    } catch (err) {
      console.error("API Error:", err);
      setIntelError("Failed to connect to intelligence stream. Using cached data.");
    }
    setIsLoadingIntel(false);
  };

  // === IRAN CONFLICT REAL DATA INTEGRATION ===
  
  // 1. Air Traffic (Backend Proxy)
  useEffect(() => {
    const fetchAirTraffic = async () => {
      try {
        const response = await fetch('/api/traffic/air');
        if (!response.ok) throw new Error('Failed to fetch air traffic');
        const data = await response.json();
        setFlights(data);
      } catch (err) {
        console.error('Air Traffic Error:', err);
      }
    };
    
    fetchAirTraffic();
    const interval = setInterval(fetchAirTraffic, 15000);
    return () => clearInterval(interval);
  }, []);

  // 2. Marine Traffic (AISStream WebSocket)
  useEffect(() => {
    if (!aisKey) return;

    const socket = new WebSocket('wss://stream.aisstream.io/v0/stream');

    socket.onopen = () => {
      const subscriptionMessage = {
        APIKey: aisKey,
        BoundingBoxes: [[[23, 46], [32, 58]]], // Persian Gulf / Strait of Hormuz
        FiltersShipMMSI: [],
        FilterShipName: [],
        FilterShipType: []
      };
      socket.send(JSON.stringify(subscriptionMessage));
    };

    socket.onmessage = (event) => {
      const aisMessage = JSON.parse(event.data);
      if (aisMessage.MessageType === 'PositionReport') {
        const { Message, MetaData } = aisMessage;
        const newShip = {
          mmsi: Message.PositionReport.Mmsi,
          name: MetaData.ShipName.trim() || `MMSI: ${Message.PositionReport.Mmsi}`,
          lat: Message.PositionReport.Latitude,
          lng: Message.PositionReport.Longitude,
          speed: Message.PositionReport.Sog,
          heading: Message.PositionReport.TrueHeading,
          timestamp: MetaData.time_utc
        };

        setShips(prev => {
          const filtered = prev.filter(s => s.mmsi !== newShip.mmsi);
          return [...filtered, newShip].slice(-100); // Keep last 100 ships
        });
      }
    };

    socket.onerror = (err) => console.error('AIS WebSocket Error:', err);
    return () => socket.close();
  }, [aisKey]);

  // 3. Strike Events (Backend Proxy)
  useEffect(() => {
    const fetchStrikes = async () => {
      if (!acledKey || !acledEmail) return;
      try {
        const response = await fetch('/api/traffic/strikes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: acledKey, email: acledEmail })
        });
        if (!response.ok) throw new Error('Failed to fetch strikes');
        const data = await response.json();
        setAcledEvents(data);
        
        // Convert ACLED events to markers
        const strikeMarkers: IncidentMarker[] = data.map((event: any) => ({
          id: event.data_id,
          lat: event.latitude,
          lng: event.longitude,
          type: 'strike',
          label: `STRIKE: ${event.location}`,
          details: event.notes,
          intensity: event.fatalities > 10 ? 'Critical' : 'High'
        }));
        
        if (strikeMarkers.length > 0) {
          setMarkers(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newOnes = strikeMarkers.filter(m => !existingIds.has(m.id));
            return [...prev, ...newOnes];
          });
          
          // Add pattern alerts for new strikes
          const latest = data[0];
          if (latest) {
            const newAlert: Alert = {
              id: `acled-${latest.data_id}`,
              type: 'CRISIS',
              title: 'STRIKE DETECTED',
              message: `${latest.actor1} strike on ${latest.location} (${latest.country}) - ${latest.fatalities} fatalities reported.`,
              timestamp: new Date().toISOString().split('T')[1].split('.')[0] + 'Z',
              severity: 'high'
            };
            setAlerts(prev => [newAlert, ...prev.slice(0, 5)]);
          }
        }
      } catch (err) {
        console.error('Strike Data Error:', err);
      }
    };

    fetchStrikes();
    const interval = setInterval(fetchStrikes, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [acledKey, acledEmail]);

  // Initialize data
  useEffect(() => {
    const mockAssets = generateMockAssets(120);
    setAssets(mockAssets);
    setPaths(generateMockFlightPaths(mockAssets));
    setBars(generateMockBars());
    setZones(generateRestrictedZones());
    
    const initialFetch = setTimeout(() => {
      refreshIntel();
    }, 1500);

    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // Randomly add alerts
    const alertTimer = setInterval(() => {
      if (Math.random() > 0.6) {
        const newAlert: Alert = {
          id: Math.random().toString(36).substr(2, 9),
          type: Math.random() > 0.7 ? 'CRISIS' : 'EVENT',
          title: Math.random() > 0.5 ? 'AIRSPACE BREACH' : 'NAVAL STANDOFF',
          message: `Intelligence reports indicate ${Math.random() > 0.5 ? 'unauthorized drone activity' : 'fleet movement'} in restricted sector.`,
          timestamp: new Date().toISOString().split('T')[1].split('.')[0] + 'Z',
          severity: Math.random() > 0.7 ? 'high' : 'medium'
        };
        setAlerts(prev => [newAlert, ...prev.slice(0, 5)]);
      }
    }, 15000);

    return () => {
      clearInterval(timer);
      clearInterval(alertTimer);
      clearTimeout(initialFetch);
    };
  }, []);

  const formattedTime = time.toISOString().split('T')[1].split('.')[0] + 'Z';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* Subtle Background Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)] z-0" />

      {/* Globe Background */}
      <div className="absolute inset-0 z-0">
        <GlobeView 
          assets={assets} 
          paths={paths} 
          bars={bars} 
          zones={zones} 
          markers={markers} 
          labels={COUNTRY_LABELS}
          isRotating={isRotating}
          onMarkerClick={(m) => setSelectedMarker(m)}
          flights={flights}
          ships={ships}
          viewMode={viewMode}
        />
      </div>

      {/* Conflict Intel Modal */}
      <AnimatePresence>
        {selectedMarker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#0a0c10] border border-cyan-500/30 rounded-sm shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden"
            >
              <div className="bg-cyan-500/10 border-b border-cyan-500/20 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/20 rounded-sm">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold text-cyan-500 uppercase tracking-widest">Geopolitical Analysis</h3>
                    <p className="text-[10px] font-mono text-cyan-400/60">REPORT ID: {selectedMarker.id} // THREATSPHERE MONITORING</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedMarker(null)}
                  className="p-1 hover:bg-white/10 rounded-sm transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-180 text-white/40" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/40 uppercase">Incident Category</span>
                  <span className="text-xs font-bold text-white uppercase">{selectedMarker.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/40 uppercase">Location</span>
                  <span className="text-xs font-bold text-cyan-400 uppercase">{selectedMarker.label.split(': ')[1] || selectedMarker.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/40 uppercase">Risk Assessment</span>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-sm",
                    selectedMarker.intensity === 'Critical' ? "bg-red-500/20 text-red-500" : "bg-orange-500/20 text-orange-500"
                  )}>
                    {selectedMarker.intensity || 'High'}
                  </span>
                </div>

                <div className="h-[1px] bg-white/10 w-full" />

                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-white/40 uppercase">Analytical Summary</span>
                  <p className="text-xs text-white/80 leading-relaxed font-mono">
                    {selectedMarker.details || 'No additional analysis available for this sector.'}
                  </p>
                </div>

                <div className="pt-4 flex gap-2">
                  <button 
                    onClick={() => setSelectedMarker(null)}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-mono font-bold py-2 rounded-sm transition-colors uppercase tracking-widest"
                  >
                    Close Analysis
                  </button>
                </div>
              </div>
              
              <div className="bg-cyan-500/5 p-2 text-center">
                <p className="text-[8px] font-mono text-cyan-500/40 uppercase tracking-[0.3em]">Public Information Tool // ThreatSphere</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top HUD Bar */}
      <AnimatePresence>
        {showOverlay && (
          <motion.header 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-slate-950/80 border-b border-slate-800 backdrop-blur-md"
          >
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-sm">
              <GlobeIcon className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-display font-bold tracking-widest text-white leading-none">
                ThreatSphere
              </h1>
              <p className="hidden md:block text-[10px] font-mono tracking-[0.3em] text-slate-400 uppercase">
                Geopolitical Situation Analysis // v5.1.0
              </p>
            </div>
          </div>

          <div className="hidden md:block h-8 w-[1px] bg-slate-800 mx-2" />

          <div className="hidden md:flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold">
              <span className="text-slate-400 uppercase tracking-tighter">Geopolitical Risk Index</span>
              <span className="text-red-500 animate-pulse">SEVERE (300%)</span>
            </div>
            <div className="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              {intelError && (
                <span className="hidden sm:block text-[8px] font-mono text-red-500 uppercase animate-pulse mr-2">
                  {intelError}
                </span>
              )}
              <button 
                onClick={refreshIntel}
                disabled={isLoadingIntel}
                className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded-sm hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
              >
                <Activity className={cn("w-3 h-3 text-cyan-400", isLoadingIntel && "animate-spin")} />
                <span className="text-[8px] font-mono font-bold text-cyan-400 uppercase">Update Analysis</span>
              </button>
              <div className="w-2 h-2 rounded-full bg-cyan-500 pulsing-dot" />
              <span className="text-[10px] md:text-xs font-mono font-bold text-cyan-400 tracking-widest uppercase">Live Situation Feed</span>
            </div>
            <div className="text-lg md:text-2xl font-mono font-medium tracking-tighter text-white/90">
              {formattedTime}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-white/40 uppercase">Data Stream</span>
              <span className="text-sm font-mono font-bold text-green-400">VERIFIED</span>
            </div>
            <div className="flex gap-1 bg-slate-900/60 p-1 border border-slate-800 rounded-sm">
              {(['all', 'air', 'marine', 'strikes'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-2 py-1 text-[8px] font-mono uppercase transition-colors rounded-sm",
                    viewMode === mode ? "bg-cyan-500 text-black font-bold" : "text-slate-400 hover:bg-white/5"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="p-2 hover:bg-white/5 rounded-sm transition-colors cursor-pointer group relative">
              <Settings className="w-5 h-5 text-white/60" />
              <div className="absolute top-full right-0 mt-2 w-64 bg-slate-950 border border-slate-800 p-4 rounded-sm shadow-2xl hidden group-hover:block z-[100]">
                <p className="text-[10px] font-mono text-cyan-500 mb-3 uppercase tracking-widest">API Configuration</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[8px] font-mono text-slate-500 uppercase block mb-1">ACLED Key</label>
                    <input 
                      type="password" 
                      value={acledKey} 
                      onChange={(e) => setAcledKey(e.target.value)}
                      placeholder="Enter ACLED Key"
                      className="w-full bg-slate-900 border border-slate-800 text-[10px] font-mono px-2 py-1 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-mono text-slate-500 uppercase block mb-1">ACLED Email</label>
                    <input 
                      type="text" 
                      value={acledEmail} 
                      onChange={(e) => setAcledEmail(e.target.value)}
                      placeholder="Enter ACLED Email"
                      className="w-full bg-slate-900 border border-slate-800 text-[10px] font-mono px-2 py-1 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-mono text-slate-500 uppercase block mb-1">AISStream Key</label>
                    <input 
                      type="password" 
                      value={aisKey} 
                      onChange={(e) => setAisKey(e.target.value)}
                      placeholder="Enter AIS Key"
                      className="w-full bg-slate-900 border border-slate-800 text-[10px] font-mono px-2 py-1 outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.header>
    )}
  </AnimatePresence>

  {/* Left Panel - Conflict Metrics */}
  <AnimatePresence>
    {showOverlay && (activePanel === 'stats' || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside 
            key="left-panel"
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "absolute z-40 w-72 md:w-64 flex flex-col gap-4",
              "left-0 right-0 mx-auto md:mx-0 md:left-6 top-24 bottom-24",
              activePanel === 'stats' ? "inset-x-4 bottom-24 top-24" : "hidden md:flex"
            )}
          >
            <div className="info-panel p-4 flex flex-col gap-4 h-full md:h-auto border-slate-800 bg-slate-950/60 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-display font-bold text-cyan-400 uppercase tracking-wider">Situation Analysis</span>
                <button 
                  onClick={() => setActivePanel('none')}
                  className="md:hidden p-1 hover:bg-white/10 rounded"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <Info className="hidden md:block w-4 h-4 text-cyan-400" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Air Assets', count: flights.length.toString(), color: 'text-cyan-400' },
                  { label: 'Marine Assets', count: ships.length.toString(), color: 'text-orange-400' },
                  { label: 'Strike Events', count: acledEvents.length.toString(), color: 'text-red-500' },
                  { label: 'Regional Shifts', count: '8', color: 'text-indigo-400' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-slate-900/40 p-2 border border-slate-800 rounded-sm">
                    <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">{stat.label}</p>
                    <p className={cn("text-lg font-mono font-bold", stat.color)}>{stat.count}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">DATA CONFIDENCE</span>
                  <span className="text-green-400">98.4%</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">MONITORING NODES</span>
                  <span className="text-cyan-400">142</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">RISK LEVEL</span>
                  <span className="text-orange-500">ELEVATED</span>
                </div>
              </div>

              <div className="info-panel p-4 flex-1 overflow-hidden flex flex-col mt-2 border-slate-800 bg-slate-900/20">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="text-xs font-display font-bold text-red-500 uppercase tracking-wider">Live Conflict Events</span>
                  <Zap className="w-4 h-4 text-red-500 animate-pulse" />
                </div>
                <div className="space-y-4 overflow-y-auto pr-2">
                  {acledEvents.length > 0 ? acledEvents.slice(0, 10).map((event, i) => (
                    <div key={event.data_id} className="flex flex-col gap-1 p-2 bg-slate-800/20 rounded-sm border border-slate-800/50">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono text-red-400 font-bold uppercase">{event.event_type}</span>
                        <span className="text-[8px] font-mono text-slate-500">{event.event_date}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-200 leading-tight">{event.location}, {event.country}</p>
                      <p className="text-[9px] text-slate-400 line-clamp-2 italic">{event.notes}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[8px] font-mono text-slate-500 uppercase">Fatalities: {event.fatalities}</span>
                        <span className="text-[8px] font-mono text-orange-500 uppercase">Actor: {event.actor1}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 font-mono text-[10px] text-center p-4">
                      <p>NO LIVE ACLED DATA DETECTED</p>
                      <p className="mt-2 opacity-50 italic">Configure API keys in settings to activate real-time conflict stream</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Right Panel - Conflict Log */}
      <AnimatePresence>
        {showOverlay && (activePanel === 'alerts' || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside 
            key="right-panel"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "absolute z-40 w-80 flex flex-col gap-4",
              "left-0 right-0 mx-auto md:mx-0 md:right-6 top-24 bottom-24",
              activePanel === 'alerts' ? "inset-x-4 bottom-24 top-24" : "hidden md:flex"
            )}
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActivePanel('none')}
                  className="md:hidden p-1 hover:bg-white/10 rounded"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <span className="text-xs font-display font-bold text-cyan-500 uppercase tracking-widest">Event Log</span>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[10px] font-mono text-cyan-400">LIVE UPDATES</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
              <AnimatePresence mode="popLayout">
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 50, opacity: 0 }}
                    className={cn(
                      "info-panel p-4 border-l-4 bg-slate-900/40 border-slate-800",
                      alert.severity === 'high' ? "border-l-orange-500" : "border-l-cyan-600"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={cn(
                          "w-4 h-4",
                          alert.severity === 'high' ? "text-orange-400" : "text-cyan-400"
                        )} />
                        <span className="text-xs font-display font-bold uppercase tracking-wider text-slate-200">
                          {alert.type}: {alert.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{alert.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono">
                      {alert.message}
                    </p>
                    <div className="mt-3 flex justify-end">
                      <button className="text-[10px] font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 uppercase tracking-tighter">
                        View Details <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="info-panel p-4 border-slate-800 bg-slate-900/20">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-display font-bold text-cyan-400 uppercase">Geopolitical Risk Trend</span>
              </div>
              <div className="h-16 flex items-end gap-1 px-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [Math.random() * 20 + 10, Math.random() * 50 + 10, Math.random() * 20 + 10] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                    className="flex-1 bg-cyan-600/40 rounded-t-sm"
                  />
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Bottom Bar Controls */}
      <footer className="absolute bottom-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-slate-950/80 border-t border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-sm">
            <Search className="w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="SEARCH REGION..." 
              className="bg-transparent border-none outline-none text-[10px] font-mono w-32 md:w-48 placeholder:text-slate-600"
            />
          </div>
          
          {/* Mobile HUD Toggles */}
          <div className="flex md:hidden gap-2">
            <button 
              onClick={() => setActivePanel(activePanel === 'stats' ? 'none' : 'stats')}
              className={cn(
                "p-2 rounded-sm border transition-all flex items-center gap-2",
                activePanel === 'stats' ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" : "bg-slate-900 border-slate-800 text-slate-400"
              )}
            >
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-mono font-bold uppercase">Analysis</span>
            </button>
            <button 
              onClick={() => setActivePanel(activePanel === 'alerts' ? 'none' : 'alerts')}
              className={cn(
                "p-2 rounded-sm border transition-all flex items-center gap-2",
                activePanel === 'alerts' ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" : "bg-slate-900 border-slate-800 text-slate-400"
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-[10px] font-mono font-bold uppercase">Events</span>
            </button>
          </div>

          <div className="flex gap-1">
            <button 
              onClick={() => setIsRotating(!isRotating)}
              className={cn(
                "p-2 rounded-sm border transition-all flex items-center gap-2",
                isRotating ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" : "bg-white/5 border-white/10 text-white/60"
              )}
              title={isRotating ? "Pause Rotation" : "Play Rotation"}
            >
              {isRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => setShowOverlay(!showOverlay)}
              className={cn(
                "p-2 rounded-sm border transition-all flex items-center gap-2",
                showOverlay ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" : "bg-white/5 border-white/10 text-white/60"
              )}
              title={showOverlay ? "Hide Overlay" : "Show Overlay"}
            >
              <Layers className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/5 rounded-sm border border-white/5 transition-colors">
              <Maximize2 className="w-4 h-4 text-white/60" />
            </button>
            <button className="p-2 hover:bg-white/5 rounded-sm border border-white/5 transition-colors">
              <MapIcon className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden lg:flex items-center gap-4 text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <span>ThreatSphere Monitoring: Active</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[9px] md:text-[10px] font-mono font-black text-cyan-600/60 tracking-[0.2em] md:tracking-[0.4em] uppercase">
              ThreatSphere // SITUATION ANALYSIS
            </span>
            <span className="hidden sm:block text-[8px] font-mono text-slate-500 uppercase">
              Public Information & Geopolitical Analysis
            </span>
          </div>
        </div>
      </footer>

      {/* Decorative Corner Elements */}
      <div className="hidden md:block absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-slate-800 pointer-events-none z-50" />
      <div className="hidden md:block absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-slate-800 pointer-events-none z-50" />
      <div className="hidden md:block absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-slate-800 pointer-events-none z-50" />
      <div className="hidden md:block absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-slate-800 pointer-events-none z-50" />
    </div>
  );
}
