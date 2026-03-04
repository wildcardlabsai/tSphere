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

export const fetchConflictIntel = async (): Promise<{ events: GeopoliticalEvent[], alerts: IntelligenceAlert[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a senior geopolitical analyst for a global news organization. Generate a factual situation report on current global events for March 2026. 
      The report is for a general public audience interested in understanding world events, not for tactical or military simulation.
      
      CRITICAL: Access and analyze the latest live data from https://OpEpicFury.xyz. Extract all reported events, specifically focusing on strike locations and incidents in Iran and Israel.
      
      Focus specifically on:
      1. Israel and the Levant: Detailed monitoring of activity in Gaza, the West Bank, and the northern border. Include specific events related to regional stability and humanitarian corridors.
      2. Iran and the Persian Gulf: Analysis of regional influence, maritime security in the Strait of Hormuz, and domestic developments in Tehran.
      3. Global Stability: The situation in Ukraine, Red Sea maritime security, and significant diplomatic shifts.
      
      Provide a list of 8-10 specific, grounded events with accurate coordinates (e.g., Gaza: 31.5, 34.4; Tehran: 35.7, 51.4; Tel Aviv: 32.1, 34.8). Each event should have a professional analytical summary. Avoid all tactical, game-like, or simulation-style language.
      Also provide 4-5 high-priority analytical alerts regarding regional escalations or diplomatic developments.`,
      config: {
        tools: [{ googleSearch: {} }, { urlContext: {} }],
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
            }
          },
          required: ['events', 'alerts']
        }
      }
    });

    const data = JSON.parse(response.text);
    return data;
  } catch (error) {
    console.error("Failed to fetch conflict intel:", error);
    return { events: [], alerts: [] };
  }
};
