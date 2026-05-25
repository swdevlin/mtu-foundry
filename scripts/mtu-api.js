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
  const x = system.x ?? 0;
  const y = system.y ?? 0;
  const hex = String(x).padStart(2, "0") + String(y).padStart(2, "0");
  const sectorName = system.sector_name ?? "—";
  const subsector_letter = String.fromCharCode(65 + Math.floor((x - 1) / 8) + Math.floor((y - 1) / 10) * 4);
  return {
    sector_name:      sectorName,
    sector_id:        system.sector_id ?? null,
    hex,
    star_system_name: system.name || `${sectorName} ${hex}`.trim() || `System ${system.id}`,
    star_system_id:   system.id ?? null,
    subsector_name:   system.subsector_name ?? "—",
    subsector_id:     system.subsector_id ?? null,
    subsector_letter,
  };
}

export function normalizeBodyPayload(body, systemContext) {
  return {
    name:            body.name ?? null,
    type:            body.type ?? "",
    uwp:             body.uwp ?? "—",
    // starport.code takes precedence over the flat starport_code field
    starport_code:   body.starport?.code ?? body.starport_code ?? null,
    size_code:       body.size?.code ?? body.size ?? "—",

    // Pass through as objects
    atmosphere:    body.atmosphere ?? {},
    population:    body.population ?? {},
    government:    body.government ?? {},
    law_level:     body.law_level ?? {},
    hydrographics: body.hydrographics ?? {},
    starport:      body.starport ?? {},
    tech_level:    body.tech_level ?? {},

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
    tidal_lock_note: body.tidal_lock_note ?? null,
    twilight_zone: body.twilight_zone ?? false,
    eccentricity:  body.eccentricity ?? null,
    inclination:   body.inclination ?? null,
    sidereal_day:  body.sidereal_day ?? null,

    // Top-level fields still present; also pull from nested population.biological_data if available
    native_sophont:       body.native_sophont ?? body.population?.native_sophont?.value ?? false,
    extinct_sophont:      body.extinct_sophont ?? body.population?.extinct_sophont?.value ?? false,
    habitability_rating:  body.habitability_rating ?? null,
    biomass_rating:       body.biomass_rating ?? body.population?.biological_data?.biomass_rating?.value ?? null,
    biodiversity_rating:  body.biodiversity_rating ?? body.population?.biological_data?.biodiversity_rating?.code ?? null,
    biocomplexity_rating: body.biocomplexity_rating ?? body.population?.biological_data?.biocomplexity_rating?.code ?? null,
    resource_rating:      body.resource_rating ?? body.population?.biological_data?.resource_rating?.code ?? null,

    orbit:                    body.orbit ?? null,
    au:                       body.au ?? null,
    period:                   body.period ?? null,
    effective_hzco_deviation: body.effective_hzco_deviation ?? null,

    jump_shadow: body.jump_shadow ?? null,
    economics:   body.economics ?? null,

    sector_name:      systemContext.sector_name,
    sector_id:        systemContext.sector_id,
    hex:              systemContext.hex,
    star_system_name: systemContext.star_system_name,
    star_system_id:   systemContext.star_system_id,
    subsector_name:   systemContext.subsector_name ?? "—",
    subsector_id:     systemContext.subsector_id,
    subsector_letter: systemContext.subsector_letter,
    orbiting_name:    systemContext.orbiting_name ?? "—",
  };
}

export function findMainWorld(system) {
  const targetUwp = system.main_world?.uwp;
  if (!targetUwp) return null;

  function searchObjects(objects) {
    for (const body of objects ?? []) {
      if (body.type === "Star") {
        const found = searchObjects(body.stellar_objects);
        if (found) return found;
        continue;
      }
      if (body.uwp === targetUwp) return body;
      for (const moon of body.moons ?? []) {
        if (moon.uwp === targetUwp) return moon;
      }
    }
    return null;
  }

  return searchObjects(system.primary_star?.stellar_objects);
}

/* ── Overview page data ─────────────────────────────────────── */

function findBestRefuelGasGiant(system) {
  let best = null;
  let bestKm = Infinity;

  function searchObjects(objects) {
    for (const body of objects ?? []) {
      if (body.type === "Star") { searchObjects(body.stellar_objects); continue; }
      if (!/gas/i.test(body.type ?? "")) continue;
      const js = body.jump_shadow;
      const km = typeof js === "number" ? js : (js?.distance_km ?? null);
      if (typeof km === "number" && km > 0 && km < bestKm) {
        best = body;
        bestKm = km;
      }
    }
  }

  searchObjects(system.primary_star?.stellar_objects);
  return best;
}

