import { T_TROLLEY, T_TAXI, T_FLOOD_BARRIER, T_LANDMARK, FLOOD_BARRIER_RADIUS, T_PARKING, T_PARKING_M, T_PARKING_L } from '../constants';
import { COST_DIG, COST_FILL, COST_RAISE, COST_LOWER, TAX_LABELS } from '../extras';
import type { Taxes } from '../extras';
import { GRID, T_BUS, T_STATION, T_SUBWAY, T_AIRPORT, T_TREATMENT, OFFICE_UNLOCK, ENTRY_UNLOCK, COST_ENTRY, LEISURE_UNLOCK } from '../constants';
import { FUNDING_KEYS, FUNDING_LABELS, fundingOutput, LOAN_AMOUNT, LOAN_TOTAL, LOAN_PAYMENT } from '../management';
import { POLICIES, POLICY_IDS } from '../policies';
import type { PolicyId } from '../policies';
import type { FundingKey } from '../management';
import { MILESTONES } from '../progression';
import { SERVICE_TOOL } from '../input';
import { CIVIC_LABELS } from '../constants';
import type { CivicNeed } from '../constants';
import type { Stats, TileReport } from '../sim/messages';
import type { RoadMode, Tool } from '../input';
import { RING_SIZES } from '../roads/network';
import type { RingSize } from '../roads/network';
import { T_DOCKS, DOCK_JOBS, T_GAS, T_HYDRO, T_NUCLEAR } from '../constants';
import { COST_MOTORWAY, COST_RAMP, COST_HIGHWAY2 } from '../constants';
import { COST_AVENUE, COST_LANE, COST_HIGHWAY, COST_LIGHT, COST_STOP, COST_CALM, COST_ROAD, COST_ROUNDABOUT, COST_ZONE, SERVICES, T_COAL, T_OUTLET, T_PUMP, T_TOWER, T_WIND, T_SOLAR } from '../constants';
import { icon } from './icons';
import { getLang, t, serviceName, zoneName, civicLabel, fundingLabel, policyText, milestoneName, milestoneUnlocks, taxLabel, translateInspectorText, translateUiMessage, ringSizeText } from '../i18n';

/** Local shorthand for tool strings: French when the UI language is French, English otherwise. */
const L = (en: string, fr: string): string => getLang() === 'fr' ? fr : en;

/** One line of city trouble, with an id the game can turn into a place to look. */
export interface CityMessage { id: string; text: string }

export interface HudActions {
  setTool(t: Tool): void;
  setMode(m: RoadMode): void;
  setSpeed(v: number): void;
  setTax(v: number): void;
  setTaxes(t: Taxes): void;
  setFunding(key: FundingKey, value: number): void;
  loan(action: 'take' | 'repay'): void;
  rotatePlacement(): void;
  /** Step down into the streets, or back up to the map. */
  toggleWalk(): void;
  toggleDrive(): void;
  setElevation(level: number): void;
  setBrush(size: number): void;
  /** Which roundabout the roundabout tool draws. */
  setRingSize(id: RingSize): void;
  /** Move the camera to whatever a message is about; false when there is nothing to show. */
  focusOn(id: string): boolean;
  closeInspection(): void;
  openMenu(): void;
  setPolicy(id: PolicyId, on: boolean): void;
  newCity(): void;
  demoCity(): void;
  share(): void;
  togglePollution(): boolean;
  toggleInfiniteMoney(): boolean;
  toggleTraffic(): boolean;
}

interface ToolDef { id: Tool; label: string; key?: string; price: string; note?: string; hint: string }
interface Category { id: string; label: string; tools: ToolDef[] }

const money = (n: number): string => `$${n.toLocaleString()}`;
const svc = (k: number): string => money(SERVICES[k].cost);

