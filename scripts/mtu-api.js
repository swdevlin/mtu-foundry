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

/* ── Star system URL / fetch ────────────────────────────────── */

export function parseStarSystemInput(input, defaultSlug) {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    if (!defaultSlug) throw new Error(game.i18n.localize("MTU.error.needCampaignSlug"));
    return { campaignSlug: defaultSlug, resourceId: trimmed };
  }
  const url = new URL(trimmed);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "c" || parts[2] !== "star_systems") {
    throw new Error(game.i18n.localize("MTU.error.invalidUrl"));
  }
  return { campaignSlug: parts[1], resourceId: parts[3].replace(/\.json$/, "") };
}

export function buildStarSystemUrl(campaignSlug, resourceId) {
  return `https://mytravelleruniverse.net/c/${campaignSlug}/api/star_systems/${resourceId}`;
}

export async function fetchStarSystem(campaignSlug, resourceId) {
  const url = buildStarSystemUrl(campaignSlug, resourceId);
  const response = await fetch(url, {
    headers: buildHeaders({ includeAuth: true }),
    credentials: "omit",
  });
  if (!response.ok) throw new Error(game.i18n.format("MTU.error.fetchHttpError", { status: response.status, id: resourceId }));
  return response.json();
}

/* ── Subsector URL / fetch ──────────────────────────────────── */

export function isSubsectorInput(input) {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return false;
  try {
    const parts = new URL(trimmed).pathname.split("/").filter(Boolean);
    return parts.includes("subsectors");
  } catch {
    return false;
  }
}

export function parseSubsectorInput(input, defaultSlug) {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    if (!defaultSlug) throw new Error(game.i18n.localize("MTU.error.needCampaignSlug"));
    return { campaignSlug: defaultSlug, resourceId: trimmed };
  }
  const url = new URL(trimmed);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("subsectors");
  if (parts[0] !== "c" || idx === -1) {
    throw new Error(game.i18n.localize("MTU.error.invalidSubsectorUrl"));
  }
  return { campaignSlug: parts[1], resourceId: parts[idx + 1]?.replace(/\.json$/, "") };
}

export function buildSubsectorUrl(campaignSlug, resourceId) {
  return `https://mytravelleruniverse.net/c/${campaignSlug}/api/subsectors/${resourceId}`;
}

export async function fetchSubsector(campaignSlug, resourceId) {
  const url = buildSubsectorUrl(campaignSlug, resourceId);
  const response = await fetch(url, {
    headers: buildHeaders({ includeAuth: true }),
    credentials: "omit",
  });
  if (!response.ok) throw new Error(game.i18n.format("MTU.error.fetchHttpError", { status: response.status, id: resourceId }));
  return response.json();
}

/* ── System context & normalization ────────────────────────── */

export function buildSystemContext(system) {
  const hex = String(system.x ?? 0).padStart(2, "0") + String(system.y ?? 0).padStart(2, "0");
  const sectorName = system.sector_name ?? "—";
  return {
    sector_name:      sectorName,
    hex,
    star_system_name: system.name || `${sectorName} ${hex}`.trim() || `System ${system.id}`,
    subsector_name:   system.subsector_name ?? "—",
  };
}

