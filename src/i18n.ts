/**
 * Minimal FR/EN internationalisation for Gridburg.
 *
 * The game historically hardcoded every string in English. This module keeps
 * English as the fallback and provides French for the whole menu/HUD chrome:
 * main menu, settings, tutorial, help, build categories and tools, budget,
 * policies, milestones, civic needs and service names.
 *
 * Deeper simulation messages (inspector details, toasts, city messages) stay
 * in English for now and fall back gracefully through `t()`.
 */

export type Lang = 'en' | 'fr';

const SETTINGS_KEY = 'gridburg.settings.v1';
const LANG_KEY = 'gridburg.lang.v1';

export function detectLang(): Lang {
  try {
    const direct = localStorage.getItem(LANG_KEY);
    if (direct === 'fr' || direct === 'en') return direct;
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { lang?: unknown };
      if (parsed.lang === 'fr' || parsed.lang === 'en') return parsed.lang;
    }
  } catch { /* storage may be blocked */ }
  try {
    if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr')) return 'fr';
  } catch { /* ignore */ }
  return 'en';
}

let current: Lang = detectLang();

export function getLang(): Lang {
  return current;
}

/** Switch the UI language without persisting (settings save handles persistence). */
export function applyLang(lang: Lang): void {
  current = lang;
  try { document.documentElement.lang = lang; } catch { /* non-DOM environment */ }
}

export function setLang(lang: Lang): void {
  applyLang(lang);
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch { /* storage may be blocked */ }
}

// Initialise the <html> lang attribute as soon as the module loads.
try { document.documentElement.lang = current; } catch { /* non-DOM environment */ }

type Dict = Record<string, { en: string; fr: string }>;

