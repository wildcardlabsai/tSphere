import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface GeopoliticalEvent {
  id: string;
  lat: number;
  lng: number;
  type: 'strike' | 'blockade' | 'clash';
  label: string;
  details: string;
  intensity: 'Low' | 'Medium' | 'High' | 'Critical';
  region: string;
}

export interface IntelligenceAlert {
  id: string;
  type: 'EVENT' | 'CRISIS' | 'RESPONSE';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface TrafficData {
  flights: { startLat: number; startLng: number; endLat: number; endLng: number; color: string }[];
  vessels: { lat: number; lng: number; label: string; type: 'tanker' | 'cargo' | 'military' }[];
}

// === IRAN CONFLICT REAL DATA INTEGRATION ===

export interface FlightState {
  icao24: string;
  callsign: string;
  origin_country: string;
  time_position: number;
  last_contact: number;
  longitude: number;
  latitude: number;
  baro_altitude: number;
  on_ground: boolean;
  velocity: number;
  true_track: number;
  vertical_rate: number;
  sensors: number[];
  geo_altitude: number;
  squawk: string;
  spi: boolean;
  position_source: number;
}

export interface ACLEDEvent {
  data_id: string;
  event_date: string;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  assoc_actor_1: string;
  actor2: string;
  assoc_actor_2: string;
  country: string;
  location: string;
  latitude: number;
  longitude: number;
  fatalities: number;
  notes: string;
}

export const fetchOpenSkyData = async (): Promise<FlightState[]> => {
  try {
    // Bounding box for Middle East theater: lamin=20, lamax=40, lomin=30, lomax=65
    const response = await fetch('https://opensky-network.org/api/states/all?lamin=20&lamax=40&lomin=30&lomax=65');
    if (!response.ok) throw new Error('OpenSky API error');
    const data = await response.json();
    
    if (!data.states) return [];
    
    return data.states.map((s: any[]) => ({
      icao24: s[0],
      callsign: s[1]?.trim() || 'UNKNOWN',
      origin_country: s[2],
      time_position: s[3],
      last_contact: s[4],
      longitude: s[5],
      latitude: s[6],
      baro_altitude: s[7],
      on_ground: s[8],
      velocity: s[9],
      true_track: s[10],
      vertical_rate: s[11],
      sensors: s[12],
      geo_altitude: s[13],
      squawk: s[14],
      spi: s[15],
      position_source: s[16]
    }));
  } catch (error) {
    console.error('Failed to fetch OpenSky data:', error);
    return [];
  }
};

export const fetchACLEDData = async (key: string, email: string): Promise<ACLEDEvent[]> => {
  if (!key || !email) return [];
  try {
    const today = new Date().toISOString().split('T')[0];
    const startDate = '2026-02-28';
    const countries = ['Iran', 'Israel', 'Iraq', 'Syria', 'Lebanon', 'Jordan'].join('|');
    const eventTypes = ['Air Strike', 'Shelling/Artillery/Missile Attack', 'Explosions/Remote violence'].join('|');
    
    const url = `https://api.acleddata.com/acled/read?key=${key}&email=${email}&event_date=${startDate}|${today}&country=${countries}&limit=500&event_type=${eventTypes}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('ACLED API error');
    const data = await response.json();
    
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch ACLED data:', error);
    return [];
  }
};

export const fetchConflictIntel = async (): Promise<{ 
  events: GeopoliticalEvent[], 
  alerts: IntelligenceAlert[],
  traffic: TrafficData
}> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Act as a senior geopolitical analyst for a global news organization. Generate a factual situation report on current global events for March 2026. 
      The report is for a general public audience interested in understanding world events, not for tactical or military simulation.
      
      CRITICAL: Access and analyze the latest live data from real news sources (e.g., Reuters, AP, Al Jazeera) and situational dashboards like OpEpicFury.xyz. 
      Extract ALL reported strike locations, clashes, and maritime incidents, specifically in Iran, Israel, Gaza, Lebanon, and Ukraine.
      
      You MUST provide real-time accurate data as of March 2026.
      
      Also, provide a representative sample of current major air traffic (flight paths) and marine traffic (vessel locations) in these high-tension regions.
      
      Focus specifically on:
      1. Israel and the Levant: Detailed monitoring of activity in Gaza, the West Bank, and the northern border.
      2. Iran and the Persian Gulf: Analysis of regional influence, maritime security in the Strait of Hormuz, and domestic developments.
      3. Global Stability: The situation in Ukraine, Red Sea maritime security, and significant diplomatic shifts.
      
      Provide:
      - 10-15 specific, grounded events with accurate coordinates.
      - 5-6 high-priority analytical alerts.
      - 15-20 representative flight paths in the Middle East and Europe.
      - 15-20 representative vessel locations in the Persian Gulf, Red Sea, and Black Sea.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  type: { type: Type.STRING, enum: ['strike', 'blockade', 'clash'] },
                  label: { type: Type.STRING },
                  details: { type: Type.STRING },
                  intensity: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
                  region: { type: Type.STRING }
                },
                required: ['id', 'lat', 'lng', 'type', 'label', 'details', 'intensity', 'region']
              }
            },
            alerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['EVENT', 'CRISIS', 'RESPONSE'] },
                  title: { type: Type.STRING },
                  message: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
                },
                required: ['id', 'type', 'title', 'message', 'severity']
              }
            },
            traffic: {
              type: Type.OBJECT,
              properties: {
                flights: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      startLat: { type: Type.NUMBER },
                      startLng: { type: Type.NUMBER },
                      endLat: { type: Type.NUMBER },
                      endLng: { type: Type.NUMBER },
                      color: { type: Type.STRING }
                    },
                    required: ['startLat', 'startLng', 'endLat', 'endLng', 'color']
                  }
                },
                vessels: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER },
                      label: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['tanker', 'cargo', 'military'] }
                    },
                    required: ['lat', 'lng', 'label', 'type']
                  }
                }
              },
              required: ['flights', 'vessels']
            }
          },
          required: ['events', 'alerts', 'traffic']
        }
      }
    });

    const data = JSON.parse(response.text);
    return data;
  } catch (error) {
    console.error("Failed to fetch conflict intel:", error);
    return { events: [], alerts: [], traffic: { flights: [], vessels: [] } };
  }
};