// Laid out like the Cities: Skylines build menu: pick a category, then a tool from its panel.
// Built once per UI language (changing language reloads the page, so one build is enough).
function buildCategories(): Category[] {
  return [
  {
    id: 'roads', label: t('cat.roads'),
    tools: [
      { id: 'lane', label: L('Lane', 'Ruelle'), key: 'L', price: `${money(COST_LANE)}${L(' / cell', ' / case')}`, note: L('One shared lane', 'Une voie partagée'), hint: L('A narrow, cheap, slow street for the inside of a block. Traffic shares a single carriageway, so keep it away from through routes', 'Une rue étroite, bon marché et lente pour l’intérieur des îlots. Une seule chaussée partagée : à réserver aux voies secondaires') },
      { id: 'road', label: L('Road', 'Rue'), key: 'R', price: `${money(COST_ROAD)}${L(' / cell', ' / case')}`, note: L('Two lanes', 'Deux voies'), hint: L('Click to start, click again to finish. It keeps going from the last point until you join a road, right-click, or press Esc', 'Cliquez pour commencer, recliquez pour finir. Continue depuis le dernier point jusqu’à rejoindre une route, clic droit ou Échap') },
      { id: 'avenue', label: L('Avenue', 'Avenue'), key: 'V', price: `${money(COST_AVENUE)}${L(' / cell', ' / case')}`, note: L('Four lanes, faster', 'Quatre voies, rapide'), hint: L('A wide, fast road that holds far more traffic. Placed the same way as a road', 'Une route large et rapide qui absorbe bien plus de trafic. Se pose comme une rue') },
      { id: 'highway', label: L('Expressway', 'Voie rapide'), key: 'X', price: `${money(COST_HIGHWAY)}${L(' / cell', ' / case')}`, note: L('Fastest · no frontage', 'La plus rapide · sans riverains'), hint: L('Six lanes at expressway speed for crossing the city. Nothing can be zoned or built along it, so feed it with ordinary streets', 'Six voies à vitesse rapide pour traverser la ville. Rien ne peut être zoné ni construit le long : alimentez-la par des rues ordinaires') },
      { id: 'motorway', label: L('One-way highway', 'Autoroute 1 sens'), price: `${money(COST_MOTORWAY)}${L(' / cell', ' / case')}`, note: L('3 lanes · one way', '3 voies · sens unique'), hint: L('One carriageway of a motorway, three lanes in the direction you draw it. Draw the other direction as a second road beside it, as in Cities: Skylines 2. No frontage', 'Une chaussée d’autoroute, trois voies dans le sens du tracé. Tracez l’autre sens juste à côté, façon Cities: Skylines 2. Sans riverains') },
      { id: 'highway2', label: L('Two-lane highway', 'Route 2 voies'), price: `${money(COST_HIGHWAY2)}${L(' / cell', ' / case')}`, note: L('2 lanes · one way', '2 voies · sens unique'), hint: L('A smaller one-way highway, two lanes in the direction you draw it. Pair two of them for a regional road; slip roads join it the same way as the motorway', 'Une petite route à sens unique, deux voies dans le sens du tracé. Associez-en deux pour un axe régional ; les bretelles s’y branchent comme sur l’autoroute') },
      { id: 'ramp', label: L('Highway ramp', 'Bretelle'), price: `${money(COST_RAMP)}${L(' / cell', ' / case')}`, note: L('1 lane · one way', '1 voie · sens unique'), hint: L('A slip road on or off a highway, one way in the direction you draw it. Start it from a highway to make an exit, end it on one to make an on-ramp; press + for a flyover or − to dive under', 'Une bretelle d’entrée ou de sortie, à sens unique dans le sens du tracé. Partez d’une autoroute pour une sortie, finissez dessus pour une entrée ; + pour un saut-de-mouton, − pour passer dessous') },
      { id: 'entry', label: L('City entrance', 'Entrée de ville'), price: money(COST_ENTRY), note: L('New highway access', 'Nouvel accès autoroute'), hint: L('Choose a clear map edge. Adds a seven-cell avenue connecting to the outside world. Unlocks at Small town', 'Choisissez un bord de carte dégagé. Ajoute une avenue de sept cases vers le monde extérieur. Dès Petite ville') },
      { id: 'bikelane', label: L('Bike lanes', 'Pistes cyclables'), price: L('$12 / cell', '12 $ / case'), note: L('Upgrade a street', 'Améliore une rue'), hint: L('Click a surface street or avenue to add compact bike lanes beside its curbs. Click again to remove. Not available on highways, narrow lanes, bridges or roundabouts', 'Cliquez une rue ou une avenue pour ajouter des pistes cyclables le long des trottoirs. Recliquez pour retirer. Indisponible sur autoroutes, ruelles, ponts et ronds-points') },
      { id: 'upgrade', label: L('Upgrade', 'Élargir'), key: 'U', price: L('Difference', 'La différence'), note: L('Widen one step', 'Élargit d’un cran'), hint: L('Click a road to widen it one step: lane, street, avenue, expressway, then back to a lane. Drag along a road to change just that stretch. Widening costs the difference; narrowing is free', 'Cliquez une route pour l’élargir d’un cran : ruelle, rue, avenue, voie rapide, puis retour à ruelle. Glissez le long pour un tronçon. L’élargissement coûte la différence ; rétrécir est gratuit') },
      { id: 'edit', label: L('Edit roads', 'Modifier routes'), key: 'N', price: L('Extra length', 'Longueur ajoutée'), note: L('Drag points and bends', 'Glisser points et virages'), hint: L('Drag a junction or road end to move it: the roads follow, keep their curves, and join whatever they cross. Drag the middle of a road to bend it. You pay only for road you add', 'Glissez un carrefour ou une extrémité pour le déplacer : les routes suivent, gardent leurs courbes et rejoignent ce qu’elles croisent. Glissez le milieu d’une route pour la courber. Vous ne payez que la route ajoutée') },
      { id: 'addlane', label: L('Add lane', 'Ajouter une voie'), price: L('Per lane', 'Par voie'), note: L('Widen one side', 'Élargit un côté'), hint: L('Drag along one side of a road to add a lane there for that stretch; it tapers in and out, and one that ends at a junction becomes a turn pocket. Click for the whole road. Hold Shift to take a lane away, which is free. Cars pick their lane for the turn ahead and change lanes to get by', 'Glissez le long d’un côté pour y ajouter une voie sur ce tronçon ; fuselé aux extrémités, devient une voie de présélection au carrefour. Cliquez pour toute la route. Maj + glisser retire une voie, gratuitement. Les voitures choisissent leur voie selon leur direction et changent de voie pour doubler') },
      { id: 'cut', label: L('Cut', 'Couper'), key: 'Z', price: L('Free', 'Gratuit'), note: L('Remove a road or a stretch', 'Retire route ou tronçon'), hint: L('Click a road to remove it up to the next junctions, or drag along it to cut out just that stretch. Bridges and tunnels come out whole', 'Cliquez une route pour la retirer jusqu’aux carrefours voisins, ou glissez pour ne couper que ce tronçon. Ponts et tunnels sortent d’un bloc') },
    ],
  },
  {
    id: 'traffic', label: t('cat.traffic'),
    tools: [
      { id: 'roundabout', label: L('Roundabout', 'Rond-point'), key: 'O', price: `${money(COST_ROUNDABOUT)}+`, note: L('Never stops', 'Ne s’arrête jamais'), hint: L('Click a junction. Traffic circulates one way and nobody has to wait. Pick the ring beside the cards: matched to the roads, single lane, two lanes, or grand', 'Cliquez un carrefour. La circulation tourne à sens unique sans attendre. Choisissez l’anneau à côté des cartes : adapté aux routes, une voie, deux voies, ou grand') },
      { id: 'light', label: L('Signal', 'Feux'), key: 'T', price: money(COST_LIGHT), note: L('Busy crossings', 'Carrefours chargés'), hint: L('Click a junction to add traffic lights; click a signalised one to edit its plan: phases, green times, and which movements go (click the arrows). Adaptive timing follows the traffic', 'Cliquez un carrefour pour des feux ; recliquez un carrefour à feux pour régler son plan : phases, durées de vert, mouvements autorisés (cliquez les flèches). Le mode adaptatif suit le trafic') },
      { id: 'stopsign', label: L('Stop signs', 'Stops'), key: 'K', price: money(COST_STOP), note: L('All-way halt', 'Arrêt à toutes branches'), hint: L('Click a junction to make every approach stop before entering. Slower than lights, but it keeps a quiet crossing orderly and needs no signal', 'Cliquez un carrefour pour imposer l’arrêt à chaque entrée. Plus lent que les feux, mais ordonné et sans signalisation') },
      { id: 'oneway', label: L('One-way', 'Sens unique'), key: 'Y', price: L('Free', 'Gratuit'), note: L('Click to cycle', 'Cliquez pour changer'), hint: L('Click a road to cycle: one-way, reversed, two-way', 'Cliquez une route pour changer : sens unique, inversé, double sens') },
      { id: 'calm', label: L('Calm street', 'Rue apaisée'), key: 'J', price: `${money(COST_CALM)}${L(' / cell', ' / case')}`, note: L('Slower, safer', 'Plus lente, plus sûre'), hint: L('Click a street to add traffic calming: drivers run at about half speed and collisions become rare. Click again to remove it. Expressways cannot be calmed', 'Cliquez une rue pour l’apaiser : vitesse divisée par deux environ, collisions rares. Recliquez pour retirer. Impossible sur voie rapide') },
    ],
  },
  {
    id: 'zones', label: t('cat.zones'),
    tools: [
      { id: 'res', label: L('Residential', 'Résidentiel'), key: '1', price: `${money(COST_ZONE)}${L(' / cell', ' / case')}`, note: L('Homes', 'Logements'), hint: L('Paint the cells along a road: they show while a zone tool is in hand, up to three rows back. Shift-drag unzones. Homes grow on them facing the street', 'Peignez les cases le long d’une route : visibles tant qu’un outil de zone est en main, jusqu’à trois rangées. Maj + glisser dézone. Les logements y poussent face à la rue') },
      { id: 'com', label: L('Commercial', 'Commerces'), key: '2', price: `${money(COST_ZONE)}${L(' / cell', ' / case')}`, note: L('Shops and commerce', 'Boutiques et commerces'), hint: L('Paint the cells along a road; Shift-drag unzones. Shops want customers nearby', 'Peignez les cases le long d’une route ; Maj + glisser dézone. Les boutiques veulent des clients à proximité') },
      { id: 'office', label: L('Offices', 'Bureaux'), price: `${money(COST_ZONE)}${L(' / cell', ' / case')}`, note: L('Clean jobs · needs education', 'Emplois propres · exige éducation'), hint: L('Clean employment with no industrial pollution. Unlocks at 900 residents; upgrades need 25% then 50% education coverage', 'Emplois propres sans pollution industrielle. Dès 900 habitants ; les évolutions exigent 25 % puis 50 % de couverture scolaire') },
      { id: 'ind', label: L('Industrial', 'Industrie'), key: '3', price: `${money(COST_ZONE)}${L(' / cell', ' / case')}`, note: L('Jobs, pollutes', 'Emplois, pollue'), hint: L('Paint the cells along a road; Shift-drag unzones. Pollutes the ground around it, so keep it away from homes', 'Peignez les cases le long d’une route ; Maj + glisser dézone. Pollue le sol alentour, tenez-la loin des logements') },
      { id: 'farm', label: L('Farmland', 'Fermes'), price: `${money(COST_ZONE)}${L(' / cell', ' / case')}`, note: L('Clean rural jobs', 'Emplois ruraux propres'), hint: L('Fields, barns and greenhouses. Meets industrial demand with few jobs but no pollution and little power; fields drink extra water', 'Champs, granges et serres. Répond à la demande industrielle avec peu d’emplois mais sans pollution ni grosse consommation ; les champs boivent plus d’eau') },
      { id: 'leisure', label: L('Leisure & tourism', 'Loisirs & tourisme'), price: `${money(COST_ZONE)}${L(' / cell', ' / case')}`, note: L('Hotels, cafés, nightlife', 'Hôtels, cafés, vie nocturne'), hint: L('Meets commercial demand with cafés, hotels and nightlife. Pays more tax near parks and the river. Unlocks at 400 residents', 'Répond à la demande commerciale avec cafés, hôtels et vie nocturne. Rapporte plus près des parcs et de la rivière. Dès 400 habitants') },
    ],
  },
  {
    id: 'power', label: t('cat.power'),
    tools: [
      { id: 'wind', label: serviceName('Wind turbine'), price: svc(T_WIND), note: `${SERVICES[T_WIND].power} MW ${L('· clean', '· propre')}`, hint: L('Place beside a road. Power travels along connected roads', 'Placez près d’une route. L’électricité voyage le long des routes connectées') },
      { id: 'solar', label: serviceName('Solar farm'), price: svc(T_SOLAR), note: L('1,800 MW · clean', '1 800 MW · propre'), hint: L('Clean, high-capacity electricity with low running costs. Unlocks at Thriving town', 'Électricité propre de grande capacité, faibles coûts d’entretien. Dès Ville prospère') },
      { id: 'gas', label: serviceName('Gas power plant'), price: svc(T_GAS), note: `${SERVICES[T_GAS].power.toLocaleString()} MW ${L('· some smoke', '· un peu de fumée')}`, hint: L('Less output than coal and about a third of the pollution. Unlocks at Growing village', 'Moins puissante que le charbon et environ trois fois moins polluante. Dès Village en croissance') },
      { id: 'coal', label: serviceName('Coal plant'), price: svc(T_COAL), note: `${SERVICES[T_COAL].power.toLocaleString()} MW ${L('· polluting', '· polluante')}`, hint: L('Lots of power and lots of ground pollution. Keep it away from homes and water towers', 'Beaucoup d’énergie et beaucoup de pollution du sol. Loin des logements et des châteaux d’eau') },
      { id: 'hydro', label: serviceName('Hydroelectric dam'), price: svc(T_HYDRO), note: `${SERVICES[T_HYDRO].power.toLocaleString()} MW ${L('· clean', '· propre')}`, hint: L('Build on the river bank. Clean, steady power from the current. Unlocks at Thriving town', 'À construire au bord de la rivière. Énergie propre et stable du courant. Dès Ville prospère') },
      { id: 'nuclear', label: serviceName('Nuclear power plant'), price: svc(T_NUCLEAR), note: `${SERVICES[T_NUCLEAR].power.toLocaleString()} MW · 3 × 3`, hint: L('Enormous clean output for a large city, at a high price and upkeep. Unlocks at Regional capital', 'Production propre énorme pour une grande ville, à prix fort et gros entretien. Dès Capitale régionale') },
    ],
  },
  {
    id: 'water', label: t('cat.water'),
    tools: [
      { id: 'tower', label: serviceName('Water tower'), price: svc(T_TOWER), note: `${SERVICES[T_TOWER].water}${L(' water', ' d’eau')}`, hint: L('Works anywhere beside a road, but keep it off polluted ground', 'Fonctionne partout près d’une route, mais loin des sols pollués') },
      { id: 'pump', label: L('River pump', 'Pompe de rivière'), price: svc(T_PUMP), note: `${SERVICES[T_PUMP].water.toLocaleString()}${L(' water', ' d’eau')}`, hint: L('Must touch the river. Put it upstream of any sewage outlet (arrows on the water show the flow)', 'Doit toucher la rivière. Placez-la en amont des émissaires (les flèches montrent le courant)') },
      { id: 'treatment', label: serviceName('Sewage treatment plant'), price: svc(T_TREATMENT), note: L('2,200 sewage · 95% filtered', '2 200 égouts · 95 % filtrés'), hint: L('Build on the river bank. Electricity powers filtration, reducing pollution from treated sewage by 95%', 'Au bord de la rivière. L’électricité alimente la filtration, qui réduit de 95 % la pollution traitée') },
      { id: 'docks', label: serviceName('Fishing docks'), price: svc(T_DOCKS), note: `${DOCK_JOBS}${L(' jobs · boats', ' emplois · bateaux')}`, hint: L('Build on the river bank. The docks put fishing boats on the river and sell the catch; sewage upstream thins it, so keep outlets downstream or treated. Unlocks at Small town', 'Au bord de la rivière. Les docks envoient des bateaux pêcher et vendent la pêche ; les égouts en amont l’appauvrissent, gardez les émissaires en aval ou traités. Dès Petite ville') },
      { id: 'outlet', label: serviceName('Sewage outlet'), price: svc(T_OUTLET), note: `${SERVICES[T_OUTLET].sewage.toLocaleString()}${L(' sewage', ' égouts')}`, hint: L('Must touch the river. Fouls the water downstream of it', 'Doit toucher la rivière. Souille l’eau en aval') },
      { id: 'barrier', label: serviceName('Flood barrier'), price: svc(T_FLOOD_BARRIER), note: L(`Protects ${FLOOD_BARRIER_RADIUS} cells`, `Protège ${FLOOD_BARRIER_RADIUS} cases`), hint: L('Build on the river bank. The ground within seven cells of a barrier stands higher than the water can normally climb, so a swollen river spills elsewhere. Unlocks at Small town', 'Au bord de la rivière. Le sol à moins de sept cases d’une digue reste au-dessus de l’eau, la rivière en crue déborde ailleurs. Dès Petite ville') },
    ],
  },
  {
    id: 'land', label: t('cat.land'),
    tools: [
      { id: 'lower', label: L('Lower ground', 'Abaisser'), price: `${money(COST_LOWER)}–${money(COST_DIG)}${L(' / cell', ' / case')}`, note: L('Take down, then dig', 'Descend, puis creuse'), hint: L('Paint to take the ground down a storey with every pass: a hill comes down cheaply, and at ground level you dig in, up to three storeys, the river bed too. A basin fills from below into a lake; a channel cut from the river bank carries the river along it, and damming the old bed then moves the river for good', 'Peignez pour baisser le sol d’un étage par passe : une colline s’aplanit, au niveau du sol on creuse, jusqu’à trois étages, lit de rivière compris. Une cuvette se remplit en lac ; un canal creusé depuis la berge détourne la rivière, et un barrage sur l’ancien lit la déplace pour de bon') },
      { id: 'raise', label: L('Raise ground', 'Rehausser'), price: `${money(COST_RAISE)}–${money(COST_FILL)}${L(' / cell', ' / case')}`, note: L('Fill, then pile up', 'Remblaie, puis élève'), hint: L('Paint to bring the ground up a storey with every pass: a hole or the river is filled in to buildable land (dam the river and the water gathers behind it), and level ground is piled into hills up to four storeys. Nothing can be built or driven on raised ground, but forests climb it', 'Peignez pour monter le sol d’un étage par passe : un trou ou la rivière devient terrain constructible (barrez la rivière et l’eau s’accumule derrière), et le plat devient collines jusqu’à quatre étages. Rien ne se construit ni ne roule sur les hauteurs, mais les forêts y grimpent') },
      { id: 'flat', label: L('Flatten', 'Aplanir'), price: L('By the storey', 'Par étage'), note: L('Back to level', 'Retour au niveau'), hint: L('Paint to bring the ground back to bank level whatever it was: hills come down, holes are filled, and river cells become land', 'Peignez pour ramener le sol au niveau des berges : collines arasées, trous comblés, cases de rivière redevenues terrain') },
    ],
  },
  {
    id: 'districts', label: t('cat.districts'),
    tools: [
      { id: 'district', label: L('Paint district', 'Peindre quartier'), price: L('Free', 'Gratuit'), note: L('Local policies', 'Politiques locales'), hint: L('Brush cells into the district chosen in the district panel; pick a brush size beside the cards. Each district can have its own policies, such as a high-rise ban or a tax break', 'Peignez les cases dans le quartier choisi au panneau ; taille de pinceau à côté des cartes. Chaque quartier peut avoir ses politiques : interdiction des tours, exonération fiscale…') },
      { id: 'undistrict', label: L('Erase district', 'Effacer quartier'), price: L('Free', 'Gratuit'), note: L('Back to citywide', 'Retour au droit commun'), hint: L('Brush cells out of any district', 'Peignez pour retirer des cases de tout quartier') },
    ],
  },
  {
    id: 'services', label: t('cat.services'),
    tools: (['clinic', 'hospital', 'cityhospital', 'school', 'fire', 'police', 'policehq', 'recycling', 'university', 'cemetery', 'crematorium', 'postoffice'] as Tool[]).map(id => {
      const spec = SERVICES[SERVICE_TOOL[id]!];
      const milestone = spec.unlock ?? 0;
      return { id, label: serviceName(spec.name), price: money(spec.cost), note: L(`Base $${spec.upkeep}/s · ${spec.radius} cell radius`, `Base ${spec.upkeep} $/s · rayon ${spec.radius} cases`),
        hint: L(`${spec.name}: serves ${spec.capacity?.toLocaleString()} residents within ${spec.radius} cells. Both building and homes need highway-connected roads. Unlocks at ${MILESTONES[milestone].name}`, `${serviceName(spec.name)} : dessert ${spec.capacity?.toLocaleString()} habitants dans un rayon de ${spec.radius} cases. Le bâtiment et les logements doivent être reliés à l’autoroute. Dès ${milestoneName(milestone, MILESTONES[milestone].name)}`) };
    }),
  },
  {
    id: 'transport', label: t('cat.transport'), tools: [
      { id: 'bus', label: serviceName('Bus stop'), price: svc(T_BUS), note: L('9-cell catchment · $0.45/s', 'Zone 9 cases · 0,45 $/s'), hint: L('Place two stops near homes and jobs. Automatic return routes follow roads; congestion reduces capacity. Needs utilities', 'Placez deux arrêts près des logements et des emplois. Lignes aller-retour automatiques le long des routes ; la congestion réduit la capacité. Réseaux requis') },
      { id: 'station', label: serviceName('Railway station'), price: svc(T_STATION), note: L('3 × 2 cells · $3/s', '3 × 2 cases · 3 $/s'), hint: L('Two stations connect automatically by elevated tracks along road corridors. A station near a city entrance also runs a service out of town. 18-cell catchment, 120 passenger capacity per connection', 'Deux gares se relient automatiquement par voie aérienne le long des routes. Une gare près d’une entrée de ville ouvre aussi une ligne vers l’extérieur. Zone 18 cases, 120 voyageurs par liaison') },
      { id: 'subway', label: serviceName('Metro station'), price: svc(T_SUBWAY), note: L('1 cell · $2.5/s', '1 case · 2,50 $/s'), hint: L('Metro stations link to each other automatically through underground tunnels, so trains skip road traffic. 14-cell catchment, 100 passenger capacity per connection. Needs utilities', 'Les stations de métro se relient automatiquement par tunnels, les trains évitent la circulation. Zone 14 cases, 100 voyageurs par liaison. Réseaux requis') },
      { id: 'taxi', label: serviceName('Taxi stop'), price: svc(T_TAXI), note: L('4 cabs · On-demand rides', '4 taxis · à la demande'), hint: L('One stop dispatches up to four taxis for nearby passengers. Cabs drive directly to destinations through traffic. Needs road access and utilities', 'Un arrêt envoie jusqu’à quatre taxis vers les passagers proches. Les taxis roulent directement à destination dans la circulation. Accès routier et réseaux requis') },
      { id: 'trolley', label: serviceName('Trolleybus stop'), price: svc(T_TROLLEY), note: L('Electric road transit', 'Transport routier électrique'), hint: L('Place two stops beside connected surface streets or avenues. Operating stops create trolleybus routes automatically and need utilities', 'Placez deux arrêts le long de rues ou avenues connectées. Les arrêts en service créent automatiquement des lignes de trolleybus ; réseaux requis') },
      { id: 'parking', label: serviceName(SERVICES[T_PARKING].name), price: svc(T_PARKING), note: L('1 cell · 8 spaces', '1 case · 8 places'), hint: L('A small lot beside a road for shoppers and visitors to leave their cars. Needs a road; no utilities', 'Un petit terrain près d’une route pour garer clients et visiteurs. Route requise ; sans réseaux') },
      { id: 'parkingm', label: serviceName(SERVICES[T_PARKING_M].name), price: svc(T_PARKING_M), note: L('2 × 2 · 36 spaces', '2 × 2 · 36 places'), hint: L('A bigger car park with lamps down its aisles. Needs a road; no utilities. Right-click or G rotates it', 'Un parking plus grand, éclairé dans ses allées. Route requise ; sans réseaux. Clic droit ou G pour pivoter') },
      { id: 'parkingl', label: serviceName(SERVICES[T_PARKING_L].name), price: svc(T_PARKING_L), note: L('3 × 2 · 56 spaces', '3 × 2 · 56 places'), hint: L(`A large car park for a busy centre. Needs a road; no utilities. Unlocks at ${MILESTONES[SERVICES[T_PARKING_L].unlock ?? 0].name}`, `Un grand parking pour un centre animé. Route requise ; sans réseaux. Dès ${milestoneName(SERVICES[T_PARKING_L].unlock ?? 0, MILESTONES[SERVICES[T_PARKING_L].unlock ?? 0].name)}`) },
      { id: 'airport', label: serviceName('Regional airport'), price: svc(T_AIRPORT), note: L('8 × 3 cells · $7/s', '8 × 3 cases · 7 $/s'), hint: L('Clear an 8 × 3 site, its perimeter and 12 cells beyond each runway end. Rotate to aim the flight path. Flights replace some incoming car trips within 24 cells; needs utilities', 'Dégagez un site de 8 × 3, son périmètre et 12 cases au-delà de chaque bout de piste. Pivotez pour orienter l’approche. Les vols remplacent des trajets auto entrants dans un rayon de 24 cases ; réseaux requis') },
    ],
  },
  {
    // Parks and the smaller landscaping pieces share one menu.
    id: 'parks', label: t('cat.parks'),
    tools: [...(['parkpath', 'lawn', 'plaza', 'pond', 'parkshop', 'park', 'playground', 'sports', 'garden'] as Tool[]).map(id => {
      const spec = SERVICES[SERVICE_TOOL[id]!];
      return { id, label: serviceName(spec.name), price: money(spec.cost), note: id === 'parkpath' ? L('Straight or curved · $15 / cell', 'Droit ou courbe · 15 $ / case') : ['lawn', 'plaza'].includes(id) ? L('Drag to paint', 'Glisser pour peindre') : L('Place and rotate', 'Placer et pivoter'),
        hint: spec.decoration ? L('Create your own park on clear land. Join paths, plazas or lawns to a road; ponds and kiosks belong beside them. Paths connect automatically. Right-click or G rotates a piece', 'Créez votre parc sur terrain dégagé. Reliez allées, esplanades ou pelouses à une route ; étangs et kiosques à côté. Les allées se connectent seules. Clic droit ou G pour pivoter') : L(`Place ${spec.name.toLowerCase()} near residents for recreation`, `Placez ${serviceName(spec.name).toLowerCase()} près des habitants pour les loisirs`) };
    }), ...(['tree', 'flowers', 'bench', 'fountain'] as Tool[]).map(id => {
      const spec = SERVICES[SERVICE_TOOL[id]!];
      return { id, label: serviceName(spec.name), price: money(spec.cost), note: spec.standalone ? L('Grows anywhere', 'Pousse partout') : L('Landscape your city', 'Embellissez votre ville'),
        hint: spec.standalone ? L('Plant on clear land, or replace another decoration. Trees need no road, path or utilities to cheer up the homes around them. Bulldoze removes', 'Plantez sur terrain dégagé ou remplacez un décor. Les arbres n’exigent ni route, ni allée, ni réseaux pour égayer les logements voisins. Le bulldozer retire')
          : L('Place on clear land, or replace another decoration. Connect to park paths or a road to benefit nearby residents. G rotates; Bulldoze removes', 'Placez sur terrain dégagé ou remplacez un décor. Reliez aux allées ou à une route pour les riverains. G pivote ; le bulldozer retire') };
    }), { id: 'landmark' as Tool, label: serviceName(SERVICES[T_LANDMARK].name), price: svc(T_LANDMARK), note: L('2 × 2 · draws tourists', '2 × 2 · attire les touristes'), hint: L(`A landmark that draws ${SERVICES[T_LANDMARK].attraction} visitors a minute to the city and lifts land values around it. Unlocks at ${MILESTONES[SERVICES[T_LANDMARK].unlock ?? 0].name}`, `Un monument qui attire ${SERVICES[T_LANDMARK].attraction} visiteurs par minute et valorise les terrains autour. Dès ${milestoneName(SERVICES[T_LANDMARK].unlock ?? 0, MILESTONES[SERVICES[T_LANDMARK].unlock ?? 0].name)}`) }],
  },
  {
    id: 'bulldoze', label: t('cat.bulldoze'),
    tools: [{ id: 'bulldoze', label: t('cat.bulldoze'), key: 'B', price: L('Free', 'Gratuit'), hint: L('Drag a rectangle to remove roads, zones and buildings', 'Glissez un rectangle pour raser routes, zones et bâtiments') }],
  },
  ];
}