const STRINGS: Dict = {
  // ---- main menu ----
  'menu.subtitle': { en: 'Lay out the roads, zone the land, and grow a city.', fr: 'Tracez les routes, zonez les terrains, et faites grandir une ville.' },
  'menu.resume': { en: 'Resume', fr: 'Reprendre' },
  'menu.resumeHint': { en: 'Back to your city', fr: 'Retour à votre ville' },
  'menu.continue': { en: 'Continue', fr: 'Continuer' },
  'menu.new': { en: 'New city', fr: 'Nouvelle ville' },
  'menu.newHint': { en: 'A fresh river valley to build on', fr: 'Une vallée fluviale vierge à bâtir' },
  'menu.demo': { en: 'Demo city', fr: 'Ville de démo' },
  'menu.demoHint': { en: 'A finished city to look around', fr: 'Une ville terminée à visiter' },
  'menu.saved': { en: 'Saved cities', fr: 'Villes sauvegardées' },
  'menu.savedHint': { en: 'Cities you saved by name', fr: 'Vos villes enregistrées par nom' },
  'menu.settings': { en: 'Settings', fr: 'Réglages' },
  'menu.settingsHint': { en: 'Graphics, day length and cheats', fr: 'Graphismes, durée du jour et astuces' },
  'menu.help': { en: 'How to play', fr: 'Comment jouer' },
  'menu.helpHint': { en: 'The basics, in five steps', fr: 'Les bases, en cinq étapes' },
  'menu.newCity': { en: 'New city', fr: 'Nouvelle ville' },
  'menu.seedNote': { en: 'Every seed lays out a different river valley. Keep one you like by noting its number.', fr: 'Chaque graine génère une vallée différente. Notez son numéro pour la retrouver.' },
  'menu.seed': { en: 'Seed', fr: 'Graine' },
  'menu.random': { en: 'Random', fr: 'Aléatoire' },
  'menu.back': { en: 'Back', fr: 'Retour' },
  'menu.start': { en: 'Start city', fr: 'Fonder la ville' },
  'menu.savedTitle': { en: 'Saved cities', fr: 'Villes sauvegardées' },
  'menu.savedEmpty': { en: 'Nothing saved yet. In a city, open the menu and choose “Save or load cities”.', fr: 'Rien d’enregistré pour l’instant. Dans une ville, ouvrez le menu et choisissez « Sauvegarder ou charger ».' },
  'menu.delete': { en: 'Delete', fr: 'Supprimer' },
  'menu.settingsTitle': { en: 'Settings', fr: 'Réglages' },
  'menu.language': { en: 'Language', fr: 'Langue' },
  'menu.languageHint': { en: 'Menu and interface language. Applies immediately.', fr: 'Langue des menus et de l’interface. Appliquée aussitôt.' },
  'menu.visual': { en: 'Visual detail', fr: 'Détail visuel' },
  'menu.visualHint': { en: 'Buildings, trees and vehicles. Low favors speed; High adds finer details. Applies immediately.', fr: 'Bâtiments, arbres et véhicules. Faible = vitesse ; Élevé = détails fins. Appliqué aussitôt.' },
  'menu.low': { en: 'Low', fr: 'Faible' },
  'menu.balanced': { en: 'Balanced', fr: 'Équilibré' },
  'menu.high': { en: 'High', fr: 'Élevé' },
  'menu.shadows': { en: 'Shadows', fr: 'Ombres' },
  'menu.shadowsHint': { en: 'Turn off for more speed on weak hardware', fr: 'Désactivez pour plus de vitesse sur petit matériel' },
  'menu.autosave': { en: 'Save automatically', fr: 'Sauvegarde auto' },
  'menu.autosaveHint': { en: 'Keeps your city in this browser', fr: 'Garde votre ville dans ce navigateur' },
  'menu.disasters': { en: 'Disasters', fr: 'Catastrophes' },
  'menu.disastersHint': { en: 'Floods and tornadoes, from Small town on', fr: 'Inondations et tornades, dès Petite ville' },
  'menu.money': { en: 'Infinite money', fr: 'Argent infini' },
  'menu.moneyHint': { en: 'Building is free and the treasury stays full', fr: 'Construction gratuite et caisse toujours pleine' },
  'menu.day': { en: 'Day length', fr: 'Durée du jour' },  'menu.dayHint': { en: 'How long a day and night takes', fr: 'Durée d’un cycle jour et nuit' },
  'menu.dayWord': { en: 'day', fr: 'jour' },
  'menu.quick': { en: 'Quick · 4 min', fr: 'Court · 4 min' },
  'menu.normal': { en: 'Normal · 8 min', fr: 'Normal · 8 min' },
  'menu.long': { en: 'Long · 16 min', fr: 'Long · 16 min' },
  'menu.alwaysDay': { en: 'Always day', fr: 'Toujours jour' },

  // ---- HUD chrome ----
  'hud.close': { en: 'Close ×', fr: 'Fermer ×' },
  'hud.cityTitle': { en: 'Your city, growing up', fr: 'Votre ville grandit' },
  'hud.cityNote': { en: 'Reach population milestones to earn grants and unlock buildings. Earned levels are permanent.', fr: 'Atteignez les paliers de population pour gagner des subventions et débloquer des bâtiments. Les niveaux acquis sont définitifs.' },
  'hud.coverageNote': { en: 'Coverage is the share of residents served. Capacity and distance matter; providers and homes must connect to the highway. Homes need healthcare and education for apartments; high-rises also need safety, fire protection, recycling and parks.', fr: 'La couverture est la part d’habitants desservis. Capacité et distance comptent ; services et logements doivent être reliés à l’autoroute. Les appartements exigent santé et éducation ; les tours exigent aussi sécurité, pompiers, recyclage et parcs.' },
  'hud.starting': { en: 'Starting tools', fr: 'Outils de départ' },
  'hud.residents': { en: 'residents', fr: 'habitants' },
  'hud.height': { en: 'Height', fr: 'Hauteur' },
  'hud.draw': { en: 'Draw', fr: 'Tracé' },
  'hud.ring': { en: 'Ring', fr: 'Anneau' },
  'hud.brush': { en: 'Brush', fr: 'Pinceau' },
  'hud.rotate': { en: 'Rotate', fr: 'Pivoter' },
  'hud.budget': { en: 'City budget', fr: 'Budget municipal' },
  'hud.allTaxes': { en: 'All taxes', fr: 'Toutes les taxes' },
  'hud.taxNote': { en: 'Farms pay the industrial rate and leisure the commercial one. A district tax break takes four points off.', fr: 'Les fermes paient le taux industriel, les loisirs le taux commercial. L’exonération de quartier retire quatre points.' },
  'hud.netIncome': { en: 'Net income', fr: 'Revenu net' },
  'hud.funding': { en: 'Service funding', fr: 'Financement des services' },
  'hud.fundingNote': { en: '50% funding gives 71% capacity; 150% gives 122%. Upkeep scales with funding. Civic buildings also need power, water and sewage. Congestion reduces their capacity.', fr: '50 % de financement = 71 % de capacité ; 150 % = 122 %. L’entretien suit le financement. Les bâtiments publics exigent aussi électricité, eau et égouts. La congestion réduit leur capacité.' },
  'hud.loan': { en: 'Recovery loan', fr: 'Prêt de relance' },
  'hud.policies': { en: 'City policies', fr: 'Politiques municipales' },
  'hud.policiesNote': { en: 'Each policy is paid for every second, and the bill grows with the city.', fr: 'Chaque politique est payée chaque seconde, et la facture grandit avec la ville.' },
  'hud.messages': { en: 'City messages', fr: 'Messages de la ville' },
  'hud.tutorial': { en: 'Welcome tutorial', fr: 'Tutoriel de bienvenue' },
  'hud.newCity': { en: 'New city', fr: 'Nouvelle ville' },
  'hud.demo': { en: 'Load demo city', fr: 'Charger la démo' },
  'hud.share': { en: 'Copy share link', fr: 'Copier le lien de partage' },
  'hud.mainMenu': { en: 'Main menu', fr: 'Menu principal' },
  'hud.about': { en: 'About Gridburg', fr: 'À propos de Gridburg' },
  'hud.walking': { en: 'Walking', fr: 'À pied' },
  'hud.driving': { en: 'Driving', fr: 'En voiture' },
  'hud.walkKeys': { en: 'W A S D to walk · Shift to run · click, then move the mouse to look · Esc or F to leave', fr: 'ZQSD pour marcher · Maj pour courir · cliquez puis bougez la souris pour regarder · Échap ou F pour quitter' },
  'hud.driveKeys': { en: 'W / S drive and brake · A D steer · Shift nitrous · Space handbrake (drift) · V driver’s seat · Enter at a race ring · R back on the route · Esc or M to park', fr: 'Z / S accélérer et freiner · Q D diriger · Maj nitro · Espace frein à main (drift) · V place conducteur · Entrée sur un anneau de course · R retour au parcours · Échap ou M pour se garer' },

  // ---- tutorial ----
  'tut.kicker': { en: 'YOUR CITY STARTS HERE', fr: 'VOTRE VILLE COMMENCE ICI' },
  'tut.skip': { en: 'Skip tutorial', fr: 'Passer le tutoriel' },
  'tut.back': { en: 'Back', fr: 'Retour' },
  'tut.1.title': { en: 'A patch of land. Your future metropolis.', fr: 'Un bout de terrain. Votre future métropole.' },
  'tut.1.text': { en: 'Your goal is to grow a connected, happy city from a small settlement to 6,500 residents. Balance homes, jobs, services and your budget. Every population milestone earns a grant and new tools. There is no timer—you can keep building after reaching Metropolis.', fr: 'Votre but : faire grandir une ville connectée et heureuse, d’un petit campement à 6 500 habitants. Équilibrez logements, emplois, services et budget. Chaque palier de population rapporte une subvention et de nouveaux outils. Sans limite de temps — continuez après la Métropole.' },
  'tut.1.task': { en: 'Your first milestone: welcome 120 residents.', fr: 'Premier palier : accueillir 120 habitants.' },
  'tut.1.button': { en: 'Show me how', fr: 'Montrez-moi' },
  'tut.2.title': { en: 'Start with a connection', fr: 'Commencez par une connexion' },
  'tut.2.text': { en: 'The highway is your link to the outside world. Extend a road from its end, then zone homes beside it. Add shops for customers and industry for jobs. Keep factories away from homes because pollution spreads.', fr: 'L’autoroute vous relie au monde extérieur. Prolongez une route depuis son extrémité, puis zonez des logements le long. Ajoutez des commerces pour les clients et de l’industrie pour les emplois. Éloignez les usines des maisons, la pollution se propage.' },
  'tut.2.task': { en: 'First steps: extend the highway → zone homes → add jobs.', fr: 'Premiers pas : prolongez l’autoroute → zonez des logements → ajoutez des emplois.' },
  'tut.2.button': { en: 'Next: keep the lights on', fr: 'Suivant : l’énergie' },
  'tut.3.title': { en: 'Give your neighborhoods the essentials', fr: 'L’essentiel pour vos quartiers' },
  'tut.3.text': { en: 'Build a wind turbine, a water tower, and a sewage outlet on the river bank. Utilities travel through connected roads. Keep sewage downstream of drinking-water pumps. Later, a treatment plant filters 95% of its effluent when powered.', fr: 'Construisez une éolienne, un château d’eau et un émissaire d’égout au bord de la rivière. Les réseaux suivent les routes connectées. Gardez les égouts en aval des pompes d’eau potable. Plus tard, la station d’épuration filtre 95 % de ses effluents si elle est alimentée.' },
  'tut.3.task': { en: 'Watch electricity, water and sewage meters at the bottom left.', fr: 'Surveillez les compteurs d’électricité, d’eau et d’égouts en bas à gauche.' },
  'tut.3.button': { en: 'Next: help your city grow', fr: 'Suivant : faire grandir' },
  'tut.4.title': { en: 'Make it a place people want to live', fr: 'Une ville où l’on veut vivre' },
  'tut.4.text': { en: 'Parks improve happiness. As your city grows, add clinics, schools, fire protection, police and waste collection. Apartments need local healthcare and education; towers need wider services. Click a building to see exactly what is missing.', fr: 'Les parcs rendent heureux. En grandissant, ajoutez dispensaires, écoles, pompiers, police et collecte des déchets. Les appartements exigent santé et éducation ; les tours exigent plus de services. Cliquez un bâtiment pour voir ce qui manque.' },
  'tut.4.task': { en: 'Reach milestones, reinvest grants, and check your budget before expanding.', fr: 'Atteignez les paliers, réinvestissez les subventions, vérifiez le budget avant d’étendre.' },
  'tut.4.button': { en: 'Next: connect a bigger city', fr: 'Suivant : connecter' },
  'tut.5.title': { en: 'A bigger city needs more ways to move', fr: 'Une grande ville bouge autrement' },
  'tut.5.text': { en: 'At 400 residents, bus stops can connect homes and jobs and you can buy new highway entrances. At 900, offices bring clean jobs. At 1,800, railway stations add elevated links along roads and metro stations add underground ones. At 3,500, build a regional airport.', fr: 'À 400 habitants, les bus relient logements et emplois, et vous pouvez acheter des entrées d’autoroute. À 900, les bureaux apportent des emplois propres. À 1 800, les gares ajoutent des liaisons aériennes le long des routes, et le métro des liaisons souterraines. À 3 500, construisez un aéroport régional.' },
  'tut.5.task': { en: 'Place two stops or stations with utility service. Routes form automatically.', fr: 'Placez deux arrêts ou gares desservis. Les lignes se créent automatiquement.' },
  'tut.5.button': { en: 'Let’s build', fr: 'Construisons !' },

  // ---- about ----
  'about.title': { en: 'About Gridburg', fr: 'À propos de Gridburg' },
  'about.body': { en: 'A small city builder about traffic: lay out the roads, zone the land, and watch every car find its own way across town.', fr: 'Un petit jeu de construction urbaine autour de la circulation : tracez les routes, zonez les terrains, et regardez chaque voiture trouver son chemin en ville.' },
  'about.local': { en: 'Runs entirely in your browser. Your city is saved locally and shared through a link.', fr: 'Tourne entièrement dans votre navigateur. Votre ville est sauvegardée localement et partagée par lien.' },

  // ---- categories ----
  'cat.roads': { en: 'Roads', fr: 'Routes' },
  'cat.traffic': { en: 'Traffic', fr: 'Circulation' },
  'cat.zones': { en: 'Zones', fr: 'Zones' },
  'cat.power': { en: 'Electricity', fr: 'Électricité' },
  'cat.water': { en: 'Water', fr: 'Eau' },
  'cat.land': { en: 'Land', fr: 'Terrain' },
  'cat.districts': { en: 'Districts', fr: 'Quartiers' },
  'cat.services': { en: 'Services', fr: 'Services' },
  'cat.transport': { en: 'Transport', fr: 'Transports' },
  'cat.parks': { en: 'Parks', fr: 'Parcs' },
  'cat.bulldoze': { en: 'Bulldoze', fr: 'Démolir' },

  // ---- road draw modes ----
  'mode.straight': { en: 'Straight', fr: 'Droite' },
  'mode.straightHint': { en: 'Two clicks: start and end', fr: 'Deux clics : départ et arrivée' },
  'mode.curve': { en: 'Curved', fr: 'Courbe' },
  'mode.curveHint': { en: 'Three clicks: start, bend, end', fr: 'Trois clics : départ, coude, arrivée' },
  'mode.smooth': { en: 'Smooth', fr: 'Fluide' },
  'mode.smoothHint': { en: 'Every click continues the road as a flowing curve', fr: 'Chaque clic prolonge la route en courbe fluide' },
};