function resolveSubsectorName(subsectorName, sectorName, subsectorLetter) {
  return (subsectorName && subsectorName !== "—")
    ? subsectorName
    : `${sectorName ?? "—"} ${subsectorLetter}`;
}

export function buildOverviewData(system, mDrive = 1) {
  const ctx = buildSystemContext(system);
  const star = system.primary_star ?? {};
  const primaryStar = star.stellar_type
    ? `${star.stellar_type}${star.stellar_subtype ?? ""} ${star.stellar_class ?? ""}`.trim()
    : "—";

  const gg = findBestRefuelGasGiant(system);
  const ggJs = gg?.jump_shadow;
  const ggKm = ggJs != null ? (typeof ggJs === "number" ? ggJs : (ggJs?.distance_km ?? 0)) : 0;

  return {
    systemName:    ctx.star_system_name,
    sector:        ctx.sector_name,
    subsector:     resolveSubsectorName(ctx.subsector_name, ctx.sector_name, ctx.subsector_letter),
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
    bodies: buildBodyList(system, mDrive),
    gasGiantJumpShadow: gg ? {
      label:      [gg.orbit_sequence, gg.name].filter(Boolean).join(" — "),
      safeJumpKm: Number(ggKm).toLocaleString(),
      times: ggJs?.travel_times
        ? [1, 2, 3, 4, 5, 6].map((g) => ({
            g:     `${g}G`,
            value: formatTransitTime(ggJs.travel_times[`${g}g`]),
          }))
        : [1, 2, 3, 4, 5, 6].map((g) => ({
            g:     `${g}G`,
            value: formatTransitTime(calcTransitHours(ggKm, g)),
          })),
    } : null,
  };
}

function buildBodyList(system, mDrive) {
  const collected = [];

  function collectBodies(objects) {
    for (const body of objects ?? []) {
      if (body.type === "Moon" || body.type === "Planetoid") continue;
      collected.push(body);
      if (body.type === "Star") collectBodies(body.stellar_objects);
    }
  }

  collectBodies(system.primary_star?.stellar_objects);

  return collected.map((body) => {
    const js = body.jump_shadow;
    const km = typeof js === "number" ? js : (js?.distance_km ?? null);
    const safeJump = km != null && km > 0
      ? formatJumpShadowTime(calcTransitHours(km, mDrive))
      : "—";
    const ggKey = GAS_GIANT_SIZE[body.code];
    const uwpSam = body.uwp
      ? body.uwp
      : ggKey ? game.i18n.localize(ggKey) : "—";
    return {
      label:    body.orbit_sequence ?? "—",
      uwpSam,
      orbit:    body.au != null ? `${Number(body.au).toFixed(2)}` : "—",
      moons:    body.moons?.length ?? 0,
      safeJump,
    };
  });
}

/* ── Transit page data ──────────────────────────────────────── */

// 1G = 10 m/s² = 0.01 km/s² (standard Traveller approximation)
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

  function addBodies(objects, offsetX = 0, offsetY = 0) {
    for (const body of objects ?? []) {
      if (body.type === "Planetoid") continue;
      // Bodies orbiting a companion star have orbit_position relative to that star,
      // so we accumulate the offset down the tree.
      const pos = body.orbit_position ?? {};
      const x = (pos.x ?? body.orbit_x ?? 0) + offsetX;
      const y = (pos.y ?? body.orbit_y ?? 0) + offsetY;
      nodes.push({ label: body.orbit_sequence ?? "—", x, y });
      if (body.type === "Star") addBodies(body.stellar_objects, x, y);
    }
  }

  addBodies(star.stellar_objects);

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

/* ── Player / GM data builders ──────────────────────────────── */

export function formatJumpShadowTime(hours) {
  if (hours >= 24) return `${(hours / 24).toFixed(1)}d`;
  return `${hours.toFixed(1)}h`;
}

function humaniseType(type) {
  return type.replace(/([A-Z])/g, " $1").trim();
}

const GAS_GIANT_SIZE = {
  GS: "MTU.value.ggSmall",
  GM: "MTU.value.ggMedium",
  GL: "MTU.value.ggLarge",
};

function fmt(n, decimals = 2) {
  return Number(n).toFixed(decimals);
}

