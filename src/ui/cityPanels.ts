import { icon } from './icons';
import { ACHIEVEMENTS } from '../achievements';
import type { AchievementLog } from '../achievements';
import { DISTRICT_COLORS, DISTRICT_COUNT, DISTRICT_POLICIES, DISTRICT_POLICY_IDS, districtHas } from '../extras';
import type { Game } from '../game';
import type { Stats } from '../sim/messages';
import { deleteSlot, listSlots, loadSlot, saveSlot } from '../slots';
import type { SaveData } from '../save';
import { EXPANSION_SIDE, N_TILES, isZone } from '../constants';
import { getLang, mapViewText, achievementTitle, achievementText } from '../i18n';

const L = (en: string, fr: string): string => getLang() === 'fr' ? fr : en;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export type MapView = 'none' | 'land' | 'noise' | 'crime' | 'wellbeing' | 'garbage' | 'districts' | 'flood';
export const MAP_VIEWS: { id: MapView; label: string; note: string }[] = [
  { id: 'none', label: 'Normal', note: 'Just the city' },
  { id: 'land', label: 'Land value', note: 'Green is sought after, red is not' },
  { id: 'wellbeing', label: 'Well-being', note: 'How content each household is' },
  { id: 'noise', label: 'Noise', note: 'Traffic, industry, nightlife, the airport' },
  { id: 'crime', label: 'Crime', note: 'Where police patrols are needed' },
  { id: 'garbage', label: 'Rubbish', note: 'Bins nobody has emptied yet' },
  { id: 'districts', label: 'Districts', note: 'Painted districts and their names' },
  { id: 'flood', label: 'Flood risk', note: 'Low ground a flood would reach' },
];

/** One sampled moment of the city, for the statistics charts. */
interface Sample { day: number; pop: number; money: number; income: number; happiness: number; jobs: number; land: number; visitors: number; demand: [number, number, number, number] }
const HISTORY_LIMIT = 600;

export interface PanelActions {
  setView(view: MapView): void;
  undo(): void;
  toggleSound(): boolean;
  soundOn(): boolean;
  loadCity(d: SaveData): void;
  /** The district tool's brush and whether the district panel should show. */
  districtChanged(): void;
  day(): number;
}

/**
 * Panels that sit beside the HUD: map views, statistics, achievements, districts
 * and named saves. They reuse the HUD's popover styling and add their buttons to its top-right bar.
 */
export class CityPanels {
  view: MapView = 'none';
  private history: Sample[] = [];
  private viewPop = el('div', 'popover views');
  private statsPop = el('div', 'popover stats');
  private trophyPop = el('div', 'popover trophies');
  private districtPop = el('div', 'popover districts');
  private savePop = el('div', 'popover saves');
  private expansionPop = el('div', 'popover expansion');
  private expansionGrid = el('div', 'expansion-grid');
  private expansionNote = el('p', 'pnote');
  private viewBtns = new Map<MapView, HTMLButtonElement>();
  private charts: { canvas: HTMLCanvasElement; label: HTMLElement; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }[] = [];
  private undoBtn: HTMLButtonElement;
  private soundBtn: HTMLButtonElement;
  private viewBtn: HTMLButtonElement;
  private trophyList = el('div', 'trophy-list');
  private districtName = el('input', 'district-name');
  private districtSwatches: HTMLButtonElement[] = [];
  private districtPolicyBoxes = new Map<string, HTMLInputElement>();
  private districtInfo = el('p', 'pnote');
  private brush = 1;
  private lastDay = -1;

  private game: Game;
  private achievements: AchievementLog;
  private actions: PanelActions;
  private onBrush: (d: number) => void;

