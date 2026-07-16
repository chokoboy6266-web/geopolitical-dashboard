export interface SecondOrderImpact {
  economic: string;
  political: string;
  strategic: string;
}

export interface IntelligenceLayer {
  confidenceScore: number;
  whatChanged: string;
  secondOrderImpact: SecondOrderImpact;
}

export interface ContextLayer {
  region: string;
  involvedCountries: string[];
  historicalContext: string;
  existingTensions: string;
  isoAlpha3: string[];
  coordinates: { lat: number; lng: number };
}

export interface XContent {
  shortPost: string;
  thread: string[];
}

export interface AnalyticalLenses {
  strategic: string;
  economic: string;
  risk: string;
}

export interface ExternalCommentary {
  author: string;
  excerpt: string;
  url: string;
}

export interface VoicesLayer {
  perspectives: AnalyticalLenses;
  keyTakeaway: string;
  externalCommentary: ExternalCommentary[];
}

export type ThreatCategory = 'security' | 'energy' | 'technology' | 'diplomacy';

export interface ArcConnection {
  targetCountry: string;
  targetCoords: { lat: number; lng: number };
  type: 'tension' | 'alliance' | 'trade' | 'tech';
}

export interface Signal {
  id: string;
  summary: string;
  riskScore: number;
  whyItMatters: string;
  whatToWatch: string;
  isNoise: boolean;
  imageUrl?: string;
  sourceUrl?: string;
  context: ContextLayer;
  xContent: XContent;
  intelligence: IntelligenceLayer;
  voices: VoicesLayer;
  category: ThreatCategory;
  connections: ArcConnection[];
}

const countryCoordinates: Record<string, { lat: number, lng: number }> = {
  "USA": { lat: 37.0902, lng: -95.7129 },
  "China": { lat: 35.8617, lng: 104.1954 },
  "India": { lat: 20.5937, lng: 78.9629 },
  "Pakistan": { lat: 30.3753, lng: 69.3451 },
  "Russia": { lat: 61.5240, lng: 105.3188 },
  "Germany": { lat: 51.1657, lng: 10.4515 },
  "Iran": { lat: 32.4279, lng: 53.6880 },
  "Israel": { lat: 31.0461, lng: 34.8516 },
  "Sudan": { lat: 12.8628, lng: 30.2176 },
  "Mali": { lat: 17.5707, lng: -3.9962 },
  "UAE": { lat: 23.4241, lng: 53.8478 },
  "Singapore": { lat: 1.3521, lng: 103.8198 },
  "Brazil": { lat: -14.2350, lng: -51.9253 },
  "Congo": { lat: -0.2280, lng: 15.8277 },
  "Gaza": { lat: 31.3547, lng: 34.3088 },
  "Middle East": { lat: 29.2985, lng: 42.5510 },
  "Europe": { lat: 54.5260, lng: 15.2551 },
  "Asia": { lat: 34.0479, lng: 100.6197 },
  "Africa": { lat: 8.7832, lng: 34.5085 }
};

const getCategoryFromText = (title: string, summary: string): ThreatCategory => {
  const text = (title + " " + summary).toLowerCase();
  if (
    text.includes("cyber") ||
    text.includes("semiconductor") ||
    text.includes("chip") ||
    text.includes("ai ") ||
    text.includes("digital") ||
    text.includes("technology") ||
    text.includes("telecom") ||
    text.includes("satellite") ||
    text.includes("quantum") ||
    text.includes("software")
  ) {
    return "technology";
  }
  if (
    text.includes("oil") ||
    text.includes("gas") ||
    text.includes("energy") ||
    text.includes("trade") ||
    text.includes("tariff") ||
    text.includes("supply chain") ||
    text.includes("economic") ||
    text.includes("shipping") ||
    text.includes("ports") ||
    text.includes("sanctions") ||
    text.includes("grain") ||
    text.includes("crude")
  ) {
    return "energy";
  }
  if (
    text.includes("summit") ||
    text.includes("treaty") ||
    text.includes("accord") ||
    text.includes("talks") ||
    text.includes("diplomatic") ||
    text.includes("alliance") ||
    text.includes("relations") ||
    text.includes("partnership") ||
    text.includes("ambassador") ||
    text.includes("visit")
  ) {
    return "diplomacy";
  }
  return "security";
};