function snakeToTitle(str) {
  return String(str)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function yes()  { return game.i18n.localize("MTU.value.yes"); }
function no()   { return game.i18n.localize("MTU.value.no");  }
function none() { return game.i18n.localize("MTU.value.none"); }

function govStructEntry(sub) {
  if (!sub?.code) return "—";
  return `${sub.code} — ${sub.description ?? GOV_STRUCTURE[sub.code] ?? "—"}`;
}

function govCodeEntry(val, lookup) {
  if (!val?.code) return "—";
  return `${val.code} — ${val.description ?? lookup[val.code] ?? "—"}`;
}

function tlEntry(sub) {
  if (!sub?.code) return "—";
  return sub.description != null ? `${sub.code} — ${sub.description}` : String(sub.code);
}

export function buildPlayerData(payload) {
  const sp       = payload.starport ?? {};
  const spLookup = STARPORT[payload.starport_code] ?? {};
  const spQuality    = sp.quality    ?? spLookup.description;
  const spFuel       = sp.fuel       ?? spLookup.fuel;
  const spFacilities = sp.facilities ?? spLookup.facilities;
  const starportValue = payload.starport_code
    ? `${payload.starport_code} — ${spQuality ?? "—"}; ${spFuel ?? "—"}; ${spFacilities ?? "—"}`
    : "—";

  const atm        = ATMOSPHERE[payload.atmosphere?.code] ?? {};
  const survivalReq = payload.atmosphere?.survival_requirement?.value ?? atm.survivalReq ?? "—";

  const popCode = payload.population?.code;
  const pop     = POPULATION[popCode] ?? payload.population?.range ?? "—";
  const govCode = payload.government?.code;
  const gov     = payload.government?.type ?? GOVERNMENT[govCode] ?? "—";
  const lawCode = payload.law_level?.code;
  const law     = LAW_WEAPONS[lawCode] ?? "—";

  const tl = payload.tech_level ?? {};

  return {
    name: payload.name,
    type: humaniseType(payload.type ?? ""),
    profile: [
      { label: "MTU.label.name",          value: payload.name ?? "" },
      { label: "MTU.label.type",          value: humaniseType(payload.type ?? "") },
      { label: "MTU.label.uwp",           value: payload.uwp ?? "—" },
      { label: "MTU.label.starport",      value: starportValue },
      { label: "MTU.label.gravity",       value: `${fmt(payload.gravity)} ⊕` },
      { label: "MTU.label.temperature",   value: `${Math.round(payload.temperature - 273.15)}°C` },
      { label: "MTU.label.survivalReq",   value: survivalReq },
      { label: "MTU.label.population",    value: popCode != null ? `${popCode} — ${pop}` : "—" },
      { label: "MTU.label.government",    value: govCode != null ? `${govCode} — ${gov}` : "—" },
      { label: "MTU.label.lawLevel",      value: lawCode != null ? `${lawCode} — ${law}` : "—" },
      { label: "MTU.label.techLevel",     value: tl.code != null ? `${tl.code} — ${tl.descriptor ?? "—"}` : "—" },
      { label: "MTU.label.nativeSophont", value: payload.native_sophont ? yes() : none() },
    ],
    jumpShadow: buildJumpShadowTimes(payload),
    location: {
      orbiting:   payload.orbiting_name ?? "—",
      starSystem: payload.star_system_name ?? "—",
      subsector:  resolveSubsectorName(payload.subsector_name, payload.sector_name, payload.subsector_letter),
      sector:     `${payload.sector_name ?? "—"}`,
    },
  };
}

export function buildGmData(payload, campaignSlug) {
  const player = buildPlayerData(payload);
  const js  = payload.jump_shadow;
  const jsKm = typeof js === "number" ? js : (js?.distance_km ?? null);
  const eco = payload.economics ?? {};

  const sp       = payload.starport ?? {};
  const spLookup = STARPORT[payload.starport_code] ?? {};
  const spQuality    = sp.quality    ?? spLookup.description ?? "—";
  const spFuel       = sp.fuel       ?? spLookup.fuel        ?? "—";
  const spFacilities = sp.facilities ?? spLookup.facilities  ?? "—";

  const tl = payload.tech_level ?? {};

  const base = campaignSlug ? `https://mytravelleruniverse.net/c/${campaignSlug}` : null;
  const starSystemUrl = base && payload.star_system_id ? `${base}/star_systems/${payload.star_system_id}` : null;
  const subsectorUrl  = base && payload.subsector_id   ? `${base}/subsectors/${payload.subsector_id}`    : null;
  const sectorUrl     = base && payload.sector_id      ? `${base}/sectors/${payload.sector_id}`          : null;

  return {
    ...player,
    location: { ...player.location, starSystemUrl, subsectorUrl, sectorUrl },

    orbital: [
      { label: "MTU.label.hex",           value: payload.hex ?? "—" },
      { label: "MTU.label.orbit",         value: fmt(payload.orbit, 2) },
      { label: "MTU.label.au",            value: `${fmt(payload.au, 4)} AU` },
      { label: "MTU.label.period",        value: `${fmt(payload.period, 1)} d` },
      { label: "MTU.label.hzcoDev",       value: fmt(payload.effective_hzco_deviation, 2) },
      { label: "MTU.label.retrograde",    value: payload.retrograde ? yes() : no() },
      { label: "MTU.label.inclination",   value: `${fmt(payload.inclination, 1)}°` },
      { label: "MTU.label.eccentricity",  value: fmt(payload.eccentricity, 2) },
      { label: "MTU.label.tidallyLocked", value: payload.tidal_lock ? payload.tidal_lock : no() },
      { label: "MTU.label.siderealDay",   value: `${fmt(payload.sidereal_day, 2)} hours` },
      { label: "MTU.label.twilightZone",  value: payload.twilight_zone ? yes() : no() },
    ],

    jumpShadowDetail: jsKm != null ? {
      distanceKm: Number(jsKm).toLocaleString(),
      sourceName: (typeof js === "object" ? js?.source_name : null) ?? "—",
      times: buildJumpShadowTimes(payload),
    } : null,

    starport: [
      { label: "MTU.label.starport",   value: payload.starport_code ? `${payload.starport_code} ${spQuality}` : "—" },
      { label: "MTU.label.fuel",       value: spFuel },
      { label: "MTU.label.facilities", value: spFacilities },
    ],

    economics: (() => {
      const wtn      = eco.world_trade_number?.value ?? eco.world_trade_number;
      const imp      = eco.importance?.value ?? eco.importance;
      const devScore = eco.development_score?.value ?? eco.development_score;
      const perCap   = eco.per_capita_gwp?.value ?? eco.per_capita_gwp;
      const totGwp   = eco.total_gwp?.value ?? eco.total_gwp;
      const infra    = eco.infrastructure?.value ?? eco.infrastructure;
      const resUnits = eco.resource_units?.value ?? eco.resource_units;
      const resFactor= eco.resource_factor?.value ?? eco.resource_factor;
      const labFactor= eco.labour_factor?.value ?? eco.labour_factor;
      const eff      = eco.efficiency?.value ?? eco.efficiency;
      const ineq     = eco.inequality_rating?.value ?? eco.inequality_rating;
      return [
        { label: "MTU.label.worldTradeNumber", value: wtn ?? "—" },
        { label: "MTU.label.importance",       value: imp != null ? (imp > 0 ? `+${imp}` : String(imp)) : "—" },
        { label: "MTU.label.developmentScore", value: devScore != null ? fmt(devScore, 1) : "—" },
        { label: "MTU.label.perCapitaGwp",     value: perCap != null ? formatGwp(perCap) : "—" },
        { label: "MTU.label.totalGwp",         value: totGwp != null ? formatGwp(totGwp) : "—" },
        { label: "MTU.label.infrastructure",   value: infra ?? "—" },
        { label: "MTU.label.resourceUnits",    value: resUnits ?? "—" },
        { label: "MTU.label.resourceFactor",   value: resFactor ?? "—" },
        { label: "MTU.label.labourFactor",     value: labFactor ?? "—" },
        { label: "MTU.label.efficiency",       value: eff ?? "—" },
        { label: "MTU.label.inequalityRating", value: ineq ?? "—" },
        { label: "MTU.label.tariffRegime",     value: eco.tariffs?.regime != null ? snakeToTitle(eco.tariffs.regime) : "—" },
        { label: "MTU.label.tariffRate",       value: eco.tariffs?.rate != null ? `${eco.tariffs.rate}%` : "—" },
      ];
    })(),

    physical: [
      { label: "MTU.label.diameter", value: payload.diameter != null ? `${payload.size_code} — ${Number(payload.diameter).toLocaleString()} km` : "—" },
      { label: "MTU.label.mass",     value: payload.mass != null ? `${fmt(payload.mass, 2)} ⊕` : "—" },
      { label: "MTU.label.gravity",  value: `${fmt(payload.gravity, 2)} ⊕` },
      { label: "MTU.label.density",  value: payload.density != null ? `${fmt(payload.density, 2)} ⊕` : "—" },
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
          ? `${payload.atmosphere.code} — ${payload.atmosphere.description ?? ATMOSPHERE[payload.atmosphere.code]?.description ?? "—"}`
          : "—" },
    ],

    hydrographics: (() => {
      const h = payload.hydrographics ?? {};
      const hydroDesc = h.description ?? hydroRange(h.code);
      const liquid    = h.liquid?.value ?? h.liquid;
      const distCode  = h.distribution?.code ?? (typeof h.distribution === "number" ? h.distribution : null);
      const distDesc  = h.distribution?.description ?? HYDRO_DISTRIBUTION[distCode] ?? "—";
      return [
        { label: "MTU.label.hydrographics", value: h.code != null ? `${h.code} — ${hydroDesc}` : "—" },
        { label: "MTU.label.liquid",        value: liquid ?? "—" },
        { label: "MTU.label.distribution",  value: distCode != null ? `${distCode} — ${distDesc}` : "—" },
      ];
    })(),

    population: (() => {
      const p   = payload.population ?? {};
      const bio = p.biological_data ?? {};
      const popRange     = p.range ?? POPULATION[p.code] ?? "—";
      const concCode     = p.concentration_rating?.code ?? (typeof p.concentration_rating === "number" ? p.concentration_rating : null);
      const concDesc     = p.concentration_rating?.description ?? POPULATION_CONCENTRATION[concCode] ?? "—";
      const urbanPct     = p.urbanization_percentage?.value ?? p.urbanization_percentage;
      const majorCities  = p.major_cities?.value ?? p.major_cities;
      const majorCityPop = p.major_city_population?.value ?? p.major_city_population;
      const nativeSoph   = p.native_sophont?.value ?? payload.native_sophont;
      const extinctSoph  = p.extinct_sophont?.value ?? payload.extinct_sophont;
      const biodiverCode  = bio.biodiversity_rating?.code ?? payload.biodiversity_rating;
      const biodiverDesc  = bio.biodiversity_rating?.description ?? BIODIVERSITY[biodiverCode] ?? "—";
      const biocomplexCode = bio.biocomplexity_rating?.code ?? payload.biocomplexity_rating;
      const biocomplexDesc = bio.biocomplexity_rating?.description ?? BIOCOMPLEXITY[biocomplexCode] ?? "—";
      const resourceCode  = bio.resource_rating?.code ?? payload.resource_rating;
      const resourceDesc  = bio.resource_rating?.description ?? RESOURCE_RATING[resourceCode] ?? "—";
      const biomassVal    = bio.biomass_rating?.value ?? payload.biomass_rating;
      return [
        { label: "MTU.label.population",          value: p.code != null ? `${p.code} — ${popRange}` : "—" },
        { label: "MTU.label.concentration",       value: concCode != null ? `${concCode} — ${concDesc}` : "—" },
        { label: "MTU.label.urbanisation",        value: urbanPct != null ? `${urbanPct}%` : "—" },
        { label: "MTU.label.majorCities",         value: majorCities ?? "—" },
        { label: "MTU.label.majorCityPopulation", value: majorCityPop != null ? Number(majorCityPop).toLocaleString() : "—" },
        { label: "MTU.label.nativeSophont",       value: nativeSoph ? yes() : no() },
        { label: "MTU.label.extinctSophont",      value: extinctSoph ? yes() : no() },
        { label: "MTU.label.diversity",           value: fmtDm(p.diversity) },
        { label: "MTU.label.xenophilia",          value: fmtDm(p.xenophilia) },
        { label: "MTU.label.uniqueness",          value: fmtDm(p.uniqueness) },
        { label: "MTU.label.symbology",           value: fmtDm(p.symbology) },
        { label: "MTU.label.cohesion",            value: fmtDm(p.cohesion) },
        { label: "MTU.label.progressiveness",     value: fmtDm(p.progressiveness) },
        { label: "MTU.label.expansionism",        value: fmtDm(p.expansionism) },
        { label: "MTU.label.militancy",           value: fmtDm(p.militancy) },
        { label: "MTU.label.habitabilityRating",  value: payload.habitability_rating ?? "—" },
        { label: "MTU.label.biomassRating",       value: biomassVal ?? "—" },
        { label: "MTU.label.biodiversityRating",  value: biodiverCode != null ? `${biodiverCode} — ${biodiverDesc}` : "—" },
        { label: "MTU.label.biocomplexityRating", value: biocomplexCode != null ? `${biocomplexCode} — ${biocomplexDesc}` : "—" },
        { label: "MTU.label.resourceRating",      value: resourceCode != null ? `${resourceCode} — ${resourceDesc}` : "—" },
      ];
    })(),

    government: (() => {
      const g = payload.government ?? {};
      const govType = g.type ?? GOVERNMENT[g.code] ?? "—";
      const s = g.structure ?? {};
      return [
        { label: "MTU.label.government",           value: g.code != null ? `${g.code} — ${govType}` : "—" },
        { label: "MTU.label.description",          value: g.description ?? govType },
        { label: "MTU.label.judicialStructure",    value: govStructEntry(s.judicial) },
        { label: "MTU.label.executiveStructure",   value: govStructEntry(s.executive) },
        { label: "MTU.label.legislativeStructure", value: govStructEntry(s.legislative) },
        { label: "MTU.label.authority",            value: govCodeEntry(g.authority,      GOV_AUTHORITY) },
        { label: "MTU.label.centralisation",       value: govCodeEntry(g.centralisation, GOV_CENTRALISATION) },
      ];
    })(),

    lawLevel: (() => {
      const l = payload.law_level ?? {};
      const lawLabel = LAW_WEAPONS[l.code] ?? "—";
      return [
        { label: "MTU.label.lawLevel",                    value: l.code != null ? `${l.code} — ${lawLabel}` : "—" },
        { label: "MTU.label.weaponsArmour",               value: lawLabel },
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
      { label: "MTU.label.techLevel",        value: tl.code != null ? `${tl.code} — ${tl.descriptor ?? "—"}` : "—" },
      { label: "MTU.label.electronics",      value: tlEntry(tl.electronics) },
      { label: "MTU.label.energy",           value: tlEntry(tl.energy) },
      { label: "MTU.label.land",             value: tlEntry(tl.land) },
      { label: "MTU.label.sea",              value: tlEntry(tl.sea) },
      { label: "MTU.label.air",              value: tlEntry(tl.air) },
      { label: "MTU.label.space",            value: tlEntry(tl.space) },
      { label: "MTU.label.personalMilitary", value: tlEntry(tl.personal_military) },
      { label: "MTU.label.heavyMilitary",    value: tlEntry(tl.heavy_military) },
      { label: "MTU.label.manufacturing",    value: tlEntry(tl.manufacturing) },
      { label: "MTU.label.medical",          value: tlEntry(tl.medical) },
      { label: "MTU.label.environmental",    value: tlEntry(tl.environmental) },
    ],
  };
}

function buildJumpShadowTimes(payload) {
  const js = payload.jump_shadow;
  if (js == null) return null;
  if (js.travel_times) {
    return [1, 2, 3, 4, 5, 6].map((g) => ({
      g:     `${g}G`,
      value: formatJumpShadowTime(js.travel_times[`${g}g`]),
    }));
  }
  const km = typeof js === "number" ? js : js.distance_km;
  if (!km || km <= 0) return null;
  return [1, 2, 3, 4, 5, 6].map((g) => ({
    g:     `${g}G`,
    value: formatJumpShadowTime(calcTransitHours(km, g)),
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
    0:  "No free standing water",
    1:  "1%–5%",
    2:  "6%–15%",
    3:  "16%–25%",
    4:  "26%–35%",
    5:  "36%–45%",
    6:  "46%–55%",
    7:  "66%–75%",
    8:  "76%–85%",
    9:  "86%–95%",
    10: "96%–100%",
  };
  return ranges[code] ?? "—";
}

function formatGwp(value) {
  const n = Number(value);
  const abbr = (v) => v % 1 === 0 ? String(v) : v.toFixed(1);
  if (n >= 1e12) return `${abbr(n / 1e12)} T`;
  if (n >= 1e9)  return `${abbr(n / 1e9)} B`;
  if (n >= 1e6)  return `${abbr(n / 1e6)} M`;
  if (n >= 1e3)  return `${abbr(n / 1e3)} K`;
  return `${n.toLocaleString()} Cr`;
}

export { MODULE_ID };