/** Translate a chrome key, falling back to English (then to the key itself). */
export function t(key: string): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return current === 'fr' ? entry.fr : entry.en;
}

// ---- domain names (zones, services, civic needs, funding, policies, milestones) ----

const SERVICE_FR: Record<string, string> = {
  'Coal plant': 'Centrale à charbon',
  'Wind turbine': 'Éolienne',
  'Water pump': 'Pompe à eau',
  'Water tower': 'Château d’eau',
  'Sewage outlet': 'Émissaire d’égout',
  'Fishing docks': 'Port de pêche',
  'Neighborhood park': 'Parc de quartier',
  'Medical clinic': 'Dispensaire',
  'Elementary school': 'École primaire',
  'Fire station': 'Caserne de pompiers',
  'Police station': 'Commissariat',
  'Recycling center': 'Centre de recyclage',
  'University': 'Université',
  'Playground': 'Aire de jeux',
  'Sports field': 'Terrain de sport',
  'City park': 'Grand parc',
  'Hospital': 'Hôpital',
  'City hospital': 'Hôpital central',
  'Police headquarters': 'Préfecture de police',
  'Cemetery': 'Cimetière',
  'Crematorium': 'Crématorium',
  'Post office': 'Bureau de poste',
  'Solar farm': 'Ferme solaire',
  'Gas power plant': 'Centrale à gaz',
  'Flood barrier': 'Digue anti-crue',
  'Observation tower': 'Tour d’observation',
  'Hydroelectric dam': 'Barrage hydroélectrique',
  'Nuclear power plant': 'Centrale nucléaire',
  'Bus stop': 'Arrêt de bus',
  'Railway station': 'Gare',
  'Regional airport': 'Aéroport régional',
  'Metro station': 'Station de métro',
  'Sewage treatment plant': 'Station d’épuration',
  'Park path': 'Allée de parc',
  'Park pond': 'Étang',
  'Park kiosk': 'Kiosque',
  'Tree grove': 'Bosquet',
  'Flower bed': 'Massif de fleurs',
  'Bench': 'Banc',
  'Fountain': 'Fontaine',
  'Paved plaza': 'Esplanade',
  'Park lawn': 'Pelouse',
  'Taxi stop': 'Station de taxis',
  'Parking lot': 'Parking',
  'Car park': 'Parc de stationnement',
  'Large car park': 'Grand parking',
  'Trolleybus stop': 'Arrêt de trolleybus',
};