const MODES: { id: RoadMode; label: string; hint: string }[] = [
  { id: 'straight', label: t('mode.straight'), hint: t('mode.straightHint') },
  { id: 'curve', label: t('mode.curve'), hint: t('mode.curveHint') },
  { id: 'smooth', label: t('mode.smooth'), hint: t('mode.smoothHint') },
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + 'k';
  return Math.round(n).toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-US');
}

export class Hud {
  private financeValues = new Map<string, HTMLElement>();
  private fundingInputs = new Map<FundingKey, HTMLInputElement>();
  private fundingValues = new Map<FundingKey, HTMLElement>();
  private debtLabel = el('div', 'pnote');
  private borrow = el('button', 'finance-action', L('Borrow $6,000', 'Emprunter 6 000 $'));
  private repay = el('button', 'finance-action', L('Repay balance', 'Rembourser'));
  private inspector = el('section', 'inspector');
  private inspectorBody = el('div');
  private cityTitle = el('span', 'city-title');
  private cityLevel = el('span', 'val');
  private cityNext = el('span', 'city-next');
  private cityFill = el('div', 'city-fill');
  private happiness = el('span', 'happiness');
  private civicMeters = new Map<CivicNeed, HTMLElement>();
  private milestoneRows: HTMLElement[] = [];
  private previousLevel: number | null = null;
  private previousTick = 0;
  private money = el('span', 'val');
  private income = el('span', 'sub');
  private pop = el('span', 'val');
  private jobs = el('span', 'val');
  private cars = el('span', 'sub2');
  private commute = el('span', 'val');
  private util: Record<'power' | 'water' | 'sewage', HTMLElement> = {
    power: el('span', 'mtext'), water: el('span', 'mtext'), sewage: el('span', 'mtext'),
  };
  private utilFill: Record<'power' | 'water' | 'sewage', HTMLElement> = {
    power: el('div', 'mfill'), water: el('div', 'mfill'), sewage: el('div', 'mfill'),
  };
  private budgetIncome = el('span', 'val');
  private policyToggles = new Map<PolicyId, HTMLInputElement>();
  private policyRows = new Map<PolicyId, HTMLElement>();
  private polBtn: HTMLButtonElement = el('button');
  private demandBars: HTMLElement[] = [];
  private toolBtns = new Map<Tool, HTMLButtonElement>();
  private catBtns = new Map<string, HTMLButtonElement>();
  private categories = buildCategories();
  private modeBtns = new Map<string, HTMLButtonElement>();
  private heightBtns = new Map<number, HTMLButtonElement>();
  private brushBtns: [number, HTMLButtonElement][] = [];
  private ringRow: HTMLElement | null = null;
  private ringBtns: [RingSize, HTMLButtonElement][] = [];
  private elevation = 0;
  private panels = new Map<string, HTMLElement>();
  private panel = el('div', 'panel');
  private panelTitle = el('span', 'ptitle');
  private rotateBtn = el('button', 'rotate-btn');
  private openCat: string | null = null;
  private tool: Tool = 'road';
  private mode: RoadMode = 'straight';
  private speedBtns = new Map<number, HTMLButtonElement>();
  private taxLabel = el('span', 'val');
  private taxInput = el('input');
  private zoneTaxInputs: HTMLInputElement[] = [];
  private zoneTaxLabels: HTMLElement[] = [];
  private goodsLine = el('p', 'pnote');
  private toastEl = el('div', 'toast');
  private hint = el('div', 'hint');
  private messagePanel = el('div', 'popover messages');
  private messageList = el('div', 'message-list');
  private messagePop = el('div', 'msgpop');
  private messageDot = el('span', 'dot');
  private messageBtn: HTMLButtonElement = el('button');
  /** What the city is already complaining about, so only genuinely new trouble pops out. */
  private showing = new Set<string>();
  private popTimer = 0;
  private costEl = el('div', 'cost');
  private help: HTMLElement;
  private about = el('div', 'help about');
  private clock = el('div', 'city-clock');
  private walkHint = el('div', 'walk-hint');
  /** The top-right button bar and the menu popover, for panels that live outside the HUD. */
  rightBar!: HTMLElement;
  menuPopover!: HTMLElement;
  private walkBtn: HTMLButtonElement = el('button');
  private driveBtn: HTMLButtonElement = el('button');
  private walkTitle = el('strong', undefined, t('hud.walking'));
  private walkKeys = el('span');
  private speedo = el('b', 'speedo');
  /** Which height the road tool is drawing at: a tunnel, the surface, or a bridge. */
  setElevation(level: number): void {
    this.elevation = level;
    for (const [value, button] of this.heightBtns) button.classList.toggle('active', value === level);
    this.setTool(this.tool);
  }