const getConnectionsFromText = (sourceCountry: string, title: string, summary: string, category: ThreatCategory): ArcConnection[] => {
  const text = (title + " " + summary).toLowerCase();
  const connections: ArcConnection[] = [];
  
  for (const [country, coords] of Object.entries(countryCoordinates)) {
    if (country.toLowerCase() === sourceCountry.toLowerCase()) continue;
    if (["Middle East", "Europe", "Asia", "Africa"].includes(country)) continue;
    
    if (text.includes(country.toLowerCase())) {
      let type: 'tension' | 'alliance' | 'trade' | 'tech' = 'tension';
      if (category === 'diplomacy') type = 'alliance';
      else if (category === 'energy') type = 'trade';
      else if (category === 'technology') type = 'tech';
      
      connections.push({
        targetCountry: country,
        targetCoords: coords,
        type
      });
    }
  }
  
  if (connections.length === 0) {
    let defaultTarget = "USA";
    if (sourceCountry === "USA") defaultTarget = "China";
    else if (sourceCountry === "China") defaultTarget = "USA";
    else if (sourceCountry === "India") defaultTarget = "USA";
    else defaultTarget = "India";
    
    let type: 'tension' | 'alliance' | 'trade' | 'tech' = 'tension';
    if (category === 'diplomacy') type = 'alliance';
    else if (category === 'energy') type = 'trade';
    else if (category === 'technology') type = 'tech';
    
    connections.push({
      targetCountry: defaultTarget,
      targetCoords: countryCoordinates[defaultTarget] || countryCoordinates["India"],
      type
    });
  }
  
  return connections;
};

interface StoryAnalysis {
  secondOrderImpact: SecondOrderImpact;
  perspectives: AnalyticalLenses;
  confidenceScore: number;
  whatToWatch: string;
  keyTakeaway: string;
}

const jitterSeed = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return hash;
};

const mapStoryToSignal = (story: any, analysis?: StoryAnalysis): Signal => {
  let coords = { lat: 0, lng: 0 };
  let region = story.issue?.name || "Global";

  // Check the title first - the analyst commentary in `summary` always frames things through
  // an India lens, so matching against it here would resolve almost every story to India
  // regardless of what the story is actually about.
  for (const [country, pos] of Object.entries(countryCoordinates)) {
    if (story.title.includes(country)) {
      coords = pos;
      region = country;
      break;
    }
  }

  if (coords.lat === 0) {
    for (const [country, pos] of Object.entries(countryCoordinates)) {
      if (story.summary.includes(country)) {
        coords = pos;
        region = country;
        break;
      }
    }
  }

  if (coords.lat === 0) {
    if (story.summary.includes("Europe")) coords = countryCoordinates["Europe"];
    else if (story.summary.includes("Asia")) coords = countryCoordinates["Asia"];
    else if (story.summary.includes("Middle East")) coords = countryCoordinates["Middle East"];
    else if (story.summary.includes("Africa")) coords = countryCoordinates["Africa"];
    else {
      coords = { lat: (Math.random() - 0.5) * 40, lng: (Math.random() - 0.5) * 100 };
    }
  } else {
    // Spread out signals that resolve to the same country so they don't stack into one invisible point on the globe.
    const seed = jitterSeed(story.id || story.title);
    coords = {
      lat: coords.lat + (((seed % 200) / 100) - 1) * 3,
      lng: coords.lng + ((((seed >> 8) % 200) / 100) - 1) * 3
    };
  }

  const category = getCategoryFromText(story.title, story.summary);
  const connections = getConnectionsFromText(region, story.title, story.summary, category);

  return {
    id: story.id,
    summary: story.title,
    riskScore: story.relevance || 5,
    sourceUrl: story.sourceUrl,
    whyItMatters: story.relevanceSummary || story.summary.substring(0, 150) + "...",
    whatToWatch: analysis?.whatToWatch || "Intelligence indicators suggest " + (story.relevanceReasons?.split('\n')[0]?.replace(/^- \*\*/, '').replace(/\*\*:.*$/, '') || "monitoring required."),
    isNoise: false,
    context: {
      region: region,
      involvedCountries: [region],
      historicalContext: "Dynamic geopolitical event captured via real-time feed.",
      existingTensions: story.issue?.name || "Global stability",
      isoAlpha3: [],
      coordinates: coords
    },
    intelligence: {
      confidenceScore: analysis?.confidenceScore ?? (story.relevance || 7) + 1,
      whatChanged: "Live Update: " + (story.titleLabel || "New Development"),
      secondOrderImpact: analysis?.secondOrderImpact || {
        economic: "Potential disruption to regional markets.",
        political: "Increased diplomatic pressure on local actors.",
        strategic: "Shift in regional power dynamics."
      }
    },
    xContent: {
      shortPost: `${story.title} #Geopolitics #Alert`,
      thread: [story.summary]
    },
    voices: {
      perspectives: analysis?.perspectives || {
        strategic: "Long-term implications for regional security architecture.",
        economic: "Supply chain vulnerabilities exposed by current events.",
        risk: "Elevated risk of unintended escalation."
      },
      keyTakeaway: analysis?.keyTakeaway || story.relevanceSummary || "Continuous monitoring of this development is advised.",
      externalCommentary: [
        {
          author: story.sourceTitle || "Intelligence Source",
          excerpt: story.quote || "Critical development in progress.",
          url: story.sourceUrl || "#"
        }
      ]
    },
    category,
    connections
  };
};