// Maps a stellar body embedded in a star system response to the flat shape
// expected by buildPlayerData / buildGmData.
export function normalizeBodyPayload(body, systemContext) {
  return {
    name:             body.name ?? null,
    type:             body.type ?? "",
    uwp:              body.uwp ?? "—",
    starport_code:    body.starport_code ?? "X",
    size_code:        body.size ?? "—",
    tech_level_code:  body.tech_level?.code ?? 0,

    atmosphere:    body.atmosphere ?? {},
    population:    body.population ?? {},
    government:    body.government ?? {},
    law_level:     body.law_level ?? {},
    hydrographics: body.hydrographics ?? {},

    gravity:       body.gravity ?? 0,
    temperature:   body.temperature ?? 273.15,
    diameter:      body.diameter ?? null,
    mass:          body.mass ?? null,
    density:       body.density ?? null,
    rotation:      body.rotation ?? null,
    axial_tilt:    body.axial_tilt ?? null,
    albedo:        body.albedo ?? null,
    greenhouse:    body.greenhouse ?? null,
    retrograde:    body.retrograde ?? false,
    tidal_lock:    body.tidal_lock ?? null,
    twilight_zone: body.twilight_zone ?? false,
    eccentricity:  body.eccentricity ?? null,
    inclination:   body.inclination ?? null,
    sidereal_day:  body.sidereal_day ?? null,

    native_sophont:       body.native_sophont ?? false,
    extinct_sophont:      body.extinct_sophont ?? false,
    habitability_rating:  body.habitability_rating ?? null,
    biomass_rating:       body.biomass_rating ?? null,
    biodiversity_rating:  body.biodiversity_rating ?? null,
    biocomplexity_rating: body.biocomplexity_rating ?? null,
    resource_rating:      body.resource_rating ?? null,

    orbit:                    body.orbit ?? null,
    au:                       body.au ?? null,
    period:                   body.period ?? null,
    effective_hzco_deviation: body.effective_hzco_deviation ?? null,

    // Not available on embedded bodies; templates guard with {{#if ...}}
    jump_shadow: null,
    economics:   null,

    sector_name:      systemContext.sector_name,
    hex:              systemContext.hex,
    star_system_name: systemContext.star_system_name,
    subsector_name:   systemContext.subsector_name ?? "—",
    orbiting_name:    systemContext.orbiting_name ?? "—",
  };
}

export function findMainWorld(system) {
  const targetUwp = system.main_world?.uwp;
  if (!targetUwp) return null;
  for (const body of system.primary_star?.stellar_objects ?? []) {
    if (body.uwp === targetUwp) return body;
    for (const moon of body.moons ?? []) {
      if (moon.uwp === targetUwp) return moon;
    }
  }
  return null;
}

/* ── Overview page data ─────────────────────────────────────── */

export function buildOverviewData(system) {
  const ctx = buildSystemContext(system);
  const star = system.primary_star ?? {};
  const primaryStar = star.stellar_type
    ? `${star.stellar_type}${star.stellar_subtype ?? ""} ${star.stellar_class ?? ""}`.trim()
    : "—";

  return {
    systemName:    ctx.star_system_name,
    sector:        `${ctx.sector_name} · ${ctx.hex}`,
    subsector:     ctx.subsector_name,
    remarks:       system.remarks ?? "",
    mainWorldUwp:  system.main_world?.uwp ?? "—",
    mainWorldName: system.main_world?.name || game.i18n.localize("MTU.value.unnamed"),
    primaryStar,
    counts: {
      stars:       system.star_count ?? 0,
      gasGiants:   system.gas_giant_count ?? 0,
      terrestrial: system.terrestrial_count ?? 0,
      belts:       system.belt_count ?? 0,
    },
    bodies: buildBodyList(system),
  };
}

function buildBodyList(system) {
  return (system.primary_star?.stellar_objects ?? []).map((body) => ({
    label:    body.orbit_sequence ?? "—",
    type:     humaniseType(body.type ?? ""),
    uwp:      body.uwp ?? null,
    orbit:    body.au != null ? `${Number(body.au).toFixed(3)} AU` : "—",
    moons:    body.moons?.length ?? 0,
    safeJump: body.safe_jump_time ?? "—",
  }));
}

/* ── Transit page data ──────────────────────────────────────── */

// 1G = 10 m/s² = 0.01 km/s² (standard Traveller approximation)
// orbit_position values are in km
export function calcTransitHours(d_km, mDrive) {
  if (d_km <= 0) return 0;
  const accel = mDrive * 0.01;
  return 2 * Math.sqrt(d_km / accel) / 3600;
}

