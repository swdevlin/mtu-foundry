import {
  ATMOSPHERE,
  BIODIVERSITY,
  BIOCOMPLEXITY,
  GOV_AUTHORITY,
  GOV_CENTRALISATION,
  GOV_STRUCTURE,
  GOVERNMENT,
  HYDRO_DISTRIBUTION,
  JUDICIAL_SYSTEM,
  LAW_UNIFORMITY,
  LAW_WEAPONS,
  POPULATION,
  POPULATION_CONCENTRATION,
  RESOURCE_RATING,
  STARPORT,
  TECH_LEVEL,
} from "./mtu-lookups.js";

const MODULE_ID = "my-traveller-universe";

export function getApiKey() {
  return game.settings.get(MODULE_ID, "apiKey");
}

export function buildHeaders({ includeAuth = false } = {}) {
  const headers = { Accept: "application/json" };
  if (includeAuth) {
    const apiKey = getApiKey();
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

export function parseStellarObjectInput(input, defaultSlug) {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    if (!defaultSlug) throw new Error("Enter a full URL or set the campaign slug in module settings.");
    return { campaignSlug: defaultSlug, resourceId: trimmed };
  }
  const url = new URL(trimmed);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "c" || parts[2] !== "stellar_objects") {
    throw new Error("URL does not look like a stellar object URL.");
  }
  return { campaignSlug: parts[1], resourceId: parts[3].replace(/\.json$/, "") };
}

export function buildStellarObjectUrl(campaignSlug, resourceId) {
  return `https://mytravelleruniverse.net/c/${campaignSlug}/api/stellar_objects/${resourceId}`;
}