  setRingSize(id: RingSize): void {
    for (const [value, button] of this.ringBtns) button.classList.toggle('active', value === id);
  }

  setBrush(size: number): void {
    for (const [value, button] of this.brushBtns) button.classList.toggle('active', value === size);
  }

  /** Which way the building in hand is facing, and whether that control applies at all. */
  setRotation(quarter: number, placing: boolean): void {
    this.rotateBtn.classList.toggle('shown', placing);
    this.rotateBtn.style.setProperty('--turn', `${quarter * 90}deg`);
    const facing = [L('north', 'nord'), L('east', 'est'), L('south', 'sud'), L('west', 'ouest')][quarter & 3];
    this.rotateBtn.setAttribute('aria-label', L(`Rotate: facing ${facing}`, `Pivoter : vers ${facing}`));
  }

  /** Walking hides the building tools and shows how to move; the map comes back on the way out. */
  setWalking(on: boolean, mode: 'walk' | 'drive' = 'walk'): void {
    this.walkHint.classList.toggle('open', on);
    this.walkBtn.classList.toggle('active', on && mode === 'walk');
    this.driveBtn.classList.toggle('active', on && mode === 'drive');
    document.body.classList.toggle('walking', on);
    const driving = on && mode === 'drive';
    this.walkTitle.textContent = driving ? t('hud.driving') : t('hud.walking');
    this.walkKeys.textContent = driving ? t('hud.driveKeys') : t('hud.walkKeys');
    this.speedo.hidden = !driving;
  }

  /** The speedometer while driving. */
  setDriveSpeed(kmh: number): void {
    const text = `${kmh} km/h`;
    if (this.speedo.textContent !== text) this.speedo.textContent = text;
  }

  /** The city clock, written by the render loop. */
  setClock(label: string): void {
    if (this.clock.textContent !== label) this.clock.textContent = label;
  }

  /** Reflects the infinite money cheat in the menu. */
  setCheatLabel: (on: boolean) => void = () => {};
  private welcome = el('section', 'welcome');
  private transportStats = el('p', 'pnote transport-stats');
  private incidentStats = el('p', 'pnote');
  private treatmentStats = el('p', 'pnote');
  private tutorialPage = 0;
  private tutorialActions!: HudActions;
  private tutorialReturnSpeed = 1;
  private currentSpeed = 1;