  constructor(root: HTMLElement, rightBar: HTMLElement, menu: HTMLElement, game: Game, achievements: AchievementLog, actions: PanelActions, onBrush: (d: number) => void) {
    this.game = game; this.achievements = achievements; this.actions = actions; this.onBrush = onBrush;
    const btn = (ic: string, title: string, fn: () => void): HTMLButtonElement => {
      const b = el('button', 'iconbtn'); b.title = title; b.append(icon(ic, 19)); b.addEventListener('click', fn); return b;
    };
    const pops = [this.viewPop, this.statsPop, this.trophyPop, this.savePop, this.expansionPop];
    const toggle = (pop: HTMLElement): void => { for (const p of pops) if (p !== pop) p.classList.remove('open'); pop.classList.toggle('open'); if (pop === this.statsPop) this.drawCharts(); if (pop === this.expansionPop && pop.classList.contains('open')) this.renderExpansions(); };
    this.viewBtn = btn('layers', L('Map views', 'Calques de carte'), () => toggle(this.viewPop));
    const expansionBtn = btn('plus', L('Expand map', 'Agrandir la carte'), () => toggle(this.expansionPop));
    const statsBtn = btn('chart', L('Statistics', 'Statistiques'), () => toggle(this.statsPop));
    const trophyBtn = btn('trophy', L('Achievements', 'Succès'), () => { this.renderTrophies(); toggle(this.trophyPop); });
    this.undoBtn = btn('undo', L('Undo (Ctrl+Z)', 'Annuler (Ctrl+Z)'), () => actions.undo());
    this.soundBtn = btn(actions.soundOn() ? 'sound' : 'mute', L('Sound', 'Son'), () => this.setSoundIcon(actions.toggleSound()));
    rightBar.prepend(this.undoBtn, expansionBtn, this.viewBtn, statsBtn, trophyBtn, this.soundBtn);
    window.addEventListener('pointerdown', e => {
      const t = e.target as Node;
      for (const [pop, b] of [[this.viewPop, this.viewBtn], [this.statsPop, statsBtn], [this.trophyPop, trophyBtn], [this.savePop, null], [this.expansionPop, expansionBtn]] as [HTMLElement, HTMLElement | null][]) {
        if (!pop.contains(t) && !(b && b.contains(t)) && !menu.contains(t)) pop.classList.remove('open');
      }
    });

    // Map views.
    this.viewPop.append(el('div', 'ptitle', L('Map views', 'Calques de carte')));
    for (const v of MAP_VIEWS) {
      const b = el('button', 'mitem view-item');
      const text = el('span', 'policy-text');
      const info = mapViewText(v.id, v);
      text.append(el('strong', undefined, info.label), el('span', 'pnote', info.note));
      b.append(text);
      b.addEventListener('click', () => this.setView(v.id));
      this.viewBtns.set(v.id, b);
      this.viewPop.append(b);
    }
    this.setView('none');

    this.expansionPop.append(
      el('div', 'ptitle', L('Map expansion', 'Extension de la carte')),
      this.expansionNote,
      this.expansionGrid,
      el('p', 'pnote', L('Buy an adjacent parcel after reaching Growing village. Each parcel is 20 × 20 cells.', 'Achetez une parcelle adjacente dès le Village en croissance. Chaque parcelle mesure 20 × 20 cases.')),
    );

    // Statistics.
    this.statsPop.append(el('div', 'ptitle', L('City statistics', 'Statistiques de la ville')), el('p', 'pnote', L('Sampled every simulation second since the city was loaded.', 'Échantillonné chaque seconde simulée depuis le chargement.')));
    const grid = el('div', 'chart-grid');
    const chart = (title: string, series: { color: string; get: (s: Sample) => number }[], fmt: (v: number) => string, fixed?: [number, number]): void => {
      const card = el('div', 'chart-card');
      const label = el('span', 'chart-label', title);
      const canvas = el('canvas'); canvas.width = 300; canvas.height = 110;
      card.append(label, canvas);
      grid.append(card);
      this.charts.push({ canvas, label, draw: (ctx, w, h) => {
        const data = this.history;
        if (data.length < 2) { ctx.fillStyle = '#9aa6b5'; ctx.font = '12px system-ui'; ctx.fillText(L('Collecting…', 'Collecte…'), 10, h / 2); return; }
        let lo = Infinity, hi = -Infinity;
        for (const s of data) for (const se of series) { const v = se.get(s); lo = Math.min(lo, v); hi = Math.max(hi, v); }
        if (fixed) { lo = fixed[0]; hi = fixed[1]; }
        if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
        for (let k = 0; k <= 2; k++) { const y = 6 + (h - 12) * k / 2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        for (const se of series) {
          ctx.strokeStyle = se.color; ctx.lineWidth = 2; ctx.beginPath();
          data.forEach((s, i) => { const x = i / (data.length - 1) * w, y = 6 + (h - 12) * (1 - (se.get(s) - lo) / (hi - lo)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
          ctx.stroke();
        }
        const last = data[data.length - 1];
        label.textContent = `${title} · ${series.map(se => fmt(se.get(last))).join(' / ')}`;
      } });
    };
    const money = (v: number): string => `$${Math.round(v).toLocaleString()}`;
    chart(L('Population', 'Population'), [{ color: '#62c46a', get: s => s.pop }, { color: '#4f8fe8', get: s => s.jobs }], v => Math.round(v).toLocaleString());
    chart(L('Treasury', 'Trésorerie'), [{ color: '#ffd166', get: s => s.money }], money);
    chart(L('Net income /s', 'Revenu net /s'), [{ color: '#ffd166', get: s => s.income }], v => `$${v.toFixed(1)}`);
    chart(L('Happiness', 'Bonheur'), [{ color: '#e07fb0', get: s => s.happiness }], v => `${Math.round(v)}`, [0, 100]);
    chart(L('Land value', 'Valeur du sol'), [{ color: '#7fc4a8', get: s => s.land }], v => `${Math.round(v)}`, [0, 100]);
    chart(L('Visitors /min', 'Visiteurs /min'), [{ color: '#e0a021', get: s => s.visitors }], v => `${Math.round(v)}`);
    chart(L('Demand R C I O', 'Demande R C I B'), [0, 1, 2, 3].map(k => ({ color: ['#62c46a', '#4f8fe8', '#e6b93a', '#b791e0'][k], get: (s: Sample) => s.demand[k] * 100 })), v => `${Math.round(v)}`, [-100, 100]);
    this.statsPop.append(grid);

    // Achievements.
    this.trophyPop.append(el('div', 'ptitle', L('Achievements', 'Succès')), el('p', 'pnote', L('Earned in any city, remembered in this browser.', 'Gagnés dans n’importe quelle ville, mémorisés dans ce navigateur.')), this.trophyList);

    // Districts.
    this.districtPop.append(el('div', 'ptitle', L('Districts', 'Quartiers')));
    const swatches = el('div', 'district-swatches');
    for (let d = 1; d <= DISTRICT_COUNT; d++) {
      const b = el('button', 'district-swatch');
      b.style.setProperty('--swatch', `#${DISTRICT_COLORS[d - 1].toString(16).padStart(6, '0')}`);
      b.title = L(`District ${d}`, `Quartier ${d}`);
      b.addEventListener('click', () => this.selectDistrict(d));
      this.districtSwatches.push(b); swatches.append(b);
    }
    this.districtName.type = 'text'; this.districtName.maxLength = 32;
    this.districtName.setAttribute('aria-label', L('District name', 'Nom du quartier'));
    this.districtName.addEventListener('input', () => { game.renameDistrict(this.brush, this.districtName.value); actions.districtChanged(); });
    this.districtPop.append(swatches, this.districtName, this.districtInfo);
    for (const id of DISTRICT_POLICY_IDS) {
      const spec = DISTRICT_POLICIES[id];
      const row = el('label', 'policy-row');
      const box = el('input'); box.type = 'checkbox';
      box.addEventListener('change', () => {
        let mask = game.extras.districtPolicies[this.brush - 1];
        const bit = 1 << DISTRICT_POLICY_IDS.indexOf(id);
        mask = box.checked ? mask | bit : mask & ~bit;
        game.setDistrictPolicy(this.brush, mask);
        this.refreshDistrict();
      });
      const text = el('span', 'policy-text');
        const polLabel = id === 'highriseBan' ? L('High-rise ban', 'Interdiction des tours') : id === 'quiet' ? L('Quiet streets', 'Rues calmes') : id === 'green' ? L('Green district', 'Quartier vert') : id === 'tourist' ? L('Tourist district', 'Quartier touristique') : id === 'taxBreak' ? L('Tax break', 'Exonération fiscale') : L('Neighborhood watch', 'Voisins vigilants');
        const polEffect = id === 'highriseBan' ? L('Caps building height to preserve the skyline and stabilize land value', 'Hauteur limitée pour préserver l’horizon et stabiliser la valeur du sol') : id === 'quiet' ? L('60% less noise and higher land value, but slower growth', 'Bruit réduit de 60 % et valeur du sol en hausse, mais croissance ralentie') : id === 'green' ? L('Half the pollution and higher land value; industry grows more slowly', 'Pollution divisée par deux et valeur du sol en hausse ; industrie ralentie') : id === 'tourist' ? L('Leisure attracts 40% more visitors and pays more tax', 'Les loisirs attirent 40 % de visiteurs en plus et paient plus de taxe') : id === 'taxBreak' ? L('Four points less tax here, which speeds up growth', '4 points de taxe en moins ici, ce qui accélère la croissance') : L('Crime grows 40% more slowly in this district', 'La délinquance progresse 40 % moins vite dans le quartier');
      const polCost = spec.perBuilding ? L(`$0.20/s + $${spec.perBuilding.toFixed(3)}/s per building`, `0,20 $/s + ${spec.perBuilding.toFixed(3)} $/s par bâtiment`) : L('$0.20/s', '0,20 $/s');
      text.append(el('strong', undefined, L(spec.label, polLabel)), el('span', 'policy-effect', L(spec.effect, polEffect)), el('span', 'policy-cost', polCost));
      row.append(icon('district', 18), text, box);
      this.districtPolicyBoxes.set(id, box);
      this.districtPop.append(row);
    }
    this.selectDistrict(1);

    // Named saves, opened from the menu.
    const menuItem = (ic: string, label: string, fn: () => void): HTMLButtonElement => {
      const b = el('button', 'mitem'); b.append(icon(ic, 17), el('span', undefined, label));
      b.addEventListener('click', () => { menu.classList.remove('open'); fn(); }); return b;
    };
    menu.prepend(menuItem('save', L('Save or load cities', 'Sauvegarder ou charger'), () => { this.renderSaves(); this.savePop.classList.add('open'); }));

    root.append(this.viewPop, this.statsPop, this.trophyPop, this.districtPop, this.savePop, this.expansionPop);
  }

  private renderExpansions(): void {
    const opened = this.game.extras.expansions.reduce((sum, value) => sum + value, 0);
    const price = this.game.expansionCost().toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-US');
    this.expansionNote.textContent = L(`${opened} of ${this.game.extras.expansions.length} parcels open · next parcel $${price}`, `${opened} sur ${this.game.extras.expansions.length} parcelles ouvertes · prochaine parcelle : ${price} $`);
    this.expansionGrid.replaceChildren();
    for (let z = 0; z < EXPANSION_SIDE; z++) for (let x = 0; x < EXPANSION_SIDE; x++) {
      const index = z * EXPANSION_SIDE + x, owned = !!this.game.extras.expansions[index];
      const available = !owned && this.game.canPurchaseExpansion(x, z);
      const button = el('button', `expansion-parcel${owned ? ' owned' : available ? ' available' : ''}`);
      button.type = 'button';
      button.disabled = !available;
      button.textContent = owned ? '✓' : available ? '+' : '';
      button.title = owned ? L(`Parcel ${x + 1}, ${z + 1} · owned`, `Parcelle ${x + 1}, ${z + 1} · acquise`) : available ? L(`Buy parcel ${x + 1}, ${z + 1} · $${price}`, `Acheter la parcelle ${x + 1}, ${z + 1} · ${price} $`) : L(`Parcel ${x + 1}, ${z + 1} · locked`, `Parcelle ${x + 1}, ${z + 1} · verrouillée`);
      button.setAttribute('aria-label', button.title);
      if (available) button.addEventListener('click', () => { if (this.game.purchaseExpansion(x, z)) this.renderExpansions(); });
      this.expansionGrid.append(button);
    }
    this.expansionGrid.style.setProperty('--parcel-side', String(EXPANSION_SIDE));
  }

  private setSoundIcon(on: boolean): void {
    this.soundBtn.replaceChildren(icon(on ? 'sound' : 'mute', 19));
    this.soundBtn.classList.toggle('active', false);
  }

  setView(view: MapView): void {
    this.view = view;
    for (const [id, b] of this.viewBtns) b.classList.toggle('active', id === view);
    this.viewBtn.classList.toggle('active', view !== 'none');
    this.actions.setView(view);
  }

  /** Show the district panel while a district tool is in hand. */
  showDistricts(on: boolean): void {
    this.districtPop.classList.toggle('open', on);
    if (on) this.refreshDistrict();
  }

  private selectDistrict(d: number): void {
    this.brush = d;
    this.onBrush(d);
    this.districtSwatches.forEach((b, i) => b.classList.toggle('active', i + 1 === d));
    this.refreshDistrict();
  }

  refreshDistrict(): void {
    const d = this.brush, mask = this.game.extras.districtPolicies[d - 1];
    if (document.activeElement !== this.districtName) this.districtName.value = this.game.extras.districtNames[d - 1];
    for (const [id, box] of this.districtPolicyBoxes) box.checked = districtHas(mask, id as typeof DISTRICT_POLICY_IDS[number]);
    let cells = 0, built = 0;
    for (let i = 0; i < N_TILES; i++) if (this.game.extras.district[i] === d) { cells++; if (isZone(this.game.kind[i]) && this.game.level[i]) built++; }
    this.districtInfo.textContent = cells ? L(`${cells} cells · ${built} buildings. Drag on the map to paint more.`, `${cells} cases · ${built} bâtiments. Faites glisser sur la carte pour agrandir le quartier.`) : L('Pick a colour, then drag on the map to paint this district.', 'Choisissez une couleur, puis faites glisser sur la carte pour peindre ce quartier.');
    this.actions.districtChanged();
  }

  private renderTrophies(): void {
    this.trophyList.replaceChildren();
    const earned = ACHIEVEMENTS.filter(a => this.achievements.earned[a.id]).length;
    this.trophyList.append(el('p', 'pnote', L(`${earned} of ${ACHIEVEMENTS.length} earned`, `${earned} sur ${ACHIEVEMENTS.length} obtenus`)));
    for (const a of ACHIEVEMENTS) {
      const row = el('div', `trophy${this.achievements.earned[a.id] ? ' earned' : ''}`);
      row.append(icon('trophy', 18));
      const text = el('span', 'policy-text');
      text.append(el('strong', undefined, achievementTitle(a.id, a.title)), el('span', 'pnote', achievementText(a.id, a.text)));
      row.append(text);
      this.trophyList.append(row);
    }
  }

  private renderSaves(): void {
    this.savePop.replaceChildren(el('div', 'ptitle', L('Saved cities', 'Villes sauvegardées')));
    const row = el('div', 'save-row');
    const name = el('input'); name.type = 'text'; name.placeholder = L('Name this city', 'Nom de la ville'); name.maxLength = 40;
    name.value = `${L('City day', 'Ville, jour')} ${this.actions.day()}`;
    const save = el('button', 'finance-action', L('Save', 'Enregistrer'));
    save.addEventListener('click', () => {
      if (saveSlot(name.value, this.game.snapshot(), this.actions.day())) this.renderSaves();
    });
    row.append(name, save);
    this.savePop.append(row);
    const slots = listSlots();
    if (!slots.length) this.savePop.append(el('p', 'pnote', L('No saved cities yet. Your current city also saves itself automatically.', 'Aucune ville enregistrée. Votre ville actuelle est aussi sauvegardée automatiquement.')));
    for (const slot of slots) {
      const line = el('div', 'save-slot');
      const text = el('span', 'policy-text');
      text.append(el('strong', undefined, slot.name), el('span', 'pnote', `${slot.population.toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-US')} ${L('residents', 'habitants')} · ${L('day', 'jour')} ${slot.day} · ${new Date(slot.savedAt).toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-US')}`));
      const load = el('button', 'finance-action', L('Load', 'Charger'));
      load.addEventListener('click', () => {
        const d = loadSlot(slot.name);
        if (d && confirm(L(`Load “${slot.name}”? Unsaved progress in this city will be lost.`, `Charger « ${slot.name} » ? La progression non enregistrée de cette ville sera perdue.`))) { this.savePop.classList.remove('open'); this.actions.loadCity(d); }
      });
      const del = el('button', 'finance-action', L('Delete', 'Supprimer'));
      del.addEventListener('click', () => { if (confirm(L(`Delete “${slot.name}”?`, `Supprimer « ${slot.name} » ?`))) { deleteSlot(slot.name); this.renderSaves(); } });
      line.append(text, load, del);
      this.savePop.append(line);
    }
  }

  /** Forget the charts, for a newly loaded city. */
  resetHistory(): void { this.history = []; this.lastDay = -1; }

  record(s: Stats, day: number): void {
    if (s.tick === this.lastDay) return;
    this.lastDay = s.tick;
    this.history.push({ day, pop: s.pop, money: s.money, income: s.income, happiness: s.happiness, jobs: s.jobs, land: s.landValue, visitors: s.tourism.visitors, demand: [...s.demand] as Sample['demand'] });
    if (this.history.length > HISTORY_LIMIT) this.history.splice(0, this.history.length - HISTORY_LIMIT);
    if (this.statsPop.classList.contains('open') && this.history.length % 2 === 0) this.drawCharts();
    this.undoBtn.disabled = !this.game.canUndo;
  }

  private drawCharts(): void {
    for (const c of this.charts) {
      const ctx = c.canvas.getContext('2d');
      if (!ctx) continue;
      ctx.clearRect(0, 0, c.canvas.width, c.canvas.height);
      c.draw(ctx, c.canvas.width, c.canvas.height);
    }
  }

}