export function serviceName(english: string): string {
  if (current !== 'fr') return english;
  return SERVICE_FR[english] ?? english;
}

const CIVIC_FR: Record<string, string> = {
  health: 'Santé', education: 'Éducation', fire: 'Incendie', safety: 'Sécurité',
  leisure: 'Loisirs', waste: 'Déchets', deathcare: 'Funéraire', mail: 'Courrier',
};

export function civicLabel(english: string, key: string): string {
  if (current !== 'fr') return english;
  return CIVIC_FR[key] ?? english;
}

const FUNDING_FR: Record<string, string> = {
  power: 'Électricité', water: 'Eau', sewage: 'Assainissement',
  health: 'Santé & funéraire', education: 'Éducation', fire: 'Incendie',
  safety: 'Sécurité & courrier', leisure: 'Loisirs', waste: 'Déchets',
};

export function fundingLabel(english: string, key: string): string {
  if (current !== 'fr') return english;
  return FUNDING_FR[key] ?? english;
}

const ZONE_FR: Record<string, string> = {
  Residential: 'Résidentiel', Commercial: 'Commerces', Industrial: 'Industrie',
  Offices: 'Bureaux', Farmland: 'Fermes', 'Leisure & tourism': 'Loisirs & tourisme',
};

export function zoneName(english: string): string {
  if (current !== 'fr') return english;
  return ZONE_FR[english] ?? english;
}

/** Ground the inspector names a tile by when it holds no building: the river, a road, bare land. */
const GROUND_FR: Record<string, string> = {
  River: 'Rivière',
  Road: 'Route',
  'Unzoned land': 'Terrain non zoné',
};

/** The title the inspector puts on a tile: a service, a zone, or just the ground under it. */
export function inspectorName(english: string): string {
  if (current !== 'fr') return english;
  return SERVICE_FR[english] ?? ZONE_FR[english] ?? GROUND_FR[english] ?? english;
}

export function taxLabel(english: string): string {
  if (current !== 'fr') return english;
  const map: Record<string, string> = {
    Residential: 'Taxe résidentielle', Commercial: 'Taxe commerciale',
    Industrial: 'Taxe industrielle', Offices: 'Taxe bureaux',
  };
  return map[english] ?? `${english} tax`;
}

const POLICY_FR: Record<string, { label: string; note: string; effect: string }> = {
  alarms: { label: 'Détecteurs de fumée', note: 'Chaque logement et lieu de travail est équipé d’un détecteur.', effect: 'Départs de feu 55 % moins fréquents' },
  watch: { label: 'Voisins vigilants', note: 'Les habitants surveillent leur rue.', effect: 'La délinquance progresse 40 % moins vite' },
  recycling: { label: 'Programme de recyclage', note: 'Les usines trient et réutilisent leurs déchets.', effect: 'L’industrie pollue 40 % moins' },
  studyGrants: { label: 'Bourses d’études', note: 'La ville finance une partie de chaque place.', effect: 'Écoles et universités desservent 30 % d’habitants en plus' },
  freeTransit: { label: 'Transports publics gratuits', note: 'Bus, trains et métro ne font plus payer.', effect: 'Bien plus d’usagers, mais fin des recettes' },
  congestionCharge: { label: 'Péage urbain', note: 'Entrer en centre-ville en voiture coûte de l’argent.', effect: '25 % de trajets auto en moins et un péage par trajet, au prix de quelques points de bonheur' },
};

export function policyText(id: string, field: 'label' | 'note' | 'effect', english: string): string {
  if (current !== 'fr') return english;
  return POLICY_FR[id]?.[field] ?? english;
}

const MILESTONE_FR: { name: string; unlocks: string }[] = [
  { name: 'Campement', unlocks: 'Routes, zones, réseaux et parcs' },
  { name: 'Village en croissance', unlocks: 'Dispensaire, école primaire et aires de jeux' },
  { name: 'Petite ville', unlocks: 'Pompiers, police, recyclage, bus, épuration et entrées de ville' },
  { name: 'Ville prospère', unlocks: 'Ferme solaire, hôpitaux, terrains de sport, bureaux et tours' },
  { name: 'Cité', unlocks: 'Université, préfecture de police, grands parcs et trains' },
  { name: 'Capitale régionale', unlocks: 'Aéroport régional, hôpital central et subvention' },
  { name: 'Métropole', unlocks: 'Subvention métropolitaine' },
  { name: 'Mégalopole', unlocks: 'Subvention de mégalopole' },
  { name: 'Ville mondiale', unlocks: 'Statut de ville mondiale et subvention finale' },
];

export function milestoneName(index: number, english: string): string {
  if (current !== 'fr') return english;
  return MILESTONE_FR[index]?.name ?? english;
}

export function milestoneUnlocks(index: number, english: string): string {
  if (current !== 'fr') return english;
  return MILESTONE_FR[index]?.unlocks ?? english;
}

// ---- achievements ----

