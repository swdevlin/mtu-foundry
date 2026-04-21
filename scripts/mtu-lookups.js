export const STARPORT = {
  A: { description: "Excellent",  fuel: "Refined",   facilities: "Full Repair; Shipyard (all)" },
  B: { description: "Good",       fuel: "Refined",   facilities: "Full Repair; Shipyard (spacecraft)" },
  C: { description: "Routine",    fuel: "Unrefined", facilities: "Limited Repair" },
  D: { description: "Poor",       fuel: "Unrefined", facilities: "Limited Repair" },
  E: { description: "Frontier",   fuel: "None",      facilities: "None" },
  X: { description: "None",       fuel: "None",      facilities: "None" },
};

export const ATMOSPHERE = {
  0:  { description: "Vacuum",            survivalReq: "Vacc Suit" },
  1:  { description: "Trace",             survivalReq: "Vacc Suit" },
  2:  { description: "Very Thin Tainted", survivalReq: "Respirator, Filter Mask" },
  3:  { description: "Very Thin",         survivalReq: "Respirator" },
  4:  { description: "Thin Tainted",      survivalReq: "Filter Mask" },
  5:  { description: "Thin",              survivalReq: "None" },
  6:  { description: "Standard",          survivalReq: "None" },
  7:  { description: "Standard Tainted",  survivalReq: "Filter Mask" },
  8:  { description: "Dense",             survivalReq: "None" },
  9:  { description: "Dense Tainted",     survivalReq: "Filter Mask" },
  10: { description: "Exotic",            survivalReq: "Air Supply" },
  11: { description: "Corrosive",         survivalReq: "Vacc Suit" },
  12: { description: "Insidious",         survivalReq: "Vacc Suit" },
  13: { description: "Dense High",        survivalReq: "Respirator" },
  14: { description: "Thin Low",          survivalReq: "Respirator" },
  15: { description: "Unusual",           survivalReq: "Varies" },
};

export const POPULATION = {
  0:  "None",
  1:  "1–9",
  2:  "10–99",
  3:  "100–999",
  4:  "1,000–9,999",
  5:  "10,000–99,999",
  6:  "100,000–999,999",
  7:  "1,000,000–9,999,999",
  8:  "10,000,000–99,999,999",
  9:  "1,000,000,000–9,999,999,999",
  10: "10,000,000,000–99,999,999,999",
};

export const GOVERNMENT = {
  0:  "No Government Structure",
  1:  "Company/Corporation",
  2:  "Participating Democracy",
  3:  "Self-Perpetuating Oligarchy",
  4:  "Representative Democracy",
  5:  "Feudal Technocracy",
  6:  "Captive Government/Colony",
  7:  "Balkanisation",
  8:  "Civil Service Bureaucracy",
  9:  "Impersonal Bureaucracy",
  10: "Charismatic Dictator",
  11: "Non-Charismatic Leader",
  12: "Charismatic Oligarchy",
  13: "Religious Dictatorship",
  14: "Religious Autocracy",
  15: "Totalitarian Oligarchy",
};

export const LAW_WEAPONS = {
  0: "No restrictions",
  1: "Poison gas, explosives, undetectable weapons, WMDs prohibited",
  2: "Portable energy weapons (unless mounted) prohibited",
  3: "Weapons of a military nature prohibited",
  4: "Light assault weapons and submachine guns prohibited",
  5: "Personal concealable weapons prohibited",
  6: "All firearms except shotguns and stunners; carrying weapons discouraged",
  7: "Shotguns prohibited",
  8: "All bladed weapons, stunners prohibited",
  9: "Any weapons outside home prohibited",
};