const ANALYSIS_CHUNK_SIZE = 5;
const ANALYSIS_TIMEOUT_MS = 20000;

const fetchAnalysisChunk = async (chunk: any[], analysisMap: Map<string, StoryAnalysis>) => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stories: chunk.map(s => ({ id: s.id, title: s.title, summary: s.summary, source: s.sourceTitle || s.source || '' }))
      }),
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS)
    });
    if (!response.ok) return;
    const { results } = await response.json();
    for (const result of results || []) {
      if (result?.id) analysisMap.set(result.id, result);
    }
  } catch (error) {
    console.error("Batch analysis chunk failed, using fallback text:", error);
  }
};

const fetchBatchAnalysis = async (stories: any[]): Promise<Map<string, StoryAnalysis>> => {
  const analysisMap = new Map<string, StoryAnalysis>();
  const chunks: any[][] = [];
  for (let i = 0; i < stories.length; i += ANALYSIS_CHUNK_SIZE) {
    chunks.push(stories.slice(i, i + ANALYSIS_CHUNK_SIZE));
  }
  await Promise.all(chunks.map(chunk => fetchAnalysisChunk(chunk, analysisMap)));
  return analysisMap;
};

export const fetchProcessedSignals = async (): Promise<Signal[]> => {
  try {
    const articles = await fetchArticles();
    if (articles.length === 0) return [];

    const stories = articles.map(a => ({
      id: a.id,
      title: a.title,
      summary: a.telegramAnalysis,
      sourceUrl: a.sourceUrl,
      sourceTitle: a.source,
    }));

    const analysisMap = await fetchBatchAnalysis(stories);

    return stories.map(story => mapStoryToSignal(story, analysisMap.get(story.id)));
  } catch (error) {
    console.error("Live news fetch failed, falling back to cached data:", error);
    return [];
  }
};

export interface Article {
  id: string;
  title: string;
  date: string;
  source: string;
  sourceUrl: string;
  telegramAnalysis: string;
  fullArticle: string;
}

const mockArticles: Article[] = [
  {
    id: "art_example_1",
    title: "Navigating the New Axis: India's Strategic Balancing in Eurasia",
    date: new Date().toISOString(),
    source: "GeoStrat Research",
    sourceUrl: "https://t.me/IndiaWorldIntel",
    telegramAnalysis: "India's strategic autonomy remains key as Eurasian power dynamics shift. A realist assessment of India's posture amidst the China-Russia axis.",
    fullArticle: `
# Executive Summary
The shifting axis in Eurasia presents a double-edged sword for New Delhi. As Moscow and Beijing forge closer ties, India must recalibrate its continental security posture while reinforcing its maritime partnerships.

# Strategic Implications
India's realist foreign policy is centered on multipolarity. By maintaining strategic relationships with both Russia and Western partners, India acts as a stabilizing pole. However, the depth of the China-Russia strategic partnership forces India to accelerate domestic defense modernization and diversify key supply chains.

# Economic & Resource Reality
Energy security remains the cornerstone of India's Eurasian outreach. Importing Russian crude at discounted rates has insulated the Indian economy from global inflation, but long-term transit corridors like the International North-South Transport Corridor (INSTC) must be fast-tracked to bypass volatile maritime checkpoints.

# The Path Ahead
New Delhi must continue its pragmatism—combining tactical alignment on energy with absolute deterrence on the Himalayan border. Strategic independence is not isolation; it is the freedom to choose partnerships that maximize national interest.
    `.trim()
  }
];

export const fetchArticles = async (): Promise<Article[]> => {
  try {
    const repo = 'chokoboy6266-web/geopolitical-dashboard';
    const url = `https://raw.githubusercontent.com/${repo}/main/api/articles.json`;
    const response = await fetch(url);
    if (!response.ok) {
      const localResponse = await fetch('/api/articles.json').catch(() => null);
      if (localResponse && localResponse.ok) {
        const list = await localResponse.json();
        return list.length > 0 ? list : mockArticles;
      }
      return mockArticles;
    }
    const list = await response.json();
    return list.length > 0 ? list : mockArticles;
  } catch (error) {
    console.error("Failed to fetch articles:", error);
    try {
      const localResponse = await fetch('/api/articles.json');
      if (localResponse.ok) {
        const list = await localResponse.json();
        return list.length > 0 ? list : mockArticles;
      }
    } catch {}
    return mockArticles;
  }
};