const ACHIEVEMENTS_FR: Record<string, { title: string; text: string }> = {
  'first-home': { title: 'Jour d’emménagement', text: 'La première famille s’installe' },
  'village': { title: 'Sur la carte', text: 'Grandir en village' },
  'town': { title: 'Petite ville', text: 'Atteindre 400 habitants' },
  'city': { title: 'Statut de cité', text: 'Atteindre 1 800 habitants' },
  'metropolis': { title: 'Métropole', text: 'Atteindre 6 500 habitants' },
  'megalopolis': { title: 'Mégalopole', text: 'Atteindre 10 000 habitants' },
  'world': { title: 'Ville mondiale', text: 'Atteindre 15 000 habitants' },
  'happy': { title: 'Ville heureuse', text: 'Bonheur à 90 avec 1 000 habitants' },
  'rich': { title: 'Plein aux as', text: '100 000 $ dans la trésorerie' },
  'clean-power': { title: 'Énergie propre', text: '3 000 MW sans centrale à charbon ni à gaz' },
  'nuclear': { title: 'Atome scindé', text: 'Construire une centrale nucléaire' },
  'landmark': { title: 'Sur les cartes postales', text: 'Construire une tour d’observation' },
  'transit': { title: 'En voiture tout le monde', text: '200 passagers de transport par minute' },
  'tourists': { title: 'Bons baisers de Gridburg', text: '300 visiteurs par minute' },
  'exporter': { title: 'Fabriqué ici', text: 'Exporter 500 unités de marchandises par minute' },
  'value': { title: 'Belle adresse', text: 'Valeur moyenne du sol de 60 avec 2 000 habitants' },
  'clean': { title: 'Ville propre', text: 'Moins de 5 % de déchets avec 1 500 habitants' },
  'commute': { title: 'Trajet express', text: 'Trajets sous les 20 s avec 3 000 habitants' },
  'survivor': { title: 'Tempête essuyée', text: 'Survivre à une inondation ou une tornade' },
  'districts': { title: 'Urbaniste', text: 'Créer trois quartiers' },
  'terraform': { title: 'Remue-ménage', text: 'Creuser ou remblayer vingt cases' },
};

export function achievementTitle(id: string, fallback: string): string {
  if (current !== 'fr') return fallback;
  return ACHIEVEMENTS_FR[id]?.title ?? fallback;
}

export function achievementText(id: string, fallback: string): string {
  if (current !== 'fr') return fallback;
  return ACHIEVEMENTS_FR[id]?.text ?? fallback;
}

// ---- map views ----

const MAP_VIEWS_FR: Record<string, { label: string; note: string }> = {
  none: { label: 'Normale', note: 'Vue classique de la ville' },
  land: { label: 'Valeur du sol', note: 'Vert = recherché, rouge = délaissé' },
  wellbeing: { label: 'Bien-être', note: 'Satisfaction de chaque foyer' },
  noise: { label: 'Bruit', note: 'Trafic, industrie, vie nocturne, aéroport' },
  crime: { label: 'Délinquance', note: 'Où les patrouilles sont requises' },
  garbage: { label: 'Déchets', note: 'Poubelles en attente de collecte' },
  districts: { label: 'Quartiers', note: 'Quartiers délimités et leurs noms' },
  flood: { label: 'Risque d’inondation', note: 'Terres basses inondables' },
};

export function mapViewText(id: string, fallback: { label: string; note: string }): { label: string; note: string } {
  if (current !== 'fr') return fallback;
  return MAP_VIEWS_FR[id] ?? fallback;
}

// ---- roundabout ring sizes ----

const RING_FR: Record<string, { label: string; hint: string }> = {
  auto: { label: 'Adapté aux routes', hint: 'L’anneau s’adapte à la route la plus large' },
  single: { label: 'Une voie', hint: 'Un petit anneau à une voie, pour rues et ruelles' },
  double: { label: 'Deux voies', hint: 'Un anneau taille avenue à deux voies' },
  grand: { label: 'Grand', hint: 'Un large anneau à deux voies pour beaucoup de trafic' },
};

export function ringSizeText(id: string, fallback: { label: string; hint: string }): { label: string; hint: string } {
  if (current !== 'fr') return fallback;
  return RING_FR[id] ?? fallback;
}

// ---- garage, cars, parts and racing ----

const MODELS_FR: Record<string, { name: string; blurb: string }> = {
  hatch: { name: 'Citadine compacte', blurb: 'Votre première voiture : légère, maniable et sage' },
  coupe: { name: 'Coupé sport', blurb: 'Bas et vif, avec aileron arrière' },
  rally: { name: 'Voiture de rallye', blurb: 'Conçue pour glisser : accroche et drift à volonté' },
  muscle: { name: 'Muscle car', blurb: 'Foudroyante en ligne droite, joueuse en virage' },
  super: { name: 'Supercar', blurb: 'Le bolide le plus rapide de la ville' },
};

export function carModelText(id: string, fallback: { name: string; blurb: string }): { name: string; blurb: string } {
  if (current !== 'fr') return fallback;
  return MODELS_FR[id] ?? fallback;
}

const PARTS_FR: Record<string, { name: string; effect: string }> = {
  engine: { name: 'Moteur', effect: 'Vitesse de pointe et accélération' },
  turbo: { name: 'Nitro', effect: 'Une poussée accrue avec Maj' },
  tyres: { name: 'Pneus', effect: 'Adhérence en virage' },
  suspension: { name: 'Suspension', effect: 'Direction plus vive, moins de roulis' },
  brakes: { name: 'Freins', effect: 'Freinage plus court' },
};

export function carPartText(id: string, fallback: { name: string; effect: string }): { name: string; effect: string } {
  if (current !== 'fr') return fallback;
  return PARTS_FR[id] ?? fallback;
}

const RACE_KINDS_FR: Record<string, { label: string; blurb: string }> = {
  circuit: { label: 'Circuit', blurb: 'Boucle fermée contre trois rivaux' },
  sprint: { label: 'Sprint', blurb: 'D’un point à un autre contre trois rivaux' },
  drift: { label: 'Drift', blurb: 'Glissez sur la boucle pour battre le score' },
  drag: { label: 'Départ arrêté', blurb: 'Plein gaz en ligne droite : soignez le départ' },
  police: { label: 'Poursuite', blurb: 'Rejoignez l’arrivée avec la police aux trousses' },
};