  constructor(root: HTMLElement, actions: HudActions) {
    this.tutorialActions = actions;
    this.messageActions = actions;
    this.welcome.setAttribute('role', 'dialog');
    this.welcome.setAttribute('aria-modal', 'true');
    this.welcome.setAttribute('aria-label', L('Welcome to Gridburg', 'Bienvenue à Gridburg'));
    root.append(this.welcome);
    window.addEventListener('keydown', e => {
      if (!this.welcome.classList.contains('open')) return;
      if (e.key === 'Tab') {
        const buttons = [...this.welcome.querySelectorAll('button')];
        const first = buttons[0], last = buttons.at(-1)!;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      e.stopImmediatePropagation();
    }, true);
    this.inspector.setAttribute('aria-label', L('Building inspector', 'Inspecteur de bâtiment'));
    const dismiss = el('button', 'overview-close', t('hud.close'));
    dismiss.addEventListener('click', () => actions.closeInspection());
    this.inspector.append(dismiss, this.inspectorBody);
    root.append(this.inspector);
    const progress = el('div', 'city-track');
    progress.append(this.cityFill);
    const overview = el('section', 'city-overview');
    overview.setAttribute('aria-label', L('City progress and services', 'Progrès et services de la ville'));
    const close = el('button', 'overview-close', t('hud.close'));
    close.addEventListener('click', () => overview.classList.remove('open'));
    overview.append(close, el('h2', undefined, t('hud.cityTitle')), this.cityTitle, progress, this.cityNext, el('p', 'pnote', t('hud.cityNote')));
    const serviceGrid = el('div', 'civic-grid');
    for (const [key, label] of Object.entries(CIVIC_LABELS)) {
      const meter = el('div', 'civic-stat');
      const value = el('strong', undefined, '0%');
      meter.append(el('span', undefined, civicLabel(label, key)), value);
      serviceGrid.append(meter);
      this.civicMeters.set(key as CivicNeed, value);
    }
    overview.append(this.transportStats, this.treatmentStats, this.incidentStats);
    overview.append(serviceGrid, el('p', 'pnote', t('hud.coverageNote')));
    for (const [i, milestone] of MILESTONES.entries()) {
      const row = el('div', 'milestone');
      row.append(el('span', 'milestone-level', String(i + 1)), el('strong', undefined, milestoneName(i, milestone.name)), el('span', 'milestone-pop', `${fmt(milestone.population)} ${t('hud.residents')}`), el('span', 'milestone-unlocks', milestoneUnlocks(i, milestone.unlocks)), el('span', 'milestone-reward', milestone.reward ? `+$${fmt(milestone.reward)}` : t('hud.starting')));
      this.milestoneRows.push(row);
      overview.append(row);
    }
    const openOverview = (): void => { overview.classList.toggle('open'); };
    root.append(overview);
    // ---- top-left: headline numbers as icon chips ------------------------------------------
    const chips = el('div', 'chips');
    const chip = (ic: string, title: string, ...kids: (HTMLElement | SVGElement)[]): HTMLElement => {
      const c = el('div', 'chip');
      c.title = title;
      c.append(icon(ic, 17), ...kids);
      return c;
    };
    const moneyChip = el('button', 'chip money');
    moneyChip.title = L('Budget and taxes', 'Budget et taxes');
    moneyChip.append(icon('money', 17), this.money, this.income, icon('caret', 12));
    const levelChip = el('button', 'chip level');
    levelChip.title = L('City level: milestones, unlocks and service coverage', 'Niveau de ville : paliers, déblocages et couverture');
    levelChip.append(icon('city', 17), this.cityLevel, this.happiness);
    levelChip.addEventListener('click', openOverview);
    chips.append(
      moneyChip,
      chip('people', L('Population', 'Population'), this.pop),
      chip('jobs', L('Jobs', 'Emplois'), this.jobs),
      chip('car', L('Average commute, and cars on the road', 'Trajet moyen et voitures en circulation'), this.commute, this.cars),
      levelChip,
    );

    // Budget popover: the tax slider lives here instead of on the bar.
    const budget = el('div', 'popover budget');
    const taxRow = el('div', 'prow');
    this.taxInput.type = 'range';
    this.taxInput.min = '0';
    this.taxInput.max = '30';
    this.taxInput.value = '10';
    this.taxInput.addEventListener('input', () => {
      this.taxLabel.textContent = this.taxInput.value + '%';
      actions.setTax(Number(this.taxInput.value));
    });
    this.taxLabel.textContent = '10%';
    taxRow.append(el('span', 'label', t('hud.allTaxes')), this.taxInput, this.taxLabel);
    // One rate per zone; the single slider above sets them all at once.
    const zoneTaxRows: HTMLElement[] = [];
    TAX_LABELS.forEach((label) => {
      const row = el('label', 'funding-row');
      const slider = el('input');
      slider.type = 'range'; slider.min = '0'; slider.max = '30'; slider.value = '10';
      slider.setAttribute('aria-label', taxLabel(label));
      const value = el('span', 'funding-value', '10%');
      slider.addEventListener('input', () => {
        value.textContent = `${slider.value}%`;
        actions.setTaxes(this.zoneTaxInputs.map(i => Number(i.value)) as Taxes);
      });
      row.append(el('span', undefined, taxLabel(label)), slider, value);
      this.zoneTaxInputs.push(slider); this.zoneTaxLabels.push(value);
      zoneTaxRows.push(row);
    });
    const incRow = el('div', 'prow');
    incRow.append(el('span', 'label', L('Net income', 'Revenu net')), this.budgetIncome);
    budget.append(el('div', 'ptitle', t('hud.budget')), taxRow, ...zoneTaxRows, el('p', 'pnote', t('hud.taxNote')));
    this.taxInput.setAttribute('aria-label', L('Tax rate', 'Taux d’imposition'));
    for (const [key, label] of [['fareIncome', L('Transport fares', 'Recettes transport')], ['tollIncome', L('Congestion charge', 'Péage urbain')], ['fishingIncome', L('Fishing', 'Pêche')], ['exportIncome', L('Goods exports', 'Exportations')], ['tourismIncome', L('Tourism', 'Tourisme')], ['taxIncome', L('Tax revenue', 'Recettes fiscales')], ['roadExpense', L('Road upkeep', 'Entretien des routes')], ['serviceExpense', L('Service upkeep', 'Entretien des services')], ['policyExpense', L('Policies', 'Politiques')], ['districtExpense', L('District policies', 'Politiques de quartier')], ['loanExpense', L('Loan payment', 'Remboursement du prêt')]]) {
      const row = el('div', 'finance-row');
      const value = el('strong');
      row.append(el('span', undefined, label), value);
      this.financeValues.set(key, value);
      budget.append(row);
    }
    budget.append(incRow, this.goodsLine, el('div', 'ptitle', t('hud.funding')));
    for (const key of FUNDING_KEYS) {
      const row = el('label', 'funding-row');
      const slider = el('input');
      slider.type = 'range'; slider.min = '50'; slider.max = '150'; slider.step = '10'; slider.value = '100';
      slider.setAttribute('aria-label', L(`${FUNDING_LABELS[key]} funding`, `Financement : ${fundingLabel(FUNDING_LABELS[key], key)}`));
      const value = el('span', 'funding-value', '100%');
      slider.addEventListener('input', () => { value.textContent = `${slider.value}%`; });
      slider.addEventListener('change', () => actions.setFunding(key, Number(slider.value)));
      row.append(el('span', undefined, fundingLabel(FUNDING_LABELS[key], key)), slider, value);
      this.fundingInputs.set(key, slider); this.fundingValues.set(key, value);
      budget.append(row);
    }
    budget.append(el('p', 'pnote', t('hud.fundingNote')));
    this.borrow.addEventListener('click', () => actions.loan('take'));
    this.repay.addEventListener('click', () => actions.loan('repay'));
    const loanActions = el('div', 'loan-actions'); loanActions.append(this.borrow, this.repay);
    budget.append(el('div', 'ptitle', t('hud.loan')), el('p', 'pnote', L(`$${LOAN_AMOUNT.toLocaleString()} cash · $${LOAN_TOTAL.toLocaleString()} total repayment · $${LOAN_PAYMENT}/simulation second. One loan at a time; pauses with the city.`, `${LOAN_AMOUNT.toLocaleString()} $ de trésorerie · ${LOAN_TOTAL.toLocaleString()} $ à rembourser au total · ${LOAN_PAYMENT} $/seconde simulée. Un seul prêt à la fois ; en pause avec la ville.`)), this.debtLabel, loanActions);

    // Policies popover: standing decisions that cost money every second and change how the city behaves.
    const policyPanel = el('div', 'popover policies');
    policyPanel.append(el('div', 'ptitle', t('hud.policies')), el('p', 'pnote', t('hud.policiesNote')));
    for (const id of POLICY_IDS) {
      const spec = POLICIES[id];
      const row = el('label', 'policy-row');
      const box = el('input') as HTMLInputElement;
      box.type = 'checkbox';
      box.setAttribute('aria-label', policyText(id, 'label', spec.label));
      box.addEventListener('change', () => actions.setPolicy(id, box.checked));
      const text = el('span', 'policy-text');
      text.append(
        el('strong', undefined, policyText(id, 'label', spec.label)),
        el('span', 'policy-effect', policyText(id, 'effect', spec.effect)),
        el('span', 'pnote', policyText(id, 'note', spec.note)),
        el('span', 'policy-cost', ''),
      );
      row.append(icon(spec.icon, 20), text, box);
      this.policyToggles.set(id, box);
      this.policyRows.set(id, row);
      policyPanel.append(row);
    }

    // ---- top-right: view toggle, share, help, and a small menu ---------------------------------
    const right = el('div', 'topright');
    this.rightBar = right;
    const iconBtn = (ic: string, title: string, fn: () => void): HTMLButtonElement => {
      const b = el('button', 'iconbtn');
      b.title = title;
      b.append(icon(ic, 19));
      b.addEventListener('click', fn);
      return b;
    };
    this.help = this.buildHelp();
    this.buildAbout();
    const menu = el('div', 'popover menu');
    this.menuPopover = menu;
    const menuItem = (ic: string, label: string, fn: () => void): HTMLButtonElement => {
      const b = el('button', 'mitem');
      b.append(icon(ic, 17), el('span', undefined, label));
      b.addEventListener('click', () => { menu.classList.remove('open'); fn(); });
      return b;
    };
    menu.append(
      menuItem('help', t('hud.tutorial'), () => this.showWelcome()),
      menuItem('plus', t('hud.newCity'), () => { if (confirm(L('Start a new city on a new map? Your current city will be lost.', 'Commencer une nouvelle ville sur une nouvelle carte ? Votre ville actuelle sera perdue.'))) actions.newCity(); }),
      menuItem('city', t('hud.demo'), actions.demoCity),
      menuItem('link', t('hud.share'), actions.share),
      menuItem('menu', t('hud.mainMenu'), actions.openMenu),
      menuItem('about', t('hud.about'), () => this.about.classList.add('open')),
    );
    const cheat = menuItem('money', '', () => { cheatLabel(actions.toggleInfiniteMoney()); });
    const cheatLabel = (on: boolean): void => { cheat.querySelector('span')!.textContent = L(`Infinite money: ${on ? 'on' : 'off'}`, `Argent infini : ${on ? 'oui' : 'non'}`); cheat.classList.toggle('active', on); };
    cheatLabel(false);
    this.setCheatLabel = cheatLabel;
    menu.append(cheat);
    const trafficBtn = iconBtn('car', L('Traffic congestion overlay', 'Calque de congestion'), () => { const on = actions.toggleTraffic(); trafficBtn.classList.toggle('active', on); trafficBtn.setAttribute('aria-pressed', String(on)); });
    trafficBtn.setAttribute('aria-pressed', 'false');
    const polBtn = iconBtn('smog', L('Pollution view (P)', 'Vue pollution (P)'), () => polBtn.classList.toggle('active', actions.togglePollution()));
    this.messagePanel.append(el('div', 'ptitle', t('hud.messages')), this.messageList);
    const menuBtn = iconBtn('menu', L('Menu', 'Menu'), () => { budget.classList.remove('open'); policyPanel.classList.remove('open'); this.messagePanel.classList.remove('open'); menu.classList.toggle('open'); });
    const messageBtn = iconBtn('message', t('hud.messages'), () => {
      budget.classList.remove('open'); policyPanel.classList.remove('open'); menu.classList.remove('open');
      this.messagePop.classList.remove('show');
      this.messagePanel.classList.toggle('open');
    });
    messageBtn.append(this.messageDot);
    this.messageBtn = messageBtn;
    const policyBtn = iconBtn('policy', t('hud.policies'), () => { budget.classList.remove('open'); menu.classList.remove('open'); policyPanel.classList.toggle('open'); });
    const walkBtn = iconBtn('walk', L('Walk the streets (F)', 'Marcher dans les rues (F)'), () => actions.toggleWalk());
    this.walkBtn = walkBtn;
    const driveBtn = iconBtn('drive', L('Garage and street racing (M)', 'Garage et courses de rue (M)'), () => actions.toggleDrive());
    this.driveBtn = driveBtn;
    this.speedo.hidden = true;
    this.walkHint.append(this.walkTitle, this.speedo, this.walkKeys);
    right.append(
      walkBtn, driveBtn, messageBtn, trafficBtn, polBtn, policyBtn,
      iconBtn('link', L('Copy a link to this city', 'Copier un lien vers cette ville'), actions.share),
      iconBtn('help', L('Help (H)', 'Aide (H)'), () => this.help.classList.toggle('open')),
      menuBtn,
    );
    moneyChip.addEventListener('click', () => { menu.classList.remove('open'); policyPanel.classList.remove('open'); budget.classList.toggle('open'); });
    window.addEventListener('pointerdown', (e) => {
      const t = e.target as Node;
      if (!budget.contains(t) && !moneyChip.contains(t)) budget.classList.remove('open');
      if (!menu.contains(t) && !menuBtn.contains(t)) menu.classList.remove('open');
      if (!policyPanel.contains(t) && !policyBtn.contains(t)) policyPanel.classList.remove('open');
      if (!this.messagePanel.contains(t) && !messageBtn.contains(t)) this.messagePanel.classList.remove('open');
    });

    // ---- the bottom bar: city readouts, the build categories and the clock, all in one strip ------
    const status = el('div', 'status');
    const dem = el('div', 'demand');
    dem.title = L('Demand for residential, commercial, industrial and office zones', 'Demande en zones résidentielles, commerciales, industrielles et de bureaux');
    for (const [i, name] of ['R', 'C', 'I', 'O'].entries()) {
      const wrap = el('div', 'dbar');
      const fill = el('div', `dfill d${i}`);
      wrap.append(fill);
      const col = el('div', 'dcol');
      col.append(wrap, el('span', 'dname', name));
      dem.append(col);
      this.demandBars.push(fill);
    }
    const meters = el('div', 'meters');
    for (const [k, ic, title] of [['power', 'power', L('Electricity: used / available', 'Électricité : utilisée / disponible')], ['water', 'water', L('Water: used / available', 'Eau : utilisée / disponible')], ['sewage', 'sewage', L('Sewage: produced / capacity', 'Égouts : produits / capacité')]] as const) {
      const row = el('div', `meter ${k}`);
      row.title = title;
      const bar = el('div', 'mbar');
      bar.append(this.utilFill[k]);
      row.append(icon(ic, 15), bar, this.util[k]);
      meters.append(row);
    }
    status.append(dem, meters);

    this.clock.title = L('One day lasts 8 simulation minutes. Pausing and speed controls also affect daylight.', 'Un jour dure 8 minutes simulées. Pause et vitesses influent aussi sur la lumière du jour.');
    this.clock.setAttribute('aria-label', L('City time', 'Heure de la ville'));
    const speed = el('div', 'speed');
    for (const [v, label] of [[0, '❚❚'], [1, '▶'], [2, '▶▶'], [3, '▶▶▶']] as [number, string][]) {
      const b = el('button', 'sbtn', label);
      b.title = v === 0 ? L('Pause (Space)', 'Pause (Espace)') : L(`Speed ${v}x`, `Vitesse ${v}x`);
      b.addEventListener('click', () => actions.setSpeed(v));
      this.speedBtns.set(v, b);
      speed.append(b);
    }

    this.polBtn = polBtn;
    root.append(chips, budget, policyPanel, this.messagePanel, right, menu, this.messagePop, this.about, this.walkHint);

    // Build menu: a panel of tool cards above a row of category buttons.
    const dock = el('div', 'dock');
    const head = el('div', 'phead');
    this.rotateBtn.append(icon('rotate', 16), el('span', undefined, t('hud.rotate')));
    this.rotateBtn.title = L('Turn the building before placing it (G, or right-click)', 'Pivoter le bâtiment avant de le poser (G ou clic droit)');
    this.rotateBtn.addEventListener('click', () => actions.rotatePlacement());
    head.append(this.panelTitle, this.hint, this.rotateBtn);
    this.panel.append(head);
    for (const c of this.categories) {
      if (c.id === 'bulldoze' || c.id === 'inspect') continue;
      const body = el('div', 'pbody');
      // Height and draw modes: icon buttons in a column that stays put while the cards scroll past.
      const side = el('div', 'modes-wrap');
      if (c.id === 'roads') {
        const height = el('div', 'modes');
        height.append(el('span', 'mlabel', t('hud.height')));
        // Levels, top to bottom: three storeys up, the ground, a tunnel. + and − step between them.
        for (const [level, label] of [[3, L('Level 3', 'Niveau 3')], [2, L('Level 2', 'Niveau 2')], [1, L('Level 1', 'Niveau 1')], [0, L('Ground', 'Sol')], [-1, L('Tunnel', 'Tunnel')]] as [number, string][]) {
          const b = el('button', 'mode');
          if (level > 0) { b.append(icon('bridge', 16), el('span', 'mode-level', String(level))); }
          else b.append(icon(level < 0 ? 'tunnel' : 'road', 20));
          b.title = L(`${label} (+ / − to step)`, `${label} (+ / − pour changer)`);
          b.setAttribute('aria-label', label);
          b.addEventListener('click', () => actions.setElevation(level));
          this.heightBtns.set(level, b);
          height.append(b);
        }
        side.append(height);
      }
      if (c.id === 'roads' || c.id === 'parks') {
        const seg = el('div', 'modes');
        seg.append(el('span', 'mlabel', t('hud.draw')));
        for (const m of MODES) {
          const b = el('button', 'mode');
          b.append(icon(m.id, 20));
          b.title = L(`${m.label}: ${m.hint} (C cycles)`, `${m.label} : ${m.hint} (C pour changer)`);
          b.setAttribute('aria-label', m.label);
          b.addEventListener('click', () => actions.setMode(m.id));
          this.modeBtns.set(`${c.id}:${m.id}`, b);
          seg.append(b);
        }
        side.append(seg);
      }
      if (c.tools.some(t => t.id === 'roundabout')) {
        // Only with the roundabout tool: which ring it draws.
        const ring = el('div', 'modes');
        ring.append(el('span', 'mlabel', t('hud.ring')));
        for (const size of RING_SIZES) {
          const text = ringSizeText(size.id, size);
          const b = el('button', 'mode');
          b.append(icon(`ring-${size.id}`, 20));
          b.title = `${text.label}: ${text.hint}${size.cost > 1 ? ` (${money(Math.round(COST_ROUNDABOUT * size.cost))})` : ''}`;
          b.setAttribute('aria-label', text.label);
          b.classList.toggle('active', size.id === 'auto');
          b.addEventListener('click', () => { actions.setRingSize(size.id); this.setRingSize(size.id); });
          this.ringBtns.push([size.id, b]);
          ring.append(b);
        }
        ring.hidden = true;
        this.ringRow = ring;
        side.append(ring);
      }
      // The brush sizes serve the land and district brushes, and the zone brush too.
      if (c.id === 'land' || c.id === 'districts' || c.id === 'zones') {
        const brush = el('div', 'modes');
        brush.append(el('span', 'mlabel', t('hud.brush')));
        for (const [size, label, ic] of [[0, L('Small brush · one cell', 'Petit pinceau · une case'), 'brush1'], [1, L('Medium brush · about nine cells', 'Pinceau moyen · neuf cases environ'), 'brush2'], [2, L('Large brush · about twenty-five cells', 'Gros pinceau · vingt-cinq cases environ'), 'brush3']] as [number, string, string][]) {
          const b = el('button', 'mode');
          b.append(icon(ic, 20));
          b.title = label;
          b.setAttribute('aria-label', label);
          b.addEventListener('click', () => { actions.setBrush(size); this.setBrush(size); });
          this.brushBtns.push([size, b]);
          brush.append(b);
        }
        side.append(brush);
      }
      if (side.childElementCount) body.append(side);
      for (const t of c.tools) {
        const b = el('button', `card ${t.id}`);
        const art = el('div', 'art');
        art.append(icon(t.id, 30));
        b.append(art, el('span', 'cname', t.label), el('span', 'cprice', t.price));
        if (t.note) b.append(el('span', 'cnote', t.note));
        if (t.key) b.append(el('span', 'ckey', t.key));
        b.title = t.hint;
        b.addEventListener('click', () => actions.setTool(t.id));
        this.toolBtns.set(t.id, b);
        body.append(b);
      }
      this.panels.set(c.id, body);
      this.panel.append(body);
    }
    this.setBrush(1);
    const cats = el('div', 'cats');
    for (const c of this.categories) {
      const b = el('button', `cat ${c.id}`);
      b.append(icon(c.id, 24), el('span', undefined, c.label));
      b.addEventListener('click', () => {
        if (c.id === 'inspect') { actions.setTool(this.tool === 'inspect' ? 'none' : 'inspect'); return; }
        if (c.id === 'bulldoze') { actions.setTool(this.tool === 'bulldoze' ? 'none' : 'bulldoze'); return; }
        // Clicking the open category closes it and puts the tool away, like CS.
        if (this.openCat === c.id) { actions.setTool('none'); return; }
        const current = c.tools.find((t) => t.id === this.tool);
        actions.setTool(current ? current.id : c.tools[0].id);
      });
      this.catBtns.set(c.id, b);
      cats.append(b);
    }
    dock.append(this.panel);
    const bar = el('div', 'bottombar');
    bar.append(status, cats, this.clock, speed);
    root.append(dock, bar, this.toastEl, this.costEl, this.help);

    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'h' || e.key === 'H') this.help.classList.toggle('open');
      if (e.key === 'p' || e.key === 'P') this.polBtn.classList.toggle('active', actions.togglePollution());
      // Escape clears what is open or selected; the main menu has its own button.
      if (e.key === 'Escape') {
        this.help.classList.remove('open');
        overview.classList.remove('open');
        menu.classList.remove('open');
        budget.classList.remove('open');
        policyPanel.classList.remove('open');
        this.messagePanel.classList.remove('open');
        this.messagePop.classList.remove('show');
        this.about.classList.remove('open');
        actions.closeInspection();
      }
    });
    this.setTool('road');
    this.setMode('straight');
    this.setElevation(0);
    this.setSpeed(1);
  }

  /** A short note on who made the game, with a way out to the author's site. */
  private buildAbout(): void {
    this.about.setAttribute('role', 'dialog');
    this.about.setAttribute('aria-modal', 'true');
    this.about.setAttribute('aria-label', t('hud.about'));
    const card = el('div', 'card');
    card.innerHTML = getLang() === 'fr' ? `
      <h2>À propos de Gridburg</h2>
      <p>Un petit jeu de construction urbaine autour de la circulation : tracez les routes, zonez les terrains, et regardez chaque voiture trouver son chemin en ville.</p>
      <p>Créé par <a href="https://karakabakov.com" target="_blank" rel="noopener noreferrer">karakabakov.com</a>.</p>
      <p class="dim">Tourne entièrement dans votre navigateur. Votre ville est sauvegardée localement et partagée par lien.</p>` : `
      <h2>About Gridburg</h2>
      <p>A small city builder about traffic: lay out the roads, zone the land, and watch every car find
      its own way across town.</p>
      <p>Built by <a href="https://karakabakov.com" target="_blank" rel="noopener noreferrer">karakabakov.com</a>.</p>
      <p class="dim">Runs entirely in your browser. Your city is saved locally and shared through a link.</p>`;
    const close = el('button', 'menu-mini primary', t('hud.close'));
    close.addEventListener('click', () => this.about.classList.remove('open'));
    card.append(close);
    this.about.append(card);
    this.about.addEventListener('click', e => { if (e.target === this.about) this.about.classList.remove('open'); });
  }

  private buildHelp(): HTMLElement {
    const h = el('div', 'help');
    h.innerHTML = getLang() === 'fr' ? `
      <div class="card">
        <h2>Gridburg</h2>
        <p>Un petit jeu de construction urbaine autour de la circulation. Tout le monde arrive par l’<b>autoroute</b> au bord de la carte :
        commencez par tirer une route depuis son extrémité, puis zonez le long de vos routes.</p>
        <ul>
          <li><b>Routes</b> — choisissez Rue ou Avenue, puis <b>cliquez</b> pour poser des points. <b>Droite</b> en deux clics,
          <b>Courbe</b> en départ, coude, arrivée, et <b>Fluide</b> continue de clic en clic. <b>C</b> change de mode ;
          clic droit ou <b>Échap</b> pour arrêter. Les croisements deviennent des carrefours</li>
          <li><b>Accrochage</b> — les routes vont partout. Les points rejoignent les routes proches, s’accrochent aux guides en pointillés (tout droit, perpendiculaire, parallèle) et tournent par pas de 15° en longueurs de cases entières. Maintenez <b>Alt</b> pour poser librement, ou <b>G</b> avec un outil route pour l’accrochage au centre des cases</li>
          <li><b>Voies</b> — chaque route a des voies vraiment utilisées : les voitures choisissent leur voie selon leur direction, doublent à l’arrêt, et traversent un carrefour ensemble quand leurs trajectoires ne se croisent pas. <b>Ajouter une voie</b> élargit un côté d’un tronçon (glissez le long ; Maj + glisser rétrécit). Les flèches peintes montrent le sens de chaque voie</li>
          <li><b>Édition</b> — <b>Modifier routes (N)</b> déplace carrefours, extrémités et virages ; <b>Couper (Z)</b> retire une route ou un tronçon glissé ; <b>Élargir</b> élargit un tronçon glissé. <b>Ctrl+Z</b> annule</li>
          <li><b>Niveaux</b> — avec une route en main, <b>+</b> et <b>−</b> règlent le niveau du prochain point : tunnel, sol, ou jusqu’à trois étages. Entre niveaux, la route devient rampe (4 cases par niveau). Les routes au même niveau se rejoignent, même en l’air ; à un niveau d’écart elles se croisent dessus ou dessous. Une route au sol sur l’eau devient un pont toute seule</li>
          <li><b>Quatre types de routes</b> — Ruelle, Rue, Avenue et Voie rapide, par largeur, vitesse et prix croissants.
          Rien ne se zone le long d’une voie rapide : alimentez-la par des rues ordinaires. <b>Élargir (U)</b> monte une route d’un cran</li>
          <li><b>Circulation</b> — les voitures font vraiment la queue. Les carrefours chargés coincent ; soignez-les avec des <b>avenues</b>, des <b>feux</b>,
          des <b>sens uniques</b> ou des <b>ronds-points</b>. Les routes rougissent où le trafic ralentit</li>
          <li><b>Réseaux</b> suivent les routes. Les bâtiments exigent <b>électricité</b>, <b>eau</b> et <b>égouts</b> pour grandir.
          Pompes et émissaires au bord de la rivière ; gardez la pompe en <b>amont</b> (les flèches montrent le courant)</li>
          <li><b>Inspection</b> — cliquez un bâtiment pour voir sa couverture locale et ses blocages. Les repères orange annoncent un déclassement après 180 secondes simulées</li>
          <li><b>Budget</b> — cliquez votre trésorerie pour régler le financement, voir les dépenses ou prendre un prêt de relance remboursable. Le privé continue de construire même en dette</li>
          <li><b>Cases</b> — zones et bâtiments occupent des cases. Les petits bâtiments pivotent face à leur route quel qu’en soit l’angle, les grands sites restent sur la grille</li>
          <li><b>Niveaux de ville</b> — grandissez pour gagner des subventions et débloquer des bâtiments. La pastille en haut à gauche montre niveau et bonheur ; cliquez-la pour le prochain palier et la couverture</li>
          <li><b>Messages</b> — tout ce qui va mal s’accumule derrière la cloche en haut à droite. Chaque nouveauté surgit quelques secondes, et un clic sur un message y emmène la caméra</li>
          <li><b>Pose</b> — clic droit, <b>G</b> ou Pivoter dans le panneau pour tourner un bâtiment avant de le poser</li>
          <li><b>À pied</b> — <b>F</b> ou le bouton marcheur pour descendre dans les rues. <b>ZQSD</b> pour marcher, <b>Maj</b> pour courir, cliquez puis bougez la souris pour regarder, <b>Échap</b> pour remonter</li>
          <li><b>En voiture</b> — <b>M</b> ou le bouton voiture pour conduire. <b>Z/S</b> accélérer et freiner, <b>Q/D</b> diriger, <b>Maj</b> vitesse, <b>Espace</b> frein à main, <b>V</b> place conducteur, <b>Échap</b> pour se garer</li>
          <li><b>Services de quartier</b> — les parcs rendent heureux. Dès Village en croissance, les logements exigent dispensaire et école à proximité pour devenir appartements. Les tours se débloquent à Ville prospère et exigent les six services. Chaque équipement a capacité et portée limitées ; tous exigent des routes reliées à l’autoroute</li>
          <li><b>Couverture</b> — choisir un service colore sa zone déjà desservie, pour placer le suivant dans un trou. Un outil transport montre les lignes du mode à la place</li>
          <li><b>Trains</b> — deux gares se relient seules par voie aérienne le long des rues, et une gare près d’une entrée de ville ouvre aussi une ligne vers l’extérieur, qui amène et emmène des gens par train</li>
          <li><b>Politiques</b> — des choix permanents comme le recyclage, les détecteurs ou les transports gratuits. Coûtent de l’argent chaque seconde, facture croissante avec la ville</li>
          <li><b>Pollution</b> de l’industrie et du charbon, qui se propage dans le sol et chasse les habitants. <b>P</b> pour la voir</li>
        </ul>
        <p><b>Glisser gauche</b> construire · <b>Glisser droit</b> pivoter · <b>Q / E</b> pivoter · <b>ZQSD</b> déplacer · <b>Molette</b> zoom ·
        <b>Espace</b> pause · <b>Échap</b> annuler</p>
        <p class="dim">Votre ville est sauvegardée dans ce navigateur. Partager copie un lien contenant toute la ville. H ou clic pour fermer.</p>
      </div>` : `
      <div class="card">
        <h2>Gridburg</h2>
        <p>A small city builder about traffic. Everyone arrives by the <b>highway</b> at the edge of the map,
        so start by drawing a road from the end of it, then zone next to your roads.</p>
        <ul>
          <li><b>Roads</b> — pick Road or Avenue, then <b>click</b> to place points. <b>Straight</b> is two clicks,
          <b>Curved</b> is start, bend, end, and <b>Smooth</b> keeps flowing from click to click. <b>C</b> cycles the modes;
          right-click or <b>Esc</b> stops. Crossings become junctions</li>
          <li><b>Snapping</b> — roads go anywhere. Points join nearby roads, catch on dashed guides (straight on, square to a road, parallel) and turn in 15° steps with whole-cell lengths. Hold <b>Alt</b> to place freely, or press <b>G</b> with a road tool for tile-centre grid snap</li>
          <li><b>Lanes</b> — every road has lanes that carry traffic: cars pick the lane for their next turn, change lanes to get by, and cross a junction together when their paths do not cross. <b>Add lane</b> widens one side of a stretch (drag along it; Shift-drag narrows it). Painted arrows show which way each lane goes</li>
          <li><b>Editing</b> — <b>Edit roads (N)</b> drags junctions, ends and bends; <b>Cut (Z)</b> removes a road or drags out a stretch; <b>Upgrade</b> drags to widen part of a road. <b>Ctrl+Z</b> undoes</li>
          <li><b>Levels</b> — with a road in hand, <b>+</b> and <b>−</b> set the level of the next point: a tunnel, the ground, or up to three levels up. Between levels the road is a ramp (4 cells per level). Roads at the same level join, even in the air; a level apart they pass over or under. A ground road drawn across water becomes a bridge on its own</li>
          <li><b>Four road types</b> — Lane, Road, Avenue and Expressway, in rising order of width, speed and price.
          Nothing can be zoned along an expressway, so feed it with ordinary streets. <b>Upgrade (U)</b> widens a road one step</li>
          <li><b>Traffic</b> — cars queue for real. Busy junctions jam; fix them with <b>avenues</b>, <b>signals</b>,
          <b>one-way</b> streets or <b>roundabouts</b>. Roads turn red where traffic is slow</li>
          <li><b>Utilities</b> run along roads. Buildings need <b>power</b>, <b>water</b> and <b>sewage</b> to grow past
          small. Pumps and outlets sit on the river; keep the pump <b>upstream</b> (arrows show the flow)</li>
          <li><b>Inspect</b> — click any building to see its local coverage and growth blockers. Amber markers warn of a service downgrade after 180 simulation seconds</li>
          <li><b>Budget</b> — click your treasury to adjust service funding, review expenses or take a repayable recovery loan. Private development continues while the city is in debt</li>
          <li><b>Grid</b> — zones and buildings sit on cells. Small buildings turn to face their road at any angle, larger sites keep to the grid</li>
          <li><b>City levels</b> — grow population to earn grants and unlock civic buildings. The chip in the top-left corner shows your level and how happy the city is; click it for your next milestone and service coverage</li>
          <li><b>Messages</b> — anything going wrong collects behind the bell in the top-right corner. New trouble pops out for a few seconds, and clicking a message takes you to it</li>
          <li><b>Placing</b> — right-click, press <b>G</b> or use Rotate in the panel to turn a building before you put it down</li>
          <li><b>Walking</b> — press <b>F</b> or the walker button to step down into the streets. <b>WASD</b> walks, <b>Shift</b> runs, click then move the mouse to look, and <b>Esc</b> takes you back up</li>
          <li><b>Driving</b> — press <b>M</b> or the car button to take a car out. <b>W/S</b> drive and brake, <b>A/D</b> steer, <b>Shift</b> for speed, <b>Space</b> handbrake, <b>V</b> driver’s seat, <b>Esc</b> to park</li>
          <li><b>Neighborhood services</b> — parks improve happiness. From Growing village, homes need a clinic and school nearby to become apartments. High-rises unlock at Thriving town and need all six civic services. Each provider has limited capacity and range; all need highway-connected roads</li>
          <li><b>Coverage</b> — picking a service paints where that service already reaches, so the next one lands in a gap. A transport tool shows that mode's routes instead</li>
          <li><b>Railways</b> — two stations connect themselves by elevated track along the streets, and a station near a city entrance also runs a service out of town, bringing people in and out by train</li>
          <li><b>Policies</b> — standing decisions like recycling, smoke alarms or free public transport. They cost money every second and the bill grows with the city</li>
          <li><b>Pollution</b> from industry and coal spreads through the ground and drives residents away. Press <b>P</b> to see it</li>
        </ul>
        <p><b>Left drag</b> build · <b>Right drag</b> rotate · <b>Q / E</b> rotate · <b>WASD</b> pan · <b>Wheel</b> zoom ·
        <b>Space</b> pause · <b>Esc</b> cancel</p>
        <p class="dim">Your city saves in this browser. Share copies a link containing the whole city. Press H or click to close.</p>
      </div>`;
    h.addEventListener('click', () => h.classList.remove('open'));
    return h;
  }

  showWelcome(): void {
    this.tutorialReturnSpeed = this.currentSpeed;
    this.tutorialActions.setSpeed(0);
    this.tutorialPage = 0;
    this.welcome.classList.add('open');
    for (const sibling of this.welcome.parentElement!.children) if (sibling !== this.welcome) (sibling as HTMLElement).inert = true;
    this.renderWelcome();
  }

  private renderWelcome(): void {
    const pages = [
      { icon: 'city', title: t('tut.1.title'), text: t('tut.1.text'), task: t('tut.1.task'), button: t('tut.1.button') },
      { icon: 'road', title: t('tut.2.title'), text: t('tut.2.text'), task: t('tut.2.task'), button: t('tut.2.button') },
      { icon: 'water', title: t('tut.3.title'), text: t('tut.3.text'), task: t('tut.3.task'), button: t('tut.3.button') },
      { icon: 'services', title: t('tut.4.title'), text: t('tut.4.text'), task: t('tut.4.task'), button: t('tut.4.button') },
      { icon: 'transport', title: t('tut.5.title'), text: t('tut.5.text'), task: t('tut.5.task'), button: t('tut.5.button') },
    ];
    const page = pages[this.tutorialPage];
    const card = el('div', 'welcome-card');
    const art = el('div', 'welcome-art'); art.append(icon(page.icon, 72));
    const count = el('p', 'welcome-step', `${t('tut.kicker')} · ${this.tutorialPage + 1} / ${pages.length}`);
    const row = el('div', 'welcome-actions');
    const close = (): void => {
      this.welcome.classList.remove('open');
      for (const sibling of this.welcome.parentElement!.children) (sibling as HTMLElement).inert = false;
      try { localStorage.setItem('gridburg.welcome.v1', 'done'); } catch { /* optional storage */ }
      this.tutorialActions.setSpeed(this.tutorialReturnSpeed);
    };
    const skip = el('button', 'welcome-skip', t('tut.skip')); skip.addEventListener('click', close);
    if (this.tutorialPage > 0) {
      const back = el('button', 'welcome-skip', t('tut.back'));
      back.addEventListener('click', () => { this.tutorialPage--; this.renderWelcome(); }); row.append(back);
    }
    const next = el('button', 'welcome-next', page.button);
    next.addEventListener('click', () => { if (this.tutorialPage === pages.length - 1) close(); else { this.tutorialPage++; this.renderWelcome(); } });
    row.append(skip, next);
    card.append(count, art, el('h1', undefined, page.title), el('p', 'welcome-copy', page.text), el('p', 'welcome-task', page.task), row);
    this.welcome.replaceChildren(card); next.focus();
  }

  setTool(t: Tool): void {
    this.tool = t;
    for (const [id, b] of this.toolBtns) b.classList.toggle('active', id === t);
    const cat = this.categories.find((c) => c.tools.some((x) => x.id === t)) ?? null;
    this.openCat = cat && cat.id !== 'bulldoze' && cat.id !== 'inspect' ? cat.id : null;
    for (const [id, b] of this.catBtns) b.classList.toggle('active', cat !== null && id === cat.id);
    for (const [id, body] of this.panels) body.classList.toggle('open', id === this.openCat);
    this.panel.classList.toggle('open', this.openCat !== null);
    this.panelTitle.textContent = cat ? cat.label : '';
    if (this.ringRow) this.ringRow.hidden = t !== 'roundabout';
    this.refreshHint();
  }

  setMode(m: RoadMode): void {
    this.mode = m;
    for (const [id, b] of this.modeBtns) b.classList.toggle('active', id.endsWith(`:${m}`));
    this.refreshHint();
  }

  private refreshHint(): void {
      const def = this.categories.flatMap((c) => c.tools).find((x) => x.id === this.tool);
    if (!def) { this.hint.textContent = ''; return; }
    if (['lane', 'road', 'avenue', 'highway', 'motorway', 'highway2', 'ramp', 'parkpath'].includes(this.tool)) {
      const m = MODES.find((x) => x.id === this.mode)!;
      const height = this.elevation > 0 ? `Level ${this.elevation}: the next point goes in ${this.elevation} up. Ramps need 4 cells per level; roads at the same level join, a level apart they pass. ` : this.elevation < 0 ? 'Tunnel: the next point goes in underground; ramps need 4 cells. ' : '';
      this.hint.textContent = `${height}${m.label}: ${m.hint.toLowerCase()}. Keeps going until you join a road, right-click or press Esc`;
    } else {
      this.hint.textContent = def.hint;
    }
  }

  setSpeed(v: number): void {
    this.currentSpeed = v;
    for (const [id, b] of this.speedBtns) b.classList.toggle('active', id === v);
  }

  setTax(v: number): void {
    this.taxInput.value = String(v);
    this.taxLabel.textContent = v + '%';
    this.zoneTaxInputs.forEach((input, z) => { input.value = String(v); this.zoneTaxLabels[z].textContent = `${v}%`; });
  }

  setCost(text: string | null, x: number, y: number, ok: boolean): void {
    if (!text) { this.costEl.classList.remove('show'); return; }
    this.costEl.textContent = text;
    this.costEl.classList.add('show');
    this.costEl.classList.toggle('bad', !ok);
    this.costEl.style.left = `${x + 16}px`;
    this.costEl.style.top = `${y + 12}px`;
  }

  showInspection(report: TileReport | null): void {
    this.inspector.classList.toggle('open', report !== null);
    if (!report) return;
    const title = el('h2', undefined, zoneName(serviceName(report.name)));
    const where = el('p', 'pnote', `${L('Cell', 'Case')} ${report.tile % GRID}, ${Math.floor(report.tile / GRID)}${report.occupants ? ` · ${report.occupants} ${report.name === 'Residential' ? L('residents', 'habitants') : L('jobs', 'emplois')}` : ''}`);
    const status = el('p', report.neglect ? 'neg' : 'inspection-status', translateInspectorText(report.status));
    const details = report.details.map(detail => el('p', 'pnote', translateInspectorText(detail)));
    const needs = el('div', 'inspection-needs');
    for (const [key, value] of Object.entries(report.coverage)) {
      const row = el('div', 'finance-row'); row.append(el('span', undefined, civicLabel(CIVIC_LABELS[key as CivicNeed], key)), el('strong', undefined, `${value}%`)); needs.append(row);
    }
    const blockers = el('ul', 'inspection-blockers');
    for (const reason of report.blockers) blockers.append(el('li', undefined, translateInspectorText(reason)));
    this.inspectorBody.replaceChildren(title, where, status, ...details, needs, blockers);
  }

  resetProgress(): void {
    this.previousLevel = null;
    this.previousTick = 0;
  }

  update(s: Stats): void {
    for (const [key, value] of this.financeValues) {
      const amount = key === 'fareIncome' ? s.transport.fareIncome : key === 'exportIncome' ? s.goods.income : key === 'tourismIncome' ? s.tourism.income
        : s[key as 'taxIncome' | 'tollIncome' | 'fishingIncome' | 'roadExpense' | 'serviceExpense' | 'policyExpense' | 'loanExpense' | 'districtExpense'];
      value.textContent = `$${amount.toFixed(2)}/s`;
    }
    this.zoneTaxInputs.forEach((input, z) => {
      if (document.activeElement === input || !s.taxes) return;
      input.value = String(s.taxes[z]); this.zoneTaxLabels[z].textContent = `${s.taxes[z]}%`;
    });
    const g = s.goods;
    this.goodsLine.textContent = L(`Goods: ${fmt(g.produced)} made, ${fmt(g.needed)} needed a minute · ${fmt(g.exported)} exported of ${fmt(g.capacity)} capacity · ${fmt(g.imported)} imported${g.importShare > 0.3 ? ' — shops lose takings buying in stock, so zone more industry or farms' : ''}. ${fmt(s.tourism.visitors)} visitors a minute.`, `Marchandises : ${fmt(g.produced)} produites, ${fmt(g.needed)} nécessaires par minute · ${fmt(g.exported)} exportées sur ${fmt(g.capacity)} de capacité · ${fmt(g.imported)} importées${g.importShare > 0.3 ? ' — les commerces perdent des recettes en important ; zonez plus d’industrie ou de fermes' : ''}. ${fmt(s.tourism.visitors)} visiteurs par minute.`);
    for (const key of FUNDING_KEYS) {
      const slider = this.fundingInputs.get(key)!;
      if (document.activeElement !== slider) {
        slider.value = String(s.funding[key]);
        this.fundingValues.get(key)!.textContent = `${s.funding[key]}%`;
      }
      slider.title = `${Math.round(fundingOutput(s.funding[key] / 100) * 100)}% capacity`;
    }
    for (const id of POLICY_IDS) {
      const spec = POLICIES[id], locked = s.cityLevel < spec.unlock;
      const box = this.policyToggles.get(id)!, row = this.policyRows.get(id)!;
      box.checked = s.policies[id];
      box.disabled = locked;
      row.classList.toggle('locked', locked);
      row.classList.toggle('on', s.policies[id]);
      const cost = spec.base + spec.perResident * s.pop;
      row.querySelector('.policy-cost')!.textContent = locked
        ? L(`Unlocks at ${MILESTONES[spec.unlock].name}`, `Débloquée à ${milestoneName(spec.unlock, MILESTONES[spec.unlock].name)}`)
        : L(`$${cost.toFixed(2)}/s${s.policies[id] ? '' : ' while active'}`, `${cost.toFixed(2)} $/s${s.policies[id] ? '' : ' si activée'}`);
    }
    this.borrow.disabled = s.debt > 0;
    this.repay.disabled = s.debt === 0 || s.money < s.debt;
    this.debtLabel.textContent = s.debt > 0 ? L(`Balance $${fmt(s.debt)} · ${Math.ceil(s.debt / LOAN_PAYMENT)}s remaining`, `Solde : ${fmt(s.debt)} $ · ${Math.ceil(s.debt / LOAN_PAYMENT)} s restantes`) : L('No outstanding debt', 'Aucun emprunt en cours');
    const milestone = MILESTONES[s.cityLevel];
    const next = MILESTONES[s.cityLevel + 1];
    if (this.previousLevel !== null && s.tick >= this.previousTick && s.cityLevel > this.previousLevel) {
      const grant = MILESTONES.slice(this.previousLevel + 1, s.cityLevel + 1).reduce((sum, m) => sum + m.reward, 0);
      this.toast(L(`${milestone.name} reached! +$${fmt(grant)} · ${milestone.unlocks}`, `${milestoneName(s.cityLevel, milestone.name)} atteint : +${fmt(grant)} $ · ${milestoneUnlocks(s.cityLevel, milestone.unlocks)}`));
    }
    this.previousLevel = s.cityLevel;
    this.previousTick = s.tick;
    this.cityTitle.textContent = `${L('Level', 'Niveau')} ${s.cityLevel + 1} · ${milestoneName(s.cityLevel, milestone.name)}`;
    this.cityLevel.textContent = `Lv ${s.cityLevel + 1}`;
    this.cityLevel.title = milestone.name;
    this.happiness.textContent = `${s.happiness}%`;
    this.happiness.title = L(`${s.happiness}% of residents are happy`, `${s.happiness} % des habitants sont heureux`);
    this.happiness.classList.toggle('neg', s.happiness < 50);
    const fraction = next ? Math.max(0, Math.min(1, (s.pop - milestone.population) / (next.population - milestone.population))) : 1;
    this.cityFill.style.width = `${fraction * 100}%`;
    this.cityNext.textContent = next ? L(`${fmt(s.pop)} / ${fmt(next.population)} residents → ${next.name} · +$${fmt(next.reward)}`, `${fmt(s.pop)} / ${fmt(next.population)} habitants → ${milestoneName(s.cityLevel + 1, next.name)} · +${fmt(next.reward)} $`) : L(`${fmt(s.pop)} residents · All milestones achieved`, `${fmt(s.pop)} habitants · Tous les paliers sont atteints`);
    for (const [key, value] of this.civicMeters) {
      value.textContent = `${s.civic[key]}%`;
      value.classList.toggle('neg', s.civic[key] < 35);
    }
    this.milestoneRows.forEach((row, i) => { row.classList.toggle('earned', i <= s.cityLevel); row.classList.toggle('next', i === s.cityLevel + 1); });
    this.transportStats.textContent = L(`${s.entries} city entrances · ${s.transport.busLines} bus routes · ${s.transport.trolleyLines ?? 0} trolley routes · ${s.transport.railLines} rail lines · ${s.transport.intercityLines} intercity lines · ${s.transport.subwayLines ?? 0} metro links · ${s.transport.airports} airports · ${s.transport.taxiStops ?? 0} taxi stops · ${s.transport.taxiRiders ?? 0} taxi riders/min · ${s.transport.riders} transit riders/min · ${s.transport.airPassengers} air passengers/min · ${s.transport.railPassengers} intercity rail passengers/min · fares $${s.transport.fareIncome.toFixed(2)}/s`, `${s.entries} entrées de ville · ${s.transport.busLines} lignes de bus · ${s.transport.trolleyLines ?? 0} lignes de trolleybus · ${s.transport.railLines} lignes ferroviaires · ${s.transport.intercityLines} lignes interurbaines · ${s.transport.subwayLines ?? 0} liaisons de métro · ${s.transport.airports} aéroports · ${s.transport.taxiStops ?? 0} stations de taxis · ${s.transport.taxiRiders ?? 0} passagers de taxi/min · ${s.transport.riders} voyageurs en transport/min · ${s.transport.airPassengers} passagers aériens/min · ${s.transport.railPassengers} passagers ferroviaires interurbains/min · recettes : ${s.transport.fareIncome.toFixed(2)} $/s`);
    this.incidentStats.textContent = L(`${s.incidents.patrols} police cars · ${s.incidents.fireEngines} fire engines · ${s.incidents.extinguished} fires extinguished · ${s.incidents.prevented} crimes prevented · ${s.incidents.foiled} robberies foiled · ${s.incidents.robbed} got away`, `${s.incidents.patrols} voitures de police · ${s.incidents.fireEngines} véhicules de pompiers · ${s.incidents.extinguished} incendies éteints · ${s.incidents.prevented} délits évités · ${s.incidents.foiled} braquages déjoués · ${s.incidents.robbed} voleurs en fuite`);
    this.treatmentStats.textContent = L(`${s.treatedSewage} sewage units filtered`, `${s.treatedSewage} unités d’eaux usées traitées`);
    for (const id of ['office', 'leisure', 'entry'] as Tool[]) {
      const button = this.toolBtns.get(id)!;
      const unlock = id === 'office' ? OFFICE_UNLOCK : id === 'leisure' ? LEISURE_UNLOCK : ENTRY_UNLOCK;
      button.disabled = s.cityLevel < unlock;
      const note = button.querySelector('.cnote');
      if (note) note.textContent = button.disabled ? L(`Level ${unlock + 1} · ${MILESTONES[unlock].population} residents`, `Niveau ${unlock + 1} · ${MILESTONES[unlock].population} habitants`) : id === 'office' ? L('Clean jobs · needs education', 'Emplois propres · exige éducation') : id === 'leisure' ? L('Hotels, cafés, nightlife', 'Hôtels, cafés, vie nocturne') : L('New highway access', 'Nouvel accès autoroute');
    }
    for (const [id, button] of this.toolBtns) {
      const kind = SERVICE_TOOL[id];
      if (kind === undefined) continue;
      const spec = SERVICES[kind];
      const locked = s.cityLevel < (spec.unlock ?? 0);
      button.disabled = locked;
      const note = button.querySelector('.cnote');
      if (locked) {
        button.dataset.unlockedNote ??= note?.textContent ?? '';
        if (note) note.textContent = L(`Level ${(spec.unlock ?? 0) + 1} · ${fmt(MILESTONES[spec.unlock!].population)} residents`, `Niveau ${(spec.unlock ?? 0) + 1} · ${fmt(MILESTONES[spec.unlock!].population)} habitants`);
      } else if (note && button.dataset.unlockedNote !== undefined) note.textContent = button.dataset.unlockedNote;
    }
    this.money.textContent = '$' + fmt(s.money);
    this.money.classList.toggle('neg', s.money < 0);
    const inc = `${s.income >= 0 ? '+' : ''}${s.income.toFixed(1)}/s`;
    this.income.textContent = inc;
    this.income.classList.toggle('neg', s.income < 0);
    this.budgetIncome.textContent = inc;
    this.budgetIncome.classList.toggle('neg', s.income < 0);
    this.pop.textContent = fmt(s.pop);
    this.jobs.textContent = fmt(s.jobs);
    this.commute.textContent = s.commute > 0 ? s.commute.toFixed(0) + 's' : '–';
    this.commute.classList.toggle('neg', s.commute > 40);
    this.cars.textContent = L(`${s.cars} cars`, `${s.cars} voitures`);
    for (const k of ['power', 'water', 'sewage'] as const) {
      const [used, cap] = s[k];
      this.util[k].textContent = `${fmt(used)} / ${fmt(cap)}`;
      const short = used > cap;
      this.util[k].classList.toggle('neg', short);
      this.utilFill[k].style.width = `${cap > 0 ? Math.min(100, (used / cap) * 100) : used > 0 ? 100 : 0}%`;
      this.utilFill[k].classList.toggle('short', short);
    }
    for (let i = 0; i < 4; i++) {
      const d = s.demand[i];
      const b = this.demandBars[i];
      b.style.height = `${Math.round(Math.abs(d) * 100)}%`;
      b.classList.toggle('negd', d < 0);
    }

    const a: CityMessage[] = [];
    const say = (id: string, text: string): number => a.push({ id, text });
    if (s.incidents.fires) say('fires', `${s.incidents.fires} building fires: fire engines need working stations and clear road access`);
    if (s.incidents.heists) say('heists', `${s.incidents.heists} robbery in progress: the nearest police station is on its way`);
    if (s.incidents.racers) say('racers', `${s.incidents.racers} street racers are out: calmed streets and signals slow them down`);
    if (s.incidents.crashes) say('crashes', `${s.incidents.crashes} traffic collisions: blocked vehicles await police or recovery`);
    if (s.incidents.crime) say('crime', `${s.incidents.crime} crime hotspots: police visits deter crime and restore tax revenue`);
    if (s.disasters?.active === 'flood') say('disaster', 'Flood! The river is swollen and climbing its banks. Flood barriers and raised ground keep the water off the streets');
    if (s.disasters?.active === 'tornado') say('disaster', 'Tornado crossing the valley: buildings in its path are being damaged');
    if (s.garbage > 40) say('garbage', 'Rubbish is piling up: build recycling centres so garbage trucks can collect it');
    if (s.goods?.importShare > 0.5 && s.buildings > 20) say('goods', 'Shops are importing most of their stock: zone industry or farmland to supply them');
    if (!s.placeholder && s.buildings === 0 && s.roadLength < 12) say('start', 'Draw a street from the end of the two-lane highway, then zone beside it');
    if (s.money < 0) say('budget', 'Treasury in debt: open Budget to reduce funding or take a recovery loan. Existing zones can still grow.');
    if (s.declining > 0) say('declining', `${s.declining} homes losing services: inspect the amber markers before they downgrade`);
    if (s.buildings > 0) {
      if (s.power[1] === 0) say('power', 'No power: build a wind turbine or a coal plant next to a road');
      else if (s.power[0] > s.power[1]) say('power', 'Power shortage');
      if (s.water[1] === 0) say('water', 'No water: build a water tower, or a pump on the river');
      else if (s.water[0] > s.water[1]) say('water', 'Water shortage');
      if (s.sewage[1] === 0) say('sewage', 'No sewage: build an outlet on the river, downstream of any pump');
      else if (s.sewage[0] > s.sewage[1]) say('sewage', 'Sewage is backing up');
    }
    if (s.dirtyWater) say('water', 'Dirty drinking water: move pumps upstream of outlets and towers off polluted ground');
    if (s.resPollution > 2) say('pollution', 'Pollution is reaching homes');
    if (s.gaveUp > 0 || s.commute > 45) say('gridlock', 'Gridlock: try buses, rail, avenues or another city entrance');
    if (s.cityLevel >= 1 && s.civic.health < 35) say('health', 'Homes need healthcare: place a clinic near residents');
    if (s.cityLevel >= 1 && s.civic.education < 35) say('education', 'Education limits growth: place schools near homes');
    if (s.cityLevel >= 2 && s.civic.waste < 50) say('waste', 'Waste coverage is low: build a recycling center');
    this.setMessages(a);
  }

  /**
   * The city's standing complaints live in the message panel behind the bell. Anything that has just
   * started going wrong also pops out for a few seconds, so trouble is noticed without the screen
   * filling up with red boxes that never leave.
   */
  private setMessages(messages: CityMessage[]): void {
    const fresh = messages.filter(m => !this.showing.has(m.text));
    this.showing = new Set(messages.map(m => m.text));
    this.messageList.replaceChildren(...(messages.length
      ? messages.map(m => this.messageRow(m))
      : [el('p', 'pnote', L('Nothing needs your attention.', 'Rien ne demande votre attention.'))]));
    this.messageDot.textContent = messages.length ? String(messages.length) : '';
    this.messageDot.classList.toggle('on', messages.length > 0);
    this.messageBtn.classList.toggle('attention', messages.length > 0);
    if (!fresh.length) return;
    this.messagePop.replaceChildren(...fresh.slice(0, 3).map(m => this.messageRow(m)));
    this.messagePop.classList.add('show');
    clearTimeout(this.popTimer);
    this.popTimer = window.setTimeout(() => this.messagePop.classList.remove('show'), 5200);
  }

  /** A message that can be looked at takes you there; the rest just read. */
  private messageRow(m: CityMessage): HTMLElement {
    const row = el('button', 'message', translateUiMessage(m.text));
    row.addEventListener('click', () => {
      if (this.messageActions.focusOn(m.id)) this.messagePop.classList.remove('show');
      else this.toast(L('Nothing to show for that one yet', 'Rien à montrer pour l’instant'));
    });
    return row;
  }

  private messageActions!: HudActions;
  private toastTimer = 0;
  toast(msg: string): void {
    this.toastEl.textContent = translateUiMessage(msg);
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 2600);
  }

  showHelp(): void {
    this.help.classList.add('open');
  }
}