export const TECH_LEVEL = {
  0:  { era: "Primitive",       electronics: "None",                           energy: "Muscle/wind/water",         land: "Animal transport",              air: "None",                    space: "None",           personalMilitary: "Blade, bow",                        heavyMilitary: "Catapult",                              manufacturing: "Handicraft",          medical: "Herbal remedies",         environmental: "Primitive shelter" },
  1:  { era: "Bronze/Iron Age", electronics: "None",                           energy: "Muscle/wind/water",         land: "Wheeled cart",                  air: "None",                    space: "None",           personalMilitary: "Sword, pike",                       heavyMilitary: "Battering ram, siege tower",            manufacturing: "Blacksmithing",       medical: "Surgery",                 environmental: "Basic irrigation" },
  2:  { era: "Renaissance",     electronics: "None",                           energy: "Water/wind mills",          land: "Wheeled vehicle",               air: "None",                    space: "None",           personalMilitary: "Musket, rapier",                    heavyMilitary: "Cannon",                                manufacturing: "Printing press",      medical: "Basic anatomy",           environmental: "Drainage systems" },
  3:  { era: "Industrial Age",  electronics: "Basic (telegraph)",              energy: "Steam/coal",                land: "Steam locomotive",              air: "Hot air balloon",         space: "None",           personalMilitary: "Rifle, revolver",                   heavyMilitary: "Ironclad, field gun",                   manufacturing: "Mass production",     medical: "Anaesthesia, antiseptics", environmental: "Sewage systems" },
  4:  { era: "Atomic Age",      electronics: "Vacuum tubes, radio",            energy: "Internal combustion",       land: "Automobile",                    air: "Propeller aircraft",      space: "None",           personalMilitary: "Automatic rifle",                   heavyMilitary: "Tank, bomber",                          manufacturing: "Assembly line",       medical: "Antibiotics",             environmental: "Indoor plumbing" },
  5:  { era: "Broadcast Age",   electronics: "Transistors, early computers",   energy: "Nuclear fission",           land: "High-speed rail",               air: "Jet aircraft",            space: "Basic rockets",  personalMilitary: "Advanced firearms",                 heavyMilitary: "ICBM, jet fighter",                     manufacturing: "Automation begins",   medical: "Organ transplants",       environmental: "Pollution controls" },
  6:  { era: "Nuclear Age",     electronics: "Integrated circuits",            energy: "Improved nuclear",          land: "Maglev train",                  air: "Supersonic aircraft",     space: "Satellites",     personalMilitary: "Gauss weapon prototype",            heavyMilitary: "MIRV, nuclear submarine",               manufacturing: "Robotics (early)",    medical: "Gerontology",             environmental: "Recycling systems" },
  7:  { era: "Space Age",       electronics: "Microprocessors",                energy: "Solar, early fusion",       land: "Air cushion vehicle",           air: "Reusable spacecraft",     space: "Colonisation",   personalMilitary: "Accelerator rifle",                 heavyMilitary: "Orbital bombardment",                   manufacturing: "3D printing",         medical: "Cloning",                 environmental: "Terraforming (early)" },
  8:  { era: "Information Age", electronics: "Artificial intelligence",        energy: "Fusion power",              land: "Grav vehicle (early)",          air: "Contragrav vehicle",      space: "Jump-0",         personalMilitary: "Body pistol, stunner",              heavyMilitary: "Meson gun (early)",                     manufacturing: "Molecular assembly",  medical: "Cybernetics",             environmental: "Artificial biomes" },
  9:  { era: "Pre-Stellar",     electronics: "Core computers, Holographic projectors", energy: "Improved solar",  land: "Superconducting Monorail Train", air: "Grav Car",                space: "M-Drive, Jump-1", personalMilitary: "Laser Rifle",                       heavyMilitary: "Laser Gun, Grav Tank, Rail Gun",        manufacturing: "External fabs",       medical: "Spare part clones",       environmental: "Underwater cities, early weather control" },
  10: { era: "Early Stellar",   electronics: "Positronic computers",           energy: "Antimatter (early)",        land: "Grav APC",                      air: "Grav fighter",            space: "Jump-2",         personalMilitary: "Plasma rifle",                      heavyMilitary: "Plasma gun, Grav APC",                  manufacturing: "Nanofabrication",     medical: "Anagathics",              environmental: "Weather control" },
  11: { era: "Average Stellar", electronics: "Conscious computers",            energy: "Antimatter",                land: "Advanced grav vehicle",         air: "Stealth fighter",         space: "Jump-3",         personalMilitary: "Fusion rifle",                      heavyMilitary: "Fusion gun, battle dress",              manufacturing: "Self-replicating fabs", medical: "Rapid cloning",          environmental: "Ecosystem management" },
  12: { era: "Average Stellar", electronics: "Synthetic intellect",            energy: "Black globe (early)",       land: "Combat walker",                 air: "Aerospace fighter",       space: "Jump-4",         personalMilitary: "Advanced fusion weapon",            heavyMilitary: "Disintegrator (early)",                 manufacturing: "Matter duplication",  medical: "Full body rebuild",       environmental: "Planetary engineering" },
  13: { era: "Average Imperial", electronics: "Distributed intellect",         energy: "Black globe",               land: "Powered battle dress",          air: "Hypersonic fighter",      space: "Jump-5",         personalMilitary: "Meson pistol",                      heavyMilitary: "Meson accelerator",                     manufacturing: "Molecular assembly",  medical: "Memory transfer",         environmental: "Stellar engineering" },
  14: { era: "High Stellar",    electronics: "Femtoscale computing",           energy: "Coherent gravity",          land: "Personal gravbelt",             air: "Trans-atmospheric craft", space: "Jump-6",         personalMilitary: "Disintegrator pistol",               heavyMilitary: "Planet buster",                         manufacturing: "Atomic assembly",     medical: "Consciousness transfer",  environmental: "Dyson sphere construction" },
  15: { era: "Imperial Maximum", electronics: "Godlike AI",                    energy: "Zero-point energy",         land: "Teleportation",                 air: "Teleportation",           space: "Jump-6+",        personalMilitary: "FGMP-15",                           heavyMilitary: "Star trigger",                          manufacturing: "Unlimited",           medical: "Immortality",             environmental: "Universe manipulation" },
};