export function raceKindText(id: string, fallback: { label: string; blurb: string }): { label: string; blurb: string } {
  if (current !== 'fr') return fallback;
  return RACE_KINDS_FR[id] ?? fallback;
}

// ---- inspector strings ----

const INSPECTOR_EXACT_FR: Record<string, string> = {
  'Ready to zone or build': 'Prêt à zoner ou à construire',
  'Waiting for construction': 'En attente de construction',
  'Maximum building level': 'Niveau de bâtiment maximum',
  'Operating': 'En service',
  'Not operating': 'À l’arrêt',
  'Eligible for growth; construction occurs gradually.': 'Prêt à grandir ; la construction se fait progressivement.',
  'Airport runway clearance: no new construction or building upgrades': 'Dégagement de piste d’aéroport : aucune construction ni surélévation autorisée',
  'Demand is too low: balance homes, jobs and taxes': 'Demande trop faible : équilibrez logements, emplois et taxes',
  'Move polluting industry away from homes': 'Éloignez l’industrie polluante des habitations',
  'This district has a high-rise ban': 'Ce quartier interdit les tours',
  'Rubbish is piling up: a recycling centre sends trucks to collect it': 'Les déchets s’accumulent : construisez un centre de recyclage pour les collecter',
  'Office towers need a City (1,800 residents) and a land value of 45': 'Les tours de bureaux exigent une Cité (1 800 habitants) et une valeur du sol de 45',
  'High-rises unlock at Thriving town (900 residents)': 'Les tours se débloquent à Ville prospère (900 habitants)',
  'Leisure & tourism opens at Small town (400 residents)': 'Loisirs & tourisme s’ouvrent à Petite ville (400 habitants)',
  'Add a second operating stop or station; bus stops need a road route in both directions': 'Ajoutez un second arrêt ou une seconde gare en service ; les bus exigent une route dans les deux sens',
  'Connect this building to the highway': 'Reliez ce bâtiment à l’autoroute',
  'Restore electricity': 'Rétablissez l’électricité',
  'Restore water supply': 'Rétablissez l’eau',
  'Restore sewage capacity': 'Rétablissez l’évacuation des égouts',
  'Connect this amenity to a road or park path': 'Reliez cet équipement à une route ou une allée',
  'Accessible from a road or connected park path': 'Accessible depuis une route ou une allée connectée',
  'Join paths, plazas or lawns to a connected road to activate recreation benefits': 'Reliez allées, esplanades ou pelouses à une route connectée pour activer les loisirs',
  'Needs 3 power and 2 water; congestion can reduce capacity by up to 50%.': 'Exige 3 d’électricité et 2 d’eau ; la congestion peut réduire la capacité jusqu’à 50 %.',
  'Regional flights replace some incoming road trips within 24 cells. Needs power, water and sewage.': 'Les vols régionaux remplacent certains trajets auto entrants dans un rayon de 24 cases. Électricité, eau et assainissement requis.',
  'Works with a single stop. Passengers walk here and take a taxi directly to their destination; four cabs can operate at once. Traffic slows trips. Fares are earned on arrival. Needs power, water and sewage.': 'Fonctionne avec un seul arrêt. Les passagers s’y rendent à pied et prennent un taxi vers leur destination ; quatre taxis circulent en simultané. Recettes perçues à l’arrivée. Réseaux requis.',
  '40 passenger capacity per connection; electric trolleybuses depart automatically on wired surface streets and avenues. Needs power, water and sewage.': 'Capacité de 40 passagers par liaison ; les trolleybus électriques partent automatiquement sur rues et avenues équipées. Réseaux requis.',
  '30 passenger capacity per connection; traffic slows service. Buses depart automatically.': 'Capacité de 30 passagers par liaison ; le trafic ralentit le service. Les bus partent automatiquement.',
  '100 passenger capacity per connection; underground tunnels link metro stations automatically, unaffected by traffic.': 'Capacité de 100 passagers par liaison ; des tunnels relient automatiquement les stations de métro, à l’abri du trafic.',
  '120 passenger capacity per connection; elevated tracks connect stations automatically.': 'Capacité de 120 passagers par liaison ; les voies aériennes relient automatiquement les gares.',
  'Runs two patrol cars at once across a wider district, and answers robberies first.': 'Fait tourner deux voitures de patrouille en même temps sur un large secteur, et répond aux braquages en priorité.',
  'Dispatches patrol cars to nearby buildings. Completed visits deter crime for three minutes; cars also respond to collisions.': 'Envoie des patrouilles vers les bâtiments voisins. Les rondes dissuadent la délinquance pendant 3 minutes ; intervient aussi sur les accidents.',
  'Dispatches one fire engine at a time to reachable fires. After arrival, firefighting takes eight seconds.': 'Envoie un fourgon vers les incendies accessibles. Sur place, l’extinction dure 8 secondes.',
  'Filters 95% of effluent with full electricity. Power shortages reduce filtration.': 'Filtre 95 % des effluents s’il est alimenté en électricité. Les pénuries d’électricité réduisent la filtration.',
};

