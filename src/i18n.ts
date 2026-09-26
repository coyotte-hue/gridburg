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
