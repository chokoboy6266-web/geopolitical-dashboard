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

export interface Signal {
  id: string;
  summary: string;
  riskScore: number;
  whyItMatters: string;
  whatToWatch: string;
  isNoise: boolean;
  imageUrl?: string;
  context: ContextLayer;
  xContent: XContent;
  intelligence: IntelligenceLayer;
  voices: VoicesLayer;
}

const liveSweepSignals: Signal[] = [
  {
    id: "live-1",
    summary: "Strait of Hormuz Crisis: U.S. Navy Begins Naval Escorts",
    riskScore: 9,
    whyItMatters: "Direct intervention by the U.S. Navy to protect energy transit significantly increases the risk of kinetic friction with regional forces.",
    whatToWatch: "Naval engagement rules of encounter and retaliatory drone deployments.",
    isNoise: false,
    context: {
      region: "Middle East",
      involvedCountries: ["USA", "Iran", "Saudi Arabia"],
      historicalContext: "Persistent disruptions in the world's most critical oil chokepoint.",
      existingTensions: "Long-standing blockade threats.",
      isoAlpha3: ["USA", "IRN", "SAU"],
      coordinates: { lat: 26.5, lng: 56.2 }
    },
    intelligence: {
      confidenceScore: 9,
      whatChanged: "New: U.S. Navy shift from monitoring to active escorting.",
      secondOrderImpact: {
        economic: "High volatility in Brent crude; spike in maritime insurance.",
        political: "Urgent UNSC consultations.",
        strategic: "Accelerated deployment of autonomous naval strike groups."
      }
    },
    xContent: { shortPost: "", thread: [] },
    voices: {
      perspectives: {
        strategic: "Shift from containment to active projection of power; redefines maritime security rules in the Persian Gulf.",
        economic: "Heightened risk of supply chain decoupling if kinetic friction leads to prolonged chokepoint closures.",
        risk: "Direct naval escorting drastically lowers the threshold for accidental escalation between state actors."
      },
      keyTakeaway: "A calculated military escalation intended to preserve trade flow, but one that invites asymmetrical responses.",
      externalCommentary: [
        {
          author: "@MaritimeIntel",
          excerpt: "US Navy escorts in Hormuz are a massive signal. Insurance rates will skyrocket before they stabilize.",
          url: "https://x.com/MaritimeIntel/status/1"
        },
        {
          author: "@GlobalOilWatch",
          excerpt: "Energy markets are pricing in a 20% risk of total blockage. This is the new baseline.",
          url: "https://x.com/GlobalOilWatch/status/2"
        }
      ]
    }
  },
  {
    id: "live-2",
    summary: "NATO Shift: Pentagon Confirms Germany Troop Withdrawal",
    riskScore: 8,
    whyItMatters: "The removal of 5,000 U.S. troops creates a security vacuum in Central Europe.",
    whatToWatch: "Polish and Baltic responses; potential bilateral security pacts.",
    isNoise: false,
    context: {
      region: "Europe",
      involvedCountries: ["Germany", "USA", "Poland"],
      historicalContext: "Post-WWII security architecture built on U.S. presence.",
      existingTensions: "European Strategic Autonomy vs. U.S. pivots.",
      isoAlpha3: ["DEU", "USA", "POL"],
      coordinates: { lat: 51.1, lng: 10.4 }
    },
    intelligence: {
      confidenceScore: 8,
      whatChanged: "Confirmed timeline: Withdrawal to complete within 6-12 months.",
      secondOrderImpact: {
        economic: "Decline in localized service economies.",
        political: "Weakening of Berlin's leverage.",
        strategic: "Russia likely to interpret this as a reduction in deterrence."
      }
    },
    xContent: { shortPost: "", thread: [] },
    voices: {
      perspectives: {
        strategic: "Signals a pivot from static European defense to dynamic global troop allocation; weakens NATO's eastern cohesion.",
        economic: "Localized economic contraction in base regions; shift in defense spending toward Eastern European hubs.",
        risk: "Creates a 'deterrence gap' that regional adversaries may test through gray-zone operations."
      },
      keyTakeaway: "The end of the post-WWII security status quo in Germany, forcing Europe toward strategic autonomy.",
      externalCommentary: [
        {
          author: "@EuroDefenseAnalyst",
          excerpt: "The Germany withdrawal is a wake-up call for EU defense. The 'umbrella' is folding.",
          url: "https://x.com/EuroDefenseAnalyst/status/3"
        }
      ]
    }
  },
  {
    id: "live-3",
    summary: "Digital Cold War: China Blocks Meta Expansion in Singapore",
    riskScore: 7,
    whyItMatters: "Ownership of AI talent and data is now a matter of national sovereignty.",
    whatToWatch: "Retaliatory blocks on Chinese AI startups by Western tech regulators.",
    isNoise: false,
    context: {
      region: "Southeast Asia",
      involvedCountries: ["China", "Singapore", "USA"],
      historicalContext: "The 'Splinternet' continues to fracture.",
      existingTensions: "AI supremacy race between Silicon Valley and Beijing.",
      isoAlpha3: ["CHN", "SGP", "USA"],
      coordinates: { lat: 1.35, lng: 103.8 }
    },
    intelligence: {
      confidenceScore: 9,
      whatChanged: "New: Direct state intervention in AI talent acquisition.",
      secondOrderImpact: {
        economic: "Chilling effect on M&A in AI startups.",
        political: "Singapore caught in a 'technological neutral' tightrope.",
        strategic: "Creation of separate Western/Chinese AI ecosystems."
      }
    },
    xContent: { shortPost: "", thread: [] },
    voices: {
      perspectives: {
        strategic: "Formalization of technological sovereignty; AI talent is the new 'oil' of national security.",
        economic: "Fragmented markets for AI services; increased cost of compliance for multinational tech firms.",
        risk: "Escalation of the 'Digital Iron Curtain' increases the risk of tit-for-tat regulatory warfare."
      },
      keyTakeaway: "AI is no longer a commercial asset but a primary instrument of state power and control.",
      externalCommentary: [
        {
          author: "@TechGeopolitics",
          excerpt: "Singapore is the first major battleground for AI talent sovereignty. Expect more blocks soon.",
          url: "https://x.com/TechGeopolitics/status/4"
        }
      ]
    }
  },
  {
    id: "live-4",
    summary: "Economic Shock: Dubai Airport Reports 66% Traffic Drop",
    riskScore: 8,
    whyItMatters: "Signals a total collapse in regional logistics and tourism connectivity due to ongoing missile threats.",
    whatToWatch: "Bankruptcy risks for major regional carriers and emergency debt restructuring.",
    isNoise: false,
    context: {
      region: "Middle East",
      involvedCountries: ["UAE", "Qatar", "Saudi Arabia"],
      historicalContext: "Dubai is the world's busiest international hub.",
      existingTensions: "Regional conflict spillover into civil infrastructure.",
      isoAlpha3: ["ARE", "QAT", "SAU"],
      coordinates: { lat: 25.2, lng: 55.3 }
    },
    intelligence: {
      confidenceScore: 10,
      whatChanged: "Deterioration: Traffic decline accelerated by 20% this week.",
      secondOrderImpact: {
        economic: "Massive shortfall in regional non-oil GDP.",
        political: "Increased pressure on UAE to mediate a ceasefire.",
        strategic: "Permanent shift in global transit routes toward Central Asian corridors."
      }
    },
    xContent: { shortPost: "", thread: [] },
    voices: {
      perspectives: {
        strategic: "Vulnerability of global transit hubs to low-cost precision strikes; redefines 'safe haven' status in the Gulf.",
        economic: "Severe disruption to the 'hub-and-spoke' aviation model; long-term damage to Dubai's tourism brand.",
        risk: "High risk of regional capital flight if missile threats transition from occasional to persistent."
      },
      keyTakeaway: "The 'safe' status of global financial hubs is being eroded by regional kinetic spillover.",
      externalCommentary: [
        {
          author: "@AviationInsider",
          excerpt: "66% drop in DXB traffic is unprecedented. The global aviation map is being rewritten.",
          url: "https://x.com/AviationInsider/status/5"
        }
      ]
    }
  },
  {
    id: "live-5",
    summary: "Diplomatic Channel: Pakistan Mediates 14-Point Ceasefire Plan",
    riskScore: 6,
    whyItMatters: "First credible path to de-escalation in the Iran-US standoff, though hardliners on both sides remain skeptical.",
    whatToWatch: "Reaction from the U.S. State Department and Tehran's Supreme Leader in the next 24 hours.",
    isNoise: false,
    context: {
      region: "Central Asia / Middle East",
      involvedCountries: ["Pakistan", "Iran", "USA"],
      historicalContext: "Pakistan has long acted as a backchannel for US-Iran talks.",
      existingTensions: "Mutual distrust following recent retaliatory strikes.",
      isoAlpha3: ["PAK", "IRN", "USA"],
      coordinates: { lat: 30.3, lng: 69.3 }
    },
    intelligence: {
      confidenceScore: 7,
      whatChanged: "New: Formal submission of written terms for the first time in 6 months.",
      secondOrderImpact: {
        economic: "Temporary cooling of oil price futures.",
        political: "Boost to Pakistan's regional diplomatic standing.",
        strategic: "Potential opening for a 'Grand Bargain' on regional security."
      }
    },
    xContent: { shortPost: "", thread: [] },
    voices: {
      perspectives: {
        strategic: "Test of Pakistan's ability to act as a neutral arbiter; potential opening for regional de-escalation.",
        economic: "Potential for stabilization of regional energy prices if ceasefire holds.",
        risk: "High fragility; single kinetic event could collapse the 14-point framework immediately."
      },
      keyTakeaway: "A fragile but necessary diplomatic 'off-ramp' in a period of high-intensity friction.",
      externalCommentary: [
        {
          author: "@DiplomacyToday",
          excerpt: "The 14-point plan is the most detailed Pakistan has ever proposed. Real stakes here.",
          url: "https://x.com/DiplomacyToday/status/6"
        }
      ]
    }
  },
  {
    id: "live-6",
    summary: "Military Alert: Nakba Day Mobilization Warnings Issued",
    riskScore: 9,
    whyItMatters: "Historically a high-tension period; current regional wars make the May 15-16 window a 'critical danger' zone for kinetic spillover.",
    whatToWatch: "Troop movements along the Blue Line (Lebanon) and internal security measures in Israel.",
    isNoise: false,
    context: {
      region: "Middle East",
      involvedCountries: ["Israel", "Lebanon", "Jordan", "Iran"],
      historicalContext: "Annual commemorations often result in clashes.",
      existingTensions: "Highest level of regional mobilization since 1973.",
      isoAlpha3: ["ISR", "LBN", "JOR", "IRN"],
      coordinates: { lat: 31.7, lng: 35.2 }
    },
    intelligence: {
      confidenceScore: 8,
      whatChanged: "Escalation: Intelligence indicators suggest pre-planned coordinate strikes.",
      secondOrderImpact: {
        economic: "Total shutdown of tourism and business travel to the Levant.",
        political: "Risk of internal destabilization in bordering monarchies.",
        strategic: "Requirement for full-scale regional air defense readiness."
      }
    },
    xContent: { shortPost: "", thread: [] },
    voices: {
      perspectives: {
        strategic: "Convergence of historical grievances with modern kinetic capabilities; creates a 'perfect storm' for escalation.",
        economic: "Complete halt of regional infrastructure investment; total loss of insurance coverage for the Levant.",
        risk: "Highest risk of full-scale regional war since 1973; requires immediate high-level mediation."
      },
      keyTakeaway: "A critical temporal window where symbolic tension meets maximum military mobilization.",
      externalCommentary: [
        {
          author: "@LevantMonitor",
          excerpt: "Mobilization levels are off the charts. This May 15th window is the most dangerous in decades.",
          url: "https://x.com/LevantMonitor/status/7"
        }
      ]
    }
  },
  {
    id: "live-7",
    summary: "Victory Day Readiness: Russia Prepares 2026 Moscow Parade",
    riskScore: 7,
    whyItMatters: "Will be used to signal military resilience and showcase new autonomous systems despite ongoing sanctions.",
    whatToWatch: "Presence of high-level international observers from the BRICS+ bloc.",
    isNoise: false,
    context: {
      region: "Europe / Russia",
      involvedCountries: ["Russia", "Ukraine", "China"],
      historicalContext: "Victory Day is the primary symbol of Russian military nationalism.",
      existingTensions: "Ongoing conflict in Ukraine and Western isolation.",
      isoAlpha3: ["RUS", "UKR", "CHN"],
      coordinates: { lat: 55.7, lng: 37.6 }
    },
    intelligence: {
      confidenceScore: 9,
      whatChanged: "Shift: High emphasis on 'Strategic Partnership' themes with the Global South.",
      secondOrderImpact: {
        economic: "Signaling of a long-term 'War Economy' transition.",
        political: "Consolidation of domestic support for protracted conflict.",
        strategic: "Display of new 'Gray Zone' tech capabilities."
      }
    },
    xContent: { shortPost: "", thread: [] },
    voices: {
      perspectives: {
        strategic: "Projection of 'fortress resilience' to a domestic and Global South audience; signals multi-year conflict readiness.",
        economic: "Full transition to a war economy; dependency on shadow fleets and non-Western financial rails.",
        risk: "Normalization of long-term conflict reduces the pressure for immediate diplomatic resolution."
      },
      keyTakeaway: "The 2026 parade is a strategic messaging tool to signal endurance over immediate victory.",
      externalCommentary: [
        {
          author: "@RussiaPolitics",
          excerpt: "The shift to autonomous systems in this parade is the main story. Sanctions haven't stopped tech dev.",
          url: "https://x.com/RussiaPolitics/status/8"
        }
      ]
    }
  }
];

export const fetchProcessedSignals = async (): Promise<Signal[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(liveSweepSignals);
    }, 1200);
  });
};