export const GOV_STRUCTURE = {
  A: "Autocracy",
  C: "Council",
  D: "Demos",
  G: "Guild/Corporation",
  M: "Multiple Councils",
  O: "Oligarchy",
  T: "Technocracy",
};

export const GOV_AUTHORITY = {
  E: "Executive",
  J: "Judicial",
  L: "Legislative",
  M: "Military",
  R: "Religious",
};

export const GOV_CENTRALISATION = {
  C: "Confederal",
  F: "Federal",
  U: "Unitary",
};

export const LAW_UNIFORMITY = {
  P: "Personal",
  R: "Regional",
  W: "World",
};

export const JUDICIAL_SYSTEM = {
  A: "Administrative",
  I: "Inquisitorial",
  T: "Traditional",
};

export const HYDRO_DISTRIBUTION = {
  0: "Absent",
  1: "Concentrated",
  2: "Dispersed",
  3: "Scattered",
  4: "Marginal",
};

export const POPULATION_CONCENTRATION = {
  0: "Absent",
  1: "Very Dispersed",
  2: "Dispersed",
  3: "Marginally Dispersed",
  4: "Average",
  5: "Marginally Concentrated",
  6: "Partially Concentrated",
  7: "Concentrated",
  8: "Highly Concentrated",
  9: "Extremely Concentrated",
};

export const BIODIVERSITY = {
  0:  "None",
  1:  "Minimal",
  2:  "Low",
  3:  "Below average",
  4:  "Average",
  5:  "Moderate species diversity",
  6:  "Above average",
  7:  "Rich",
  8:  "Very rich",
  9:  "Extremely rich",
  10: "Extraordinary",
};

export const BIOCOMPLEXITY = {
  0: "None",
  1: "Primitive single-cell organisms",
  2: "Simple multicellular organisms",
  3: "Complex invertebrates",
  4: "Vertebrates",
  5: "Advanced vertebrates",
  6: "Simple tool use",
  7: "Complex tool use",
  8: "Pre-technological",
  9: "Technological",
};

export const RESOURCE_RATING = {
  2:  "Very scarce",
  3:  "Scarce",
  4:  "Very poor",
  5:  "Poor",
  6:  "Below average",
  7:  "Average",
  8:  "Above average",
  9:  "Good",
  10: "Rich",
  11: "Very rich",
  12: "Liable to experience a resource rush",
  13: "Extremely rich",
};