import * as THREE from 'three';
import { MODELS, PARTS, PAINTS, MAX_LEVEL, partCost, ratings, newCar, saveGarage } from '../racing/garage';
import type { GarageState, CarModel, Part } from '../racing/garage';
import { RACE_KINDS } from '../racing/routes';
import type { RaceRoute } from '../racing/routes';
import { playerCarGeometry } from '../racing/carModels';
import { icon } from './icons';
import { getLang, carModelText, carPartText, raceKindText } from '../i18n';

const L = (en: string, fr: string): string => getLang() === 'fr' ? fr : en;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
const money = (n: number): string => `$${Math.round(n).toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-US')}`;
const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

export interface GarageActions {
  /** Take the selected car out for a free drive. */
  drive(): void;
  /** Start a race in the selected car. */
  race(race: RaceRoute): void;
  /** The races this city has, planned fresh. */
  races(): RaceRoute[];
  /** Something changed: the car, its paint or its parts. */
  changed(): void;
}

/**
 * The garage: the player's cars and the showroom, a turntable with the selected car on it, its
 * ratings, paint and upgrades bought with race winnings, and the list of races around town.
 */
export class GaragePanel {
  readonly root = el('div', 'garage');
  private body = el('div', 'garage-body');
  private cash = el('span', 'garage-cash');
  private canvas = el('canvas', 'garage-preview');
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 2, 0.01, 20);
  private car: THREE.Mesh | null = null;
  private spin = 0;
  private frame = 0;
  open = false;

  private state: GarageState;
  private actions: GarageActions;

  constructor(parent: HTMLElement, state: GarageState, actions: GarageActions) {
    this.state = state;
    this.actions = actions;
    const head = el('div', 'garage-head');
    const title = el('h2', undefined, L('Garage', 'Garage'));
    const close = el('button', 'garage-close');
    close.append(icon('close', 18));
    close.setAttribute('aria-label', L('Close the garage', 'Fermer le garage'));
    close.addEventListener('click', () => this.hide());
    head.append(title, this.cash, close);
    this.root.append(head, this.body);
    this.root.hidden = true;
    parent.append(this.root);
    this.scene.background = new THREE.Color(0x1b2130);
    this.scene.add(new THREE.HemisphereLight(0xdcefff, 0x2a2f3a, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2, 3, 2);
    this.scene.add(key);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), new THREE.MeshStandardMaterial({ color: 0x2c3444, roughness: 0.6 }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    this.camera.position.set(0.62, 0.34, 0.72);
    this.camera.lookAt(0, 0.08, 0);
    window.addEventListener('keydown', e => { if (this.open && e.key === 'Escape') { e.stopImmediatePropagation(); this.hide(); } }, true);
  }

  toggle(): void { if (this.open) this.hide(); else this.show(); }

  show(): void {
    this.open = true;
    this.root.hidden = false;
    this.render();
    const loop = (): void => {
      if (!this.open) return;
      this.spin += 0.008;
      if (this.car) this.car.rotation.y = this.spin;
      this.renderer?.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(this.frame);
    loop();
  }

  hide(): void {
    this.open = false;
    this.root.hidden = true;
    cancelAnimationFrame(this.frame);
  }

  private get selected() { return this.state.cars[this.state.selected]; }

  private save(): void { saveGarage(this.state); this.actions.changed(); }

  private preview(): void {
    if (!this.renderer) {
      try {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      } catch { return; }
    }
    const w = this.canvas.clientWidth || 420, h = this.canvas.clientHeight || 220;
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.car) { this.scene.remove(this.car); this.car.geometry.dispose(); }
    const car = this.selected;
    this.car = new THREE.Mesh(playerCarGeometry(car.model, car.color), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.35 }));
    this.car.position.y = -0.045;
    this.car.rotation.y = this.spin;
    this.scene.add(this.car);
  }

  /** Build the panel afresh from the garage's state. */
  render(): void {
    this.cash.textContent = `${money(this.state.cash)} ${L('winnings', 'de gains')}`;
    this.body.textContent = '';
    const car = this.selected, model = MODELS[car.model];

    // Left: your cars, then the showroom.
    const list = el('div', 'garage-col garage-cars');
    list.append(el('h3', undefined, L('Your cars', 'Vos voitures')));
    this.state.cars.forEach((c, i) => {
      const b = el('button', `garage-car${i === this.state.selected ? ' active' : ''}`);
      const swatch = el('span', 'swatch'); swatch.style.background = hex(c.color);
      b.append(swatch, el('span', undefined, carModelText(c.model, MODELS[c.model]).name));
      b.addEventListener('click', () => { this.state.selected = i; this.save(); this.render(); });
      list.append(b);
    });
    list.append(el('h3', undefined, L('Showroom', 'Véhicules disponibles')));
    for (const id of Object.keys(MODELS) as CarModel[]) {
      if (this.state.cars.some(c => c.model === id)) continue;
      const m = MODELS[id];
      const modelText = carModelText(id, m);
      const row = el('div', 'garage-shop');
      row.append(el('strong', undefined, modelText.name), el('span', 'pnote', modelText.blurb));
      const buy = el('button', 'garage-buy', L(`Buy ${money(m.price)}`, `Acheter ${money(m.price)}`));
      buy.disabled = this.state.cash < m.price;
      buy.addEventListener('click', () => {
        if (this.state.cash < m.price) return;
        this.state.cash -= m.price;
        this.state.cars.push(newCar(id));
        this.state.selected = this.state.cars.length - 1;
        this.save(); this.render();
      });
      row.append(buy);
      list.append(row);
    }

    // Middle: the car itself.
    const mid = el('div', 'garage-col garage-mid');
    mid.append(this.canvas);
    const selectedModel = carModelText(car.model, model);
    mid.append(el('h3', undefined, selectedModel.name), el('p', 'pnote', selectedModel.blurb));
    const r = ratings(car);
    const bars = el('div', 'garage-bars');
    for (const [label, v] of [[L('Speed', 'Vitesse'), r.speed], [L('Acceleration', 'Accélération'), r.acceleration], [L('Handling', 'Tenue de route'), r.handling], [L('Braking', 'Freinage'), r.braking]] as [string, number][]) {
      const row = el('div', 'garage-bar');
      const fill = el('span', 'fill'); fill.style.width = `${v * 10}%`;
      const track = el('span', 'track'); track.append(fill);
      row.append(el('span', 'label', label), track);
      bars.append(row);
    }
    mid.append(bars);
    const paints = el('div', 'garage-paints');
    for (const p of PAINTS) {
      const b = el('button', `garage-paint${p === car.color ? ' active' : ''}`);
      b.style.background = hex(p);
      b.setAttribute('aria-label', L(`Paint ${hex(p)}`, `Peinture ${hex(p)}`));
      b.addEventListener('click', () => { car.color = p; this.save(); this.render(); });
      paints.append(b);
    }
    mid.append(paints);
    const parts = el('div', 'garage-parts');
    for (const id of Object.keys(PARTS) as Part[]) {
      const level = car.parts[id], row = el('div', 'garage-part');
      const pips = el('span', 'pips');
      for (let k = 0; k < MAX_LEVEL; k++) pips.append(el('i', k < level ? 'on' : undefined));
      const info = el('span', 'part-info');
      const partText = carPartText(id, PARTS[id]);
      info.append(el('strong', undefined, partText.name), el('span', 'pnote', partText.effect));
      const up = el('button', 'garage-buy', level >= MAX_LEVEL ? L('Maxed', 'Au maximum') : L(`Upgrade ${money(partCost(car.model, level))}`, `Améliorer ${money(partCost(car.model, level))}`));
      up.disabled = level >= MAX_LEVEL || this.state.cash < partCost(car.model, level);
      up.addEventListener('click', () => {
        const cost = partCost(car.model, car.parts[id]);
        if (car.parts[id] >= MAX_LEVEL || this.state.cash < cost) return;
        this.state.cash -= cost; car.parts[id]++;
        this.save(); this.render();
      });
      row.append(info, pips, up);
      parts.append(row);
    }
    mid.append(parts);

    // Right: the races.
    const races = el('div', 'garage-col garage-races');
    races.append(el('h3', undefined, L('Races around town', 'Courses en ville')));
    const list2 = this.actions.races();
    if (!list2.length) races.append(el('p', 'pnote', L('Build more streets: races need a few blocks of road to run on.', 'Construisez davantage de rues : les courses ont besoin de plusieurs pâtés de maisons.')));
    for (const race of list2) {
      const kind = RACE_KINDS[race.kind];
      const kindText = raceKindText(race.kind, kind);
      const row = el('div', 'garage-race');
      const badge = el('span', 'race-badge', kindText.label); badge.style.background = hex(kind.color);
      const best = this.state.best[race.id];
      const km = (race.length * race.laps * 0.015).toFixed(1);
      const detail = `${km} km${race.loop ? ` · ${race.laps} ${L('laps', 'tours')}` : ''} · ${race.kind === 'drift' ? L(`beat ${race.target.toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-US')} pts`, `objectif : ${race.target.toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-US')} pts`) : race.kind === 'police' ? L('escape the police', 'échapper à la police') : race.kind === 'drag' ? L('1 rival', '1 rival') : `${race.rivals} ${L('rivals', 'rivaux')}`}`;
      const info = el('span', 'part-info');
      info.append(el('strong', undefined, race.name), el('span', 'pnote', detail));
      if (best !== undefined) info.append(el('span', 'pnote best', race.kind === 'drift' ? L(`Best ${best.toLocaleString('en-US')} pts`, `Record : ${best.toLocaleString('fr-FR')} pts`) : best === 1 ? L('Won', 'Victoire') : L(`Best: ${ordinal(best)}`, `Meilleure place : ${ordinal(best)}`)));
      const go = el('button', 'garage-go', L(`Race · ${money(race.reward)}`, `Courir · ${money(race.reward)}`));
      go.addEventListener('click', () => { this.hide(); this.actions.race(race); });
      row.append(badge, info, go);
      races.append(row);
    }
    const drive = el('button', 'garage-drive');
    drive.append(icon('drive', 18), el('span', undefined, L('Free drive', 'Conduite libre')));
    drive.addEventListener('click', () => { this.hide(); this.actions.drive(); });
    races.append(el('p', 'pnote', L('In a free drive, glowing rings on the road mark the races: drive into one and press Enter.', 'En conduite libre, les anneaux lumineux indiquent les courses : traversez-en un et appuyez sur Entrée.')), drive);

    this.body.append(list, mid, races);
    requestAnimationFrame(() => this.preview());
  }
}

export const ordinal = (n: number): string => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