export function translateInspectorText(text: string): string {
  if (current !== 'fr') return text;
  if (INSPECTOR_EXACT_FR[text]) return INSPECTOR_EXACT_FR[text];

  let m: RegExpMatchArray | null;

  if ((m = text.match(/^Level (\d+)\s+→\s+(\d+)$/))) {
    return `Niveau ${m[1]} → ${m[2]}`;
  }
  if ((m = text.match(/^Service decline: (\d+)s to downgrade$/))) {
    return `Baisse de services : déclassement dans ${m[1]} s`;
  }
  if ((m = text.match(/^Building on fire: (\d+)s before damage\. Needs a responding fire engine\.$/))) {
    return `Bâtiment en feu : dégâts dans ${m[1]} s. Pompiers requis.`;
  }
  if ((m = text.match(/^Crime pressure: (\d+)%\s+·\s+patrol protection: (\d+)s$/))) {
    return `Pression criminelle : ${m[1]} % · patrouille active : ${m[2]} s`;
  }
  if ((m = text.match(/^Ground pollution: (.+)$/))) {
    return `Pollution du sol : ${m[1]}`;
  }
  if ((m = text.match(/^Land value: (\d+)\s+·\s+noise\s+(\d+)\s+·\s+rubbish\s+(\d+)%$/))) {
    return `Valeur du sol : ${m[1]} · bruit ${m[2]} · déchets ${m[3]} %`;
  }
  if ((m = text.match(/^Tax rate here: (\d+)%$/))) {
    return `Taux d’imposition local : ${m[1]} %`;
  }
  if ((m = text.match(/^District (\d+)$/))) {
    return `Quartier ${m[1]}`;
  }
  if ((m = text.match(/^Offices need (\d+)% city education coverage to upgrade$/))) {
    return `Les bureaux ont besoin de ${m[1]} % de couverture scolaire pour grandir`;
  }
  if ((m = text.match(/^Land value (\d+)\s+\/\s+30: parks, transit, a river view and quiet streets raise it$/))) {
    return `Valeur du sol ${m[1]} / 30 : parcs, transports, vue sur l’eau et rues calmes l’augmentent`;
  }
  if ((m = text.match(/^Maturing: (\d+)s remaining$/))) {
    return `Maturation : encore ${m[1]} s`;
  }
  if ((m = text.match(/^Zone demand: (-?\d+)%$/))) {
    return `Demande de zone : ${m[1]} %`;
  }
  if ((m = text.match(/^Visitor appeal: ×([0-9.]+)\s+\(parks and waterfront raise it\)$/))) {
    return `Attrait touristique : ×${m[1]} (parcs et berges l’augmentent)`;
  }
  if ((m = text.match(/^Funding: (\d+)%\s+·\s+upkeep\s+\$([0-9.]+)\/s$/))) {
    return `Financement : ${m[1]} % · entretien ${m[2]} $/s`;
  }
  if ((m = text.match(/^Effective capacity: (\d+)\s+residents\s+·\s+range\s+(\d+)\s+cells$/))) {
    return `Capacité effective : ${m[1]} habitants · rayon ${m[2]} cases`;
  }
  if ((m = text.match(/^(\d+)\s+of 4 taxis carrying passengers\s+·\s+(\d+)-cell walking catchment$/))) {
    return `${m[1]} sur 4 taxis en course · zone piétonne de ${m[2]} cases`;
  }
  if ((m = text.match(/^(\d+)\s+active automatic connections\s+·\s+(\d+)-cell walking catchment$/))) {
    return `${m[1]} liaison(s) automatique(s) active(s) · zone piétonne de ${m[2]} cases`;
  }
  if ((m = text.match(/^Capacity: (\d+)\s+(power|water|sewage)$/))) {
    const kind = m[2] === 'power' ? 'électricité' : m[2] === 'water' ? 'eau' : 'assainissement';
    return `Capacité : ${m[1]} ${kind}`;
  }
  if ((m = text.match(/^(\w+)\s+coverage is under\s+(\d+)%\s+nearby$/))) {
    const civicKey = m[1].toLowerCase();
    const civicName = CIVIC_FR[civicKey] ?? m[1];
    return `Couverture ${civicName.toLowerCase()} inférieure à ${m[2]} % à proximité`;
  }
  if ((m = text.match(/^(\w+)\s+needed for high-rises:\s+(\d+)%\s+\/\s+(\d+)%$/))) {
    const civicKey = m[1].toLowerCase();
    const civicName = CIVIC_FR[civicKey] ?? m[1];
    return `${civicName} requis pour les tours : ${m[2]} % / ${m[3]} %`;
  }

  return text;
}

const UI_MESSAGES_FR: Record<string, string> = {
  'Not enough money': 'Fonds insuffisants',
  'The map’s own motorway cannot be reshaped': 'L’autoroute d’origine ne peut pas être modifiée',
  "The map's own motorway cannot be reshaped": 'L’autoroute d’origine ne peut pas être modifiée',
  "The map's own motorway cannot be changed": 'L’autoroute d’origine ne peut pas être modifiée',
  'Roundabouts keep their shape': 'Les ronds-points gardent leur forme',
  'Roundabouts are removed with the bulldozer': 'Les ronds-points se retirent avec le bulldozer',
  'Offices unlock at Thriving town (900 residents)': 'Les bureaux se débloquent à Ville prospère (900 habitants)',
  'Leisure & tourism unlocks at Small town (400 residents)': 'Les loisirs et le tourisme se débloquent à Petite ville (400 habitants)',
  'City entrances unlock at Small town': 'Les entrées de ville se débloquent à Petite ville',
  'New city entrance opened. Connect its avenue to your neighborhoods.': 'Nouvelle entrée de ville ouverte. Reliez son avenue à vos quartiers.',
  'Traffic lights go on junctions of three or more roads': 'Les feux s’installent aux carrefours d’au moins trois routes',
  'Roundabouts do not need lights': 'Les ronds-points n’ont pas besoin de feux',
  'Stop signs go on junctions of three or more roads': 'Les stops s’installent aux carrefours d’au moins trois routes',
  'Roundabouts already give way': 'Les ronds-points ont déjà la priorité',
  'Bike lanes need a surface street or avenue away from roundabouts': 'Les pistes cyclables exigent une rue ou une avenue au sol, hors rond-point',
  'Pick a street to calm': 'Choisissez une rue à apaiser',
  'Expressways and ramps cannot be calmed': 'Les voies rapides et les bretelles ne peuvent pas être apaisées',
  'Roundabout direction is fixed': 'Le sens du rond-point est fixe',
  'No room for a roundabout here': 'Il n’y a pas assez de place pour un rond-point ici',
  'New map. Build out from the end of the two-lane highway.': 'Nouvelle carte. Prolongez la route depuis l’extrémité de l’autoroute à deux voies.',
  'Demo city loaded': 'Ville de démo chargée',
  'Link copied to clipboard': 'Lien copié dans le presse-papiers',
  'Infinite money on': 'Argent infini activé',
  'Infinite money off': 'Argent infini désactivé',
  'Undone: the last change was taken back and refunded': 'Action annulée : la dernière modification a été retirée et remboursée',
  'Nothing to undo': 'Rien à annuler',
  'Build a road first, then take a car out on it.': 'Construisez d’abord une route, puis sortez une voiture.',
  'That save could not be read': 'Impossible de lire cette sauvegarde',
  'That link is from an older version and cannot be loaded': 'Ce lien provient d’une ancienne version et ne peut pas être chargé',
  'Signal removed': 'Feux supprimés',
  'Every movement needs a green in some phase: give it one elsewhere first': 'Chaque mouvement doit avoir un feu vert dans une phase : ajoutez-le d’abord dans une autre phase',
  'A robbery got away with $1,200. Police stations respond to alarms nearby.': 'Un braquage a rapporté 1 200 $ aux voleurs. Les commissariats proches répondent aux alarmes.',
  'The river is over its banks: water is spreading over the land. Lower any dam, or raise the ground, to hold it back.': 'La rivière déborde et envahit les terres. Abaissez un barrage ou rehaussez le terrain pour contenir l’eau.',
  '$6,000 received. Repayment: $6/s for 1,100 simulation seconds.': '6 000 $ reçus. Remboursement : 6 $/s pendant 1 100 secondes de simulation.',
  'City loan repaid.': 'Prêt municipal remboursé.',
  'No outstanding loan.': 'Aucun prêt en cours.',
};