export function formatTransitTime(hours) {
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function buildTransitData(system, mDrive) {
  const star = system.primary_star ?? {};
  const starLabel = star.stellar_type
    ? `${star.stellar_type}${star.stellar_subtype ?? ""} ${star.stellar_class ?? ""}`.trim()
    : game.i18n.localize("MTU.transit.star");

  const nodes = [{ label: starLabel, x: 0, y: 0 }];

  for (const body of star.stellar_objects ?? []) {
    const pos = body.orbit_position ?? {};
    nodes.push({ label: body.orbit_sequence ?? "—", x: pos.x ?? 0, y: pos.y ?? 0 });
    for (const moon of body.moons ?? []) {
      const mpos = moon.orbit_position ?? {};
      nodes.push({ label: moon.orbit_sequence ?? "—", x: mpos.x ?? 0, y: mpos.y ?? 0 });
    }
  }

  const rows = nodes.map((from, i) => ({
    label: from.label,
    cells: nodes.map((to, j) => {
      if (i === j) return { value: "—", self: true };
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      const d_km = Math.sqrt(dx * dx + dy * dy);
      return { value: formatTransitTime(calcTransitHours(d_km, mDrive)), self: false };
    }),
  }));

  return { mDrive, headers: nodes.map((n) => n.label), rows };
}

/* ── Player / GM data builders (unchanged) ──────────────────── */

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

function yes() { return game.i18n.localize("MTU.value.yes"); }
function no()  { return game.i18n.localize("MTU.value.no");  }
function none(){ return game.i18n.localize("MTU.value.none"); }

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
      { label: "MTU.label.uwp",          value: payload.uwp ?? "—" },
      { label: "MTU.label.starport",      value: starportValue },
      { label: "MTU.label.gravity",       value: `${fmt(payload.gravity)} g` },
      { label: "MTU.label.temperature",   value: `${Math.round(payload.temperature - 273.15)}°C` },
      { label: "MTU.label.survivalReq",   value: atm.survivalReq ?? "—" },
      { label: "MTU.label.population",    value: `${payload.population?.code} — ${pop}` },
      { label: "MTU.label.government",    value: `${payload.government?.code} — ${gov}` },
      { label: "MTU.label.lawLevel",      value: `${payload.law_level?.code} — ${law}` },
      { label: "MTU.label.techLevel",     value: `${payload.tech_level_code} — ${tl.era ?? "—"}` },
      { label: "MTU.label.nativeSophont", value: payload.native_sophont ? yes() : none() },
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
      { label: "MTU.label.hex",          value: payload.hex ?? "—" },
      { label: "MTU.label.orbit",        value: fmt(payload.orbit, 2) },
      { label: "MTU.label.au",           value: `${fmt(payload.au, 4)} AU` },
      { label: "MTU.label.period",       value: `${fmt(payload.period, 1)} d` },
      { label: "MTU.label.hzcoDev",      value: fmt(payload.effective_hzco_deviation, 2) },
      { label: "MTU.label.retrograde",   value: payload.retrograde ? yes() : no() },
      { label: "MTU.label.inclination",  value: `${fmt(payload.inclination, 1)}°` },
      { label: "MTU.label.eccentricity", value: fmt(payload.eccentricity, 2) },
      { label: "MTU.label.tidallyLocked", value: payload.tidal_lock ? payload.tidal_lock : no() },
      { label: "MTU.label.siderealDay",  value: `${fmt(payload.sidereal_day, 2)} hours` },
      { label: "MTU.label.twilightZone", value: payload.twilight_zone ? yes() : no() },
    ],

    jumpShadowDetail: {
      distanceKm: js.distance_km != null ? Number(js.distance_km).toLocaleString() : "—",
      sourceName: js.source_name ?? "—",
      times: buildJumpShadowTimes(payload),
    },

    starport: [
      { label: "MTU.label.starport",          value: `${payload.starport_code} — ${STARPORT[payload.starport_code]?.description ?? "—"}` },
      { label: "MTU.label.fuel",              value: STARPORT[payload.starport_code]?.fuel ?? "—" },
      { label: "MTU.label.facilities",        value: STARPORT[payload.starport_code]?.facilities ?? "—" },
      { label: "MTU.label.worldTradeNumber",  value: eco.world_trade_number ?? "—" },
      { label: "MTU.label.importance",        value: eco.importance != null ? (eco.importance > 0 ? `+${eco.importance}` : String(eco.importance)) : "—" },
      { label: "MTU.label.developmentScore",  value: eco.development_score != null ? fmt(eco.development_score, 1) : "—" },
      { label: "MTU.label.perCapitaGwp",      value: eco.per_capita_gwp != null ? `${Number(eco.per_capita_gwp).toLocaleString()} Cr` : "—" },
      { label: "MTU.label.totalGwp",          value: eco.total_gwp != null ? formatGwp(eco.total_gwp) : "—" },
      { label: "MTU.label.infrastructure",    value: eco.infrastructure ?? "—" },
      { label: "MTU.label.resourceUnits",     value: eco.resource_units ?? "—" },
      { label: "MTU.label.resourceFactor",    value: eco.resource_factor ?? "—" },
      { label: "MTU.label.labourFactor",      value: eco.labour_factor ?? "—" },
      { label: "MTU.label.efficiency",        value: eco.efficiency ?? "—" },
      { label: "MTU.label.inequalityRating",  value: eco.inequality_rating ?? "—" },
      { label: "MTU.label.tariffRegime",      value: eco.tariffs?.regime != null ? snakeToTitle(eco.tariffs.regime) : "—" },
      { label: "MTU.label.tariffRate",        value: eco.tariffs?.rate != null ? `${eco.tariffs.rate}%` : "—" },
    ],

    physical: [
      { label: "MTU.label.diameter", value: payload.diameter != null ? `${payload.size_code} — ${Number(payload.diameter).toLocaleString()} km` : "—" },
      { label: "MTU.label.mass",     value: payload.mass != null ? `${fmt(payload.mass, 2)} M⊕` : "—" },
      { label: "MTU.label.gravity",  value: `${fmt(payload.gravity, 2)} g` },
      { label: "MTU.label.density",  value: payload.density != null ? `${fmt(payload.density, 2)} ρ⊕` : "—" },
    ],

    environmental: [
      { label: "MTU.label.temperature", value: `${Math.round(payload.temperature - 273.15)}°C` },
      { label: "MTU.label.rotation",    value: `${fmt(payload.rotation, 2)} hours` },
      { label: "MTU.label.axialTilt",   value: `${fmt(payload.axial_tilt, 1)}°` },
      { label: "MTU.label.albedo",      value: fmt(payload.albedo, 2) },
      { label: "MTU.label.greenhouse",  value: fmt(payload.greenhouse, 2) },
    ],

    atmosphere: [
      { label: "MTU.label.atmosphere", value: payload.atmosphere?.code != null
          ? `${payload.atmosphere.code} — ${ATMOSPHERE[payload.atmosphere.code]?.description ?? "—"}`
          : "—" },
    ],

    hydrographics: (() => {
      const h = payload.hydrographics ?? {};
      return [
        { label: "MTU.label.hydrographics", value: h.code != null ? `${h.code} — ${hydroRange(h.code)}` : "—" },
        { label: "MTU.label.liquid",        value: h.liquid ?? "—" },
        { label: "MTU.label.distribution",  value: h.distribution != null
            ? `${h.distribution} — ${HYDRO_DISTRIBUTION[h.distribution] ?? "—"}`
            : "—" },
      ];
    })(),

    population: (() => {
      const p = payload.population ?? {};
      return [
        { label: "MTU.label.population",          value: `${p.code} — ${POPULATION[p.code] ?? "—"}` },
        { label: "MTU.label.concentration",       value: p.concentration_rating != null ? `${p.concentration_rating} — ${POPULATION_CONCENTRATION[p.concentration_rating] ?? "—"}` : "—" },
        { label: "MTU.label.urbanisation",        value: p.urbanization_percentage != null ? `${p.urbanization_percentage}%` : "—" },
        { label: "MTU.label.majorCities",         value: p.major_cities ?? "—" },
        { label: "MTU.label.majorCityPopulation", value: p.major_city_population != null ? Number(p.major_city_population).toLocaleString() : "—" },
        { label: "MTU.label.nativeSophont",       value: payload.native_sophont ? yes() : no() },
        { label: "MTU.label.extinctSophont",      value: payload.extinct_sophont ? yes() : no() },
        { label: "MTU.label.diversity",           value: fmtDm(p.diversity) },
        { label: "MTU.label.xenophilia",          value: fmtDm(p.xenophilia) },
        { label: "MTU.label.uniqueness",          value: fmtDm(p.uniqueness) },
        { label: "MTU.label.symbology",           value: fmtDm(p.symbology) },
        { label: "MTU.label.cohesion",            value: fmtDm(p.cohesion) },
        { label: "MTU.label.progressiveness",     value: fmtDm(p.progressiveness) },
        { label: "MTU.label.expansionism",        value: fmtDm(p.expansionism) },
        { label: "MTU.label.militancy",           value: fmtDm(p.militancy) },
        { label: "MTU.label.habitabilityRating",  value: payload.habitability_rating ?? "—" },
        { label: "MTU.label.biomassRating",       value: payload.biomass_rating ?? "—" },
        { label: "MTU.label.biodiversityRating",  value: payload.biodiversity_rating != null
            ? `${payload.biodiversity_rating} — ${BIODIVERSITY[payload.biodiversity_rating] ?? "—"}`
            : "—" },
        { label: "MTU.label.biocomplexityRating", value: payload.biocomplexity_rating != null
            ? `${payload.biocomplexity_rating} — ${BIOCOMPLEXITY[payload.biocomplexity_rating] ?? "—"}`
            : "—" },
        { label: "MTU.label.resourceRating",      value: payload.resource_rating != null
            ? `${payload.resource_rating} — ${RESOURCE_RATING[payload.resource_rating] ?? "—"}`
            : "—" },
      ];
    })(),

    government: (() => {
      const g = payload.government ?? {};
      const s = g.structure ?? {};
      return [
        { label: "MTU.label.government",           value: `${g.code} — ${GOVERNMENT[g.code] ?? "—"}` },
        { label: "MTU.label.description",          value: GOVERNMENT[g.code] ?? "—" },
        { label: "MTU.label.judicialStructure",    value: s.judicial ? `${s.judicial} — ${GOV_STRUCTURE[s.judicial] ?? "—"}` : "—" },
        { label: "MTU.label.executiveStructure",   value: s.executive ? `${s.executive} — ${GOV_STRUCTURE[s.executive] ?? "—"}` : "—" },
        { label: "MTU.label.legislativeStructure", value: s.legislative ? `${s.legislative} — ${GOV_STRUCTURE[s.legislative] ?? "—"}` : "—" },
        { label: "MTU.label.authority",            value: g.authority ? `${g.authority} — ${GOV_AUTHORITY[g.authority] ?? "—"}` : "—" },
        { label: "MTU.label.centralisation",       value: g.centralisation ? `${g.centralisation} — ${GOV_CENTRALISATION[g.centralisation] ?? "—"}` : "—" },
      ];
    })(),

    lawLevel: (() => {
      const l = payload.law_level ?? {};
      return [
        { label: "MTU.label.lawLevel",                    value: `${l.code}` },
        { label: "MTU.label.weaponsArmour",               value: LAW_WEAPONS[l.code] ?? "—" },
        { label: "MTU.label.criminalLaw",                 value: l.criminal_law ?? "—" },
        { label: "MTU.label.economicLaw",                 value: l.economic_law ?? "—" },
        { label: "MTU.label.privateLaw",                  value: l.private_law ?? "—" },
        { label: "MTU.label.personalRights",              value: l.personal_rights ?? "—" },
        { label: "MTU.label.lawUniformity",               value: l.uniformity ? `${l.uniformity} — ${LAW_UNIFORMITY[l.uniformity] ?? "—"}` : "—" },
        { label: "MTU.label.judicialSystem",              value: l.judicial_system ? `${l.judicial_system} — ${JUDICIAL_SYSTEM[l.judicial_system] ?? "—"}` : "—" },
        { label: "MTU.label.deathPenalty",                value: l.death_penalty ? yes() : no() },
        { label: "MTU.label.presumedInnocence",           value: l.presumed_innocence ? yes() : no() },
        { label: "MTU.label.econometricInfractionsAdmin", value: l.econometric_infractions_administrative ? yes() : no() },
      ];
    })(),

    techLevel: [
      { label: "MTU.label.techLevel",       value: `${payload.tech_level_code} — ${tl.era ?? "—"}` },
      { label: "MTU.label.era",             value: tl.era ?? "—" },
      { label: "MTU.label.electronics",     value: tl.electronics ?? "—" },
      { label: "MTU.label.energy",          value: tl.energy ?? "—" },
      { label: "MTU.label.land",            value: tl.land ?? "—" },
      { label: "MTU.label.air",             value: tl.air ?? "—" },
      { label: "MTU.label.space",           value: tl.space ?? "—" },
      { label: "MTU.label.personalMilitary", value: tl.personalMilitary ?? "—" },
      { label: "MTU.label.heavyMilitary",   value: tl.heavyMilitary ?? "—" },
      { label: "MTU.label.manufacturing",   value: tl.manufacturing ?? "—" },
      { label: "MTU.label.medical",         value: tl.medical ?? "—" },
      { label: "MTU.label.environmental",   value: tl.environmental ?? "—" },
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