export async function fetchStellarObject(campaignSlug, resourceId) {
  const url = buildStellarObjectUrl(campaignSlug, resourceId);
  const response = await fetch(url, {
    headers: buildHeaders({ includeAuth: true }),
    credentials: "omit",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching stellar object ${resourceId}`);
  return response.json();
}

export function formatJumpShadowTime(hours) {
  if (hours >= 24) return `${(hours / 24).toFixed(1)}d`;
  return `${hours.toFixed(1)}h`;
}

function humaniseType(type) {
  return type.replace(/([A-Z])/g, " $1").trim();
}

function fmt(n, decimals = 2) {
  return Number(n).toFixed(decimals);
}

function snakeToTitle(str) {
  return String(str)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildPlayerData(payload) {
  const sp = STARPORT[payload.starport_code] ?? {};
  const atm = ATMOSPHERE[payload.atmosphere?.code] ?? {};
  const pop = POPULATION[payload.population?.code] ?? "—";
  const gov = GOVERNMENT[payload.government?.code] ?? "—";
  const law = LAW_WEAPONS[payload.law_level?.code] ?? "—";
  const tl  = TECH_LEVEL[payload.tech_level_code] ?? {};

  const starportValue = sp.description
    ? `${payload.starport_code} — ${sp.description}; ${sp.fuel}; ${sp.facilities}`
    : payload.starport_code ?? "—";

  return {
    name: payload.name,
    type: humaniseType(payload.type ?? ""),
    profile: [
      { label: "UWP",            value: payload.uwp ?? "—" },
      { label: "Starport",       value: starportValue },
      { label: "Gravity",        value: `${fmt(payload.gravity)} g` },
      { label: "Temperature",    value: `${Math.round(payload.temperature - 273.15)}°C` },
      { label: "Survival Req.",  value: atm.survivalReq ?? "—" },
      { label: "Population",     value: `${payload.population?.code} — ${pop}` },
      { label: "Government",     value: `${payload.government?.code} — ${gov}` },
      { label: "Law Level",      value: `${payload.law_level?.code} — ${law}` },
      { label: "Tech Level",     value: `${payload.tech_level_code} — ${tl.era ?? "—"}` },
      { label: "Native Sophont", value: payload.native_sophont ? "Yes" : "None" },
    ],
    jumpShadow: buildJumpShadowTimes(payload),
    location: {
      orbiting:   payload.orbiting_name ?? "—",
      starSystem: payload.star_system_name ?? "—",
      subsector:  payload.subsector_name ?? "—",
      sector:     `${payload.sector_name ?? "—"} · ${payload.hex ?? ""}`,
    },
  };
}

export function buildGmData(payload) {
  const player = buildPlayerData(payload);
  const js = payload.jump_shadow ?? {};
  const eco = payload.economics ?? {};
  const tl = TECH_LEVEL[payload.tech_level_code] ?? {};

  return {
    ...player,

    orbital: [
      { label: "Hex",              value: payload.hex ?? "—" },
      { label: "Orbit",            value: fmt(payload.orbit, 2) },
      { label: "AU",               value: `${fmt(payload.au, 4)} AU` },
      { label: "Period",           value: `${fmt(payload.period, 1)} d` },
      { label: "HZCO Deviation",   value: fmt(payload.effective_hzco_deviation, 2) },
      { label: "Retrograde",       value: payload.retrograde ? "Yes" : "No" },
      { label: "Inclination",      value: `${fmt(payload.inclination, 1)}°` },
      { label: "Eccentricity",     value: fmt(payload.eccentricity, 2) },
      { label: "Tidally Locked",   value: payload.tidal_lock || "No" },
      { label: "Sidereal Day",     value: `${fmt(payload.sidereal_day, 2)} hours` },
      { label: "Twilight Zone",    value: payload.twilight_zone ? "Yes" : "No" },
    ],

    jumpShadowDetail: {
      distanceKm: js.distance_km != null ? Number(js.distance_km).toLocaleString() : "—",
      sourceName: js.source_name ?? "—",
      times: buildJumpShadowTimes(payload),
    },

    starport: [
      { label: "Starport",           value: `${payload.starport_code} — ${STARPORT[payload.starport_code]?.description ?? "—"}` },
      { label: "Fuel",               value: STARPORT[payload.starport_code]?.fuel ?? "—" },
      { label: "Facilities",         value: STARPORT[payload.starport_code]?.facilities ?? "—" },
      { label: "World Trade Number", value: eco.world_trade_number ?? "—" },
      { label: "Importance",         value: eco.importance != null ? (eco.importance > 0 ? `+${eco.importance}` : String(eco.importance)) : "—" },
      { label: "Development Score",  value: eco.development_score != null ? fmt(eco.development_score, 1) : "—" },
      { label: "Per Capita GWP",     value: eco.per_capita_gwp != null ? `${Number(eco.per_capita_gwp).toLocaleString()} Cr` : "—" },
      { label: "Total GWP",          value: eco.total_gwp != null ? formatGwp(eco.total_gwp) : "—" },
      { label: "Infrastructure",     value: eco.infrastructure ?? "—" },
      { label: "Resource Units",     value: eco.resource_units ?? "—" },
      { label: "Resource Factor",    value: eco.resource_factor ?? "—" },
      { label: "Labour Factor",      value: eco.labour_factor ?? "—" },
      { label: "Efficiency",         value: eco.efficiency ?? "—" },
      { label: "Inequality Rating",  value: eco.inequality_rating ?? "—" },
      { label: "Tariff Regime",      value: eco.tariffs?.regime != null ? snakeToTitle(eco.tariffs.regime) : "—" },
      { label: "Tariff Rate",        value: eco.tariffs?.rate != null ? `${eco.tariffs.rate}%` : "—" },
    ],

    physical: [
      { label: "Diameter",  value: payload.diameter != null ? `${payload.size_code} — ${Number(payload.diameter).toLocaleString()} km` : "—" },
      { label: "Mass",      value: payload.mass != null ? `${fmt(payload.mass, 2)} M⊕` : "—" },
      { label: "Gravity",   value: `${fmt(payload.gravity, 2)} g` },
      { label: "Density",   value: payload.density != null ? `${fmt(payload.density, 2)} ρ⊕` : "—" },
    ],

    environmental: [
      { label: "Temperature",  value: `${Math.round(payload.temperature - 273.15)}°C` },
      { label: "Rotation",     value: `${fmt(payload.rotation, 2)} hours` },
      { label: "Axial Tilt",   value: `${fmt(payload.axial_tilt, 1)}°` },
      { label: "Albedo",       value: fmt(payload.albedo, 2) },
      { label: "Greenhouse",   value: fmt(payload.greenhouse, 2) },
    ],

    atmosphere: [
      { label: "Atmosphere", value: payload.atmosphere?.code != null
          ? `${payload.atmosphere.code} — ${ATMOSPHERE[payload.atmosphere.code]?.description ?? "—"}`
          : "—" },
    ],

    hydrographics: (() => {
      const h = payload.hydrographics ?? {};
      return [
        { label: "Hydrographics", value: h.code != null ? `${h.code} — ${hydroRange(h.code)}` : "—" },
        { label: "Liquid",        value: h.liquid ?? "—" },
        { label: "Distribution",  value: h.distribution != null
            ? `${h.distribution} — ${HYDRO_DISTRIBUTION[h.distribution] ?? "—"}`
            : "—" },
      ];
    })(),

    population: (() => {
      const p = payload.population ?? {};
      return [
        { label: "Population",          value: `${p.code} — ${POPULATION[p.code] ?? "—"}` },
        { label: "Concentration",       value: p.concentration_rating != null ? `${p.concentration_rating} — ${POPULATION_CONCENTRATION[p.concentration_rating] ?? "—"}` : "—" },
        { label: "Urbanisation",        value: p.urbanization_percentage != null ? `${p.urbanization_percentage}%` : "—" },
        { label: "Major Cities",        value: p.major_cities ?? "—" },
        { label: "Major City Population", value: p.major_city_population != null ? Number(p.major_city_population).toLocaleString() : "—" },
        { label: "Native Sophont",      value: payload.native_sophont ? "Yes" : "No" },
        { label: "Extinct Sophont",     value: payload.extinct_sophont ? "Yes" : "No" },
        { label: "Diversity",           value: fmtDm(p.diversity) },
        { label: "Xenophilia",          value: fmtDm(p.xenophilia) },
        { label: "Uniqueness",          value: fmtDm(p.uniqueness) },
        { label: "Symbology",           value: fmtDm(p.symbology) },
        { label: "Cohesion",            value: fmtDm(p.cohesion) },
        { label: "Progressiveness",     value: fmtDm(p.progressiveness) },
        { label: "Expansionism",        value: fmtDm(p.expansionism) },
        { label: "Militancy",           value: fmtDm(p.militancy) },
        { label: "Habitability Rating", value: payload.habitability_rating ?? "—" },
        { label: "Biomass Rating",      value: payload.biomass_rating ?? "—" },
        { label: "Biodiversity Rating", value: payload.biodiversity_rating != null
            ? `${payload.biodiversity_rating} — ${BIODIVERSITY[payload.biodiversity_rating] ?? "—"}`
            : "—" },
        { label: "Biocomplexity Rating", value: payload.biocomplexity_rating != null
            ? `${payload.biocomplexity_rating} — ${BIOCOMPLEXITY[payload.biocomplexity_rating] ?? "—"}`
            : "—" },
        { label: "Resource Rating",     value: payload.resource_rating != null
            ? `${payload.resource_rating} — ${RESOURCE_RATING[payload.resource_rating] ?? "—"}`
            : "—" },
      ];
    })(),

    government: (() => {
      const g = payload.government ?? {};
      const s = g.structure ?? {};
      return [
        { label: "Government",            value: `${g.code} — ${GOVERNMENT[g.code] ?? "—"}` },
        { label: "Description",           value: GOVERNMENT[g.code] ?? "—" },
        { label: "Judicial Structure",    value: s.judicial ? `${s.judicial} — ${GOV_STRUCTURE[s.judicial] ?? "—"}` : "—" },
        { label: "Executive Structure",   value: s.executive ? `${s.executive} — ${GOV_STRUCTURE[s.executive] ?? "—"}` : "—" },
        { label: "Legislative Structure", value: s.legislative ? `${s.legislative} — ${GOV_STRUCTURE[s.legislative] ?? "—"}` : "—" },
        { label: "Authority",             value: g.authority ? `${g.authority} — ${GOV_AUTHORITY[g.authority] ?? "—"}` : "—" },
        { label: "Centralisation",        value: g.centralisation ? `${g.centralisation} — ${GOV_CENTRALISATION[g.centralisation] ?? "—"}` : "—" },
      ];
    })(),

    lawLevel: (() => {
      const l = payload.law_level ?? {};
      return [
        { label: "Law Level",                        value: `${l.code}` },
        { label: "Weapons & Armour",                 value: LAW_WEAPONS[l.code] ?? "—" },
        { label: "Criminal Law",                     value: l.criminal_law ?? "—" },
        { label: "Economic Law",                     value: l.economic_law ?? "—" },
        { label: "Private Law",                      value: l.private_law ?? "—" },
        { label: "Personal Rights",                  value: l.personal_rights ?? "—" },
        { label: "Law Uniformity",                   value: l.uniformity ? `${l.uniformity} — ${LAW_UNIFORMITY[l.uniformity] ?? "—"}` : "—" },
        { label: "Judicial System",                  value: l.judicial_system ? `${l.judicial_system} — ${JUDICIAL_SYSTEM[l.judicial_system] ?? "—"}` : "—" },
        { label: "Death Penalty",                    value: l.death_penalty ? "Yes" : "No" },
        { label: "Presumed Innocence",               value: l.presumed_innocence ? "Yes" : "No" },
        { label: "Econometric Infractions Admin.",   value: l.econometric_infractions_administrative ? "Yes" : "No" },
      ];
    })(),

    techLevel: [
      { label: "Tech Level",       value: `${payload.tech_level_code} — ${tl.era ?? "—"}` },
      { label: "Era",              value: tl.era ?? "—" },
      { label: "Electronics",      value: tl.electronics ?? "—" },
      { label: "Energy",           value: tl.energy ?? "—" },
      { label: "Land",             value: tl.land ?? "—" },
      { label: "Air",              value: tl.air ?? "—" },
      { label: "Space",            value: tl.space ?? "—" },
      { label: "Personal military", value: tl.personalMilitary ?? "—" },
      { label: "Heavy military",   value: tl.heavyMilitary ?? "—" },
      { label: "Manufacturing",    value: tl.manufacturing ?? "—" },
      { label: "Medical",          value: tl.medical ?? "—" },
      { label: "Environmental",    value: tl.environmental ?? "—" },
    ],
  };
}

function buildJumpShadowTimes(payload) {
  const times = payload.jump_shadow?.travel_times;
  if (!times) return null;
  return Object.entries(times).map(([g, h]) => ({
    g: g.toUpperCase(),
    value: formatJumpShadowTime(h),
  }));
}

function fmtDm(n) {
  if (n == null) return "—";
  const dm = n - 7;
  const dmStr = dm > 0 ? `DM +${dm}` : dm < 0 ? `DM ${dm}` : "DM ±0";
  return `${n} (${dmStr})`;
}

function hydroRange(code) {
  const ranges = {
    0: "No free standing water",
    1: "1%–5%",
    2: "6%–15%",
    3: "16%–25%",
    4: "26%–35%",
    5: "36%–45%",
    6: "46%–55%",
    7: "66%–75%",
    8: "76%–85%",
    9: "86%–95%",
    10: "96%–100%",
  };
  return ranges[code] ?? "—";
}

function formatGwp(value) {
  if (value >= 1e12) return `${(value / 1e12).toFixed(0)} Tr`;
  if (value >= 1e9)  return `${(value / 1e9).toFixed(0)} Bn`;
  if (value >= 1e6)  return `${(value / 1e6).toFixed(0)} Mn`;
  return `${Number(value).toLocaleString()} Cr`;
}

export { MODULE_ID };