/** Translate interface notices at their display boundary; unknown text remains readable in English. */
export function translateUiMessage(text: string): string {
  if (current !== 'fr') return text;
  if (UI_MESSAGES_FR[text]) return UI_MESSAGES_FR[text];

  let m: RegExpMatchArray | null;
  if ((m = text.match(/^Grid snap (on|off): (.+)$/))) {
    return m[1] === 'on' ? 'Magnétisme activé : les points de route suivent le centre des cases' : 'Magnétisme désactivé : routes libres, avec repères et angles de 15°';
  }
  if ((m = text.match(/^(.+) unlocks at city level (\d+)\.$/))) return `${m[1]} se débloque au niveau de ville ${m[2]}.`;
  if ((m = text.match(/^Repay the existing loan before borrowing again\. Early repayment needs enough cash\.$/))) return 'Remboursez le prêt en cours avant d’en contracter un autre. Un remboursement anticipé exige assez de fonds.';
  if ((m = text.match(/^Load “(.+)”$/))) return `Ville « ${m[1]} » chargée`;
  if ((m = text.match(/^Loaded “(.+)”$/))) return `Ville « ${m[1]} » chargée`;
  if ((m = text.match(/^Delete “(.+)”\?$/))) return `Supprimer « ${m[1]} » ?`;
  if ((m = text.match(/^Achievement: (.+) — (.+)$/))) return `Succès : ${m[1]} — ${m[2]}`;
  if ((m = text.match(/^(\d+) building fires: fire engines need working stations and clear road access$/))) return `${m[1]} incendie(s) : les pompiers ont besoin de casernes en service et d’un accès routier dégagé`;
  if ((m = text.match(/^(\d+) robbery in progress: the nearest police station is on its way$/))) return `${m[1]} braquage(s) en cours : le commissariat le plus proche est en route`;
  if ((m = text.match(/^(\d+) street racers are out: calmed streets and signals slow them down$/))) return `${m[1]} course(s) de rue : les rues apaisées et les feux les ralentissent`;
  if ((m = text.match(/^(\d+) traffic collisions: blocked vehicles await police or recovery$/))) return `${m[1]} collision(s) : les véhicules bloqués attendent la police ou le dépannage`;
  if ((m = text.match(/^(\d+) crime hotspots: police visits deter crime and restore tax revenue$/))) return `${m[1]} foyer(s) de délinquance : les patrouilles la freinent et rétablissent les recettes fiscales`;
  if ((m = text.match(/^(\d+) homes losing services: inspect the amber markers before they downgrade$/))) return `${m[1]} logement(s) perdent leurs services : inspectez les marqueurs orange avant leur déclassement`;

  const exact: Record<string, string> = {
    'Flood! The river is swollen and climbing its banks. Flood barriers and raised ground keep the water off the streets': 'Inondation ! La rivière monte et déborde. Les digues et le terrain rehaussé empêchent l’eau d’envahir les rues.',
    'Tornado crossing the valley: buildings in its path are being damaged': 'Une tornade traverse la vallée et endommage les bâtiments sur son passage.',
    'Rubbish is piling up: build recycling centres so garbage trucks can collect it': 'Les déchets s’accumulent : construisez des centres de recyclage pour permettre leur collecte.',
    'Shops are importing most of their stock: zone industry or farmland to supply them': 'Les commerces importent la plupart de leurs marchandises : zonez de l’industrie ou des fermes pour les approvisionner.',
    'Draw a street from the end of the two-lane highway, then zone beside it': 'Tracez une rue depuis l’extrémité de l’autoroute à deux voies, puis zonez le long de celle-ci.',
    'Treasury in debt: open Budget to reduce funding or take a recovery loan. Existing zones can still grow.': 'La ville est endettée : ouvrez le budget pour réduire les financements ou prendre un prêt de relance. Les zones existantes peuvent encore grandir.',
    'No power: build a wind turbine or a coal plant next to a road': 'Pas d’électricité : construisez une éolienne ou une centrale à charbon près d’une route.',
    'Power shortage': 'Pénurie d’électricité',
    'No water: build a water tower, or a pump on the river': 'Pas d’eau : construisez un château d’eau ou une pompe sur la rivière.',
    'Water shortage': 'Pénurie d’eau',
    'No sewage: build an outlet on the river, downstream of any pump': 'Aucun assainissement : construisez un émissaire sur la rivière, en aval des pompes.',
    'Sewage is backing up': 'Les eaux usées débordent',
    'Dirty drinking water: move pumps upstream of outlets and towers off polluted ground': 'Eau potable polluée : placez les pompes en amont des émissaires et éloignez les châteaux d’eau des sols pollués.',
    'Pollution is reaching homes': 'La pollution atteint les logements',
    'Gridlock: try buses, rail, avenues or another city entrance': 'Embouteillages : essayez les bus, le train, les avenues ou une autre entrée de ville.',
    'Homes need healthcare: place a clinic near residents': 'Les logements ont besoin de soins : placez un dispensaire près des habitants.',
    'Education limits growth: place schools near homes': 'Le manque d’éducation freine la croissance : placez des écoles près des logements.',
    'Waste coverage is low: build a recycling center': 'La collecte des déchets est insuffisante : construisez un centre de recyclage.',
  };
  return exact[text] ?? text;
}
