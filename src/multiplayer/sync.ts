/**
 * Co-op session wiring: the host owns the simulation, guests send map edits
 * which the host applies, and the host broadcasts full city snapshots back.
 * Star topology (guests only talk to the host), manual signalling, no server.
 */
import { Game } from '../game.ts';
import type { AuthorityMap } from '../game.ts';
import { decode, encode } from '../save.ts';
import { extrasFromJson, extrasToJson } from '../extras.ts';
import type { Taxes } from '../extras.ts';
import { N_TILES } from '../constants.ts';
import { GRID } from '../constants.ts';
import {
  MP_VERSION, cleanName, packBytes, playerColor, randomId, unpackBytes,
} from './protocol.ts';
import type { MpMessage, MpPlayer } from './protocol.ts';
import { GuestLink, HostRoom } from './transport.ts';
import type { GuestSlot } from './transport.ts';
import { MpPanel } from './panel.ts';
import { RemoteCursors } from './cursors.ts';
import type { FundingKey } from '../management.ts';
import type { PolicyId } from '../policies.ts';
import { getLang } from '../i18n.ts';

const L = (en: string, fr: string): string => getLang() === 'fr' ? fr : en;
const NAME_KEY = 'gridburg.mp.name.v1';
const CITY_EVERY_MS = 5000;
const CURSOR_EVERY_MS = 400;

export type MpRole = 'idle' | 'host' | 'guest';

export interface MpCoopOptions {
  game: Game;
  uiRoot: HTMLElement;
  cursors: RemoteCursors;
  toast: (msg: string) => void;
  /** Where this player is looking, in tile coordinates, for the remote rings. */
  getFocus: () => { x: number; z: number } | null;
}

export class MpCoop {
  private game: Game;
  private toast: (msg: string) => void;
  private cursors: RemoteCursors;
  private getFocus: () => { x: number; z: number } | null;
  readonly panel: MpPanel;
  role: MpRole = 'idle';
  private myId = randomId();
  private myName: string;
  private myColor = playerColor(0);
  private players: MpPlayer[] = [];
  private room: HostRoom | null = null;
  private link: GuestLink | null = null;
  private pendingInvite: string | null = null;
  /** True while a host snapshot is being loaded, so it is never echoed back. */
  private applyingRemote = false;
  /** What this guest spent since its last map op, charged to the shared treasury by the host. */
  private guestSpent = 0;
  private cityTimer: number | null = null;
  private sendTimer: number | null = null;
  private colorById = new Map<string, string>();

  constructor(opts: MpCoopOptions) {
    this.game = opts.game;
    this.toast = opts.toast;
    this.cursors = opts.cursors;
    this.getFocus = opts.getFocus;
    this.myName = loadName();
    this.players = [{ id: this.myId, name: this.myName, color: this.myColor }];
    this.panel = new MpPanel({
      getName: () => this.myName,
      setName: (n) => {
        this.myName = cleanName(n);
        saveName(this.myName);
      },
      host: () => this.host(),
      newInvite: () => this.newInvite(),
      confirmAnswer: (code) => this.confirmAnswer(code),
      join: (code) => this.join(code),
      leave: () => this.leave(),
      chat: (text) => this.sendChat(text),
    });
    opts.uiRoot.append(this.panel.root);
    this.refreshPlayers();
    this.panel.setStatus(L('Solo city — host or join to build together.', 'Ville solo — hébergez ou rejoignez pour construire ensemble.'));
  }

  /** Hook edits, spending and undo into the session. Call once from main.ts. */
  attach(): void {
    const game = this.game;
    const prevEdit = game.onEdit;
    game.onEdit = () => {
      prevEdit?.();
      this.handleLocalEdit();
    };
    const prevSpend = game.spend.bind(game);
    game.spend = (cost: number) => {
      if (this.role === 'guest' && !this.applyingRemote && cost > 0) this.guestSpent += cost;
      prevSpend(cost);
    };
    const prevUndo = game.undo.bind(game);
    game.undo = () => {
      if (this.role === 'guest') {
        this.toast(L('Only the host can undo in co-op.', 'Seul l’hôte peut annuler en coop.'));
        return false;
      }
      return prevUndo();
    };
    // Forward decisions that never flush (no map op would carry them).
    this.forward('setTax', (value: number) => ({ t: 'tax', v: MP_VERSION, value }));
    this.forward('setTaxes', (taxes: Taxes) => ({ t: 'taxes', v: MP_VERSION, taxes: [...taxes] as Taxes }));
    this.forward('setFunding', (key: FundingKey, value: number) => ({ t: 'funding', v: MP_VERSION, key: String(key), value }));
    this.forward('setPolicy', (id: PolicyId, on: boolean) => ({ t: 'policy', v: MP_VERSION, id: String(id), on }));
    this.forward('loan', (action: 'take' | 'repay') => ({ t: 'loan', v: MP_VERSION, action }));
    this.forward('setDistrictPolicy', (district: number, mask: number) => ({ t: 'districtPolicy', v: MP_VERSION, district, mask }));
    this.forward('setDisasters', (on: boolean) => {
      this.sendMapSoon();
      return { t: 'disasters', v: MP_VERSION, on };
    });
    const prevRename = game.renameDistrict.bind(game);
    game.renameDistrict = (district: number, name: string) => {
      prevRename(district, name);
      if (this.role === 'guest' && !this.applyingRemote) this.sendMapSoon();
    };
    window.setInterval(() => this.shareCursor(), CURSOR_EVERY_MS);
    window.setInterval(() => this.cursors.prune(), 4000);
    window.addEventListener('beforeunload', () => this.leave(true));
  }

  isGuest(): boolean {
    return this.role === 'guest';
  }

  isActive(): boolean {
    return this.role !== 'idle';
  }

  togglePanel(): void {
    this.panel.toggle();
  }

  // ---- hosting ----

  private async host(): Promise<void> {
    if (this.role !== 'idle') return;
    this.leave(true);
    this.role = 'host';
    this.myColor = playerColor(0);
    this.room = new HostRoom();
    this.room.onGuestMessage = (slot, msg) => this.onGuestMessage(slot, msg);
    this.room.onGuestOpen = (slot) => this.onGuestOpen(slot);
    this.room.onGuestClose = (slot) => this.onGuestClose(slot);
    this.resetRoster();
    this.panel.setRole('host');
    this.panel.setStatus(L('Hosting. Share an invite code with each friend.', 'Vous hébergez. Partagez un code d’invitation avec chaque ami·e.'));
    await this.newInvite();
    this.cityTimer = window.setInterval(() => this.broadcastCity(), CITY_EVERY_MS);
  }

  private async newInvite(): Promise<void> {
    if (this.role !== 'host' || !this.room) return;
    if (this.pendingInvite) this.room.drop(this.pendingInvite);
    try {
      const { inviteId, code } = await this.room.createInvite();
      this.pendingInvite = inviteId;
      this.panel.showInvite(code);
      this.panel.setStatus(L('Invite ready — paste the guest’s answer to let them in.', 'Invitation prête — collez la réponse de l’invité·e pour le·la faire entrer.'));
    } catch {
      this.toast(L('Could not create an invite. Reload and retry.', 'Impossible de créer l’invitation. Rechargez et réessayez.'));
    }
  }

  private async confirmAnswer(code: string): Promise<boolean> {
    if (this.role !== 'host' || !this.room || !this.pendingInvite) {
      this.toast(L('Create an invite code first.', 'Créez d’abord un code d’invitation.'));
      return false;
    }
    const ok = await this.room.acceptAnswer(this.pendingInvite, code);
    if (!ok) {
      this.toast(L('That answer code did not match. Check for missing characters.', 'Ce code de réponse ne correspond pas. Vérifiez les caractères manquants.'));
      return false;
    }
    this.pendingInvite = null;
    this.panel.setStatus(L('Guest accepted. Make a new code for the next friend.', 'Invité·e accepté·e. Créez un nouveau code pour le·la suivant·e.'));
    return true;
  }

  // ---- joining ----

  private async join(code: string): Promise<string | null> {
    if (this.role !== 'idle') return null;
    const tidy = code.trim();
    if (!tidy) {
      this.toast(L('Paste the host’s invite code first.', 'Collez d’abord le code d’invitation de l’hôte.'));
      return null;
    }
    this.leave(true);
    const link = new GuestLink();
    this.link = link;
    link.onMessage = (msg) => this.onHostMessage(msg);
    link.onOpen = () => {
      this.role = 'guest';
      this.panel.setRole('guest');
      this.panel.setStatus(L('Connected. Building on the host’s city.', 'Connecté·e. Vous construisez sur la ville de l’hôte.'));
      this.toast(L('Joined the shared city.', 'Ville partagée rejointe.'));
      link.send({ t: 'hello', v: MP_VERSION, id: this.myId, name: this.myName });
    };
    link.onClose = () => {
      if (this.role === 'guest') {
        this.toast(L('Host left. You keep a copy of the city.', 'L’hôte est parti. Vous gardez une copie de la ville.'));
        this.leave();
      }
    };
    const answer = await link.join(tidy);
    if (!answer) {
      this.link = null;
      this.toast(L('That invite code is invalid.', 'Ce code d’invitation est invalide.'));
      return null;
    }
    this.panel.showAnswer(answer);
    this.panel.setStatus(L('Answer ready — send it back to the host, then wait for the city.', 'Réponse prête — renvoyez-la à l’hôte, puis attendez la ville.'));
    return answer;
  }

  leave(silent = false): void {
    if (this.role === 'host' && !silent) {
      this.room?.broadcast({ t: 'notice', v: MP_VERSION, text: L('The host stopped the session.', 'L’hôte a fermé la session.') });
    }
    if (this.role === 'guest' && !silent) {
      this.link?.send({ t: 'bye', v: MP_VERSION, id: this.myId });
    }
    this.room?.close();
    this.room = null;
    this.link?.leave();
    this.link = null;
    this.pendingInvite = null;
    if (this.cityTimer !== null) {
      window.clearInterval(this.cityTimer);
      this.cityTimer = null;
    }
    this.role = 'idle';
    this.myColor = playerColor(0);
    this.resetRoster();
    this.cursors.clear();
    this.panel.setRole('idle');
    this.panel.resetCodes();
    this.panel.setStatus(L('Solo city — host or join to build together.', 'Ville solo — hébergez ou rejoignez pour construire ensemble.'));
  }

  // ---- local edits ----

  private handleLocalEdit(): void {
    if (this.applyingRemote) return;
    if (this.role === 'host') {
      this.scheduleBroadcast();
    } else if (this.role === 'guest') {
      this.sendMapSoon();
    }
  }

  private scheduleBroadcast(): void {
    if (this.sendTimer !== null) window.clearTimeout(this.sendTimer);
    this.sendTimer = window.setTimeout(() => {
      this.sendTimer = null;
      this.broadcastCity();
    }, 400);
  }

  private sendMapSoon(): void {
    if (this.sendTimer !== null) window.clearTimeout(this.sendTimer);
    this.sendTimer = window.setTimeout(() => {
      this.sendTimer = null;
      this.sendMap();
    }, 250);
  }

  private exportMapMessage(): MpMessage | null {
    let auth: AuthorityMap;
    try {
      auth = this.game.exportAuthority();
    } catch {
      return null;
    }
    const spent = Math.round(this.guestSpent);
    this.guestSpent = 0;
    return {
      t: 'map', v: MP_VERSION,
      net: auth.net,
      kind: packBytes(auth.kind),
      rot: packBytes(auth.rot),
      extras: extrasToJson(auth.extras),
      parkPaths: auth.parkPaths,
      spent,
    };
  }

  private sendMap(): void {
    if (this.role !== 'guest' || !this.link) return;
    const msg = this.exportMapMessage();
    if (msg) this.link.send(msg);
  }

  // ---- host: guests ----

  private resetRoster(): void {
    this.players = [{ id: this.myId, name: this.myName, color: this.myColor }];
    this.colorById = new Map([[this.myId, this.myColor]]);
    if (this.room) {
      let n = 1;
      for (const slot of this.room.connected()) {
        if (!slot.playerId) continue;
        const color = this.colorById.get(slot.playerId) ?? playerColor(n++);
        this.colorById.set(slot.playerId, color);
        this.players.push({ id: slot.playerId, name: slot.playerName || L('Guest', 'Invité·e'), color });
      }
    }
    this.refreshPlayers();
  }

  private onGuestOpen(slot: GuestSlot): void {
    // Wait for hello (name) before announcing; still send the city right away.
    this.sendCityTo(slot);
  }

  private onGuestClose(slot: GuestSlot): void {
    if (slot.playerId) {
      const name = slot.playerName || L('Guest', 'Invité·e');
      this.toast(L(`${name} left.`, `${name} est parti·e.`));
      this.cursors.remove(slot.playerId);
    }
    if (this.pendingInvite === slot.inviteId) this.pendingInvite = null;
    this.room?.slots.delete(slot.inviteId);
    this.resetRoster();
    this.broadcastPlayers();
  }

  private onGuestMessage(slot: GuestSlot, msg: MpMessage): void {
    switch (msg.t) {
      case 'hello': {
        slot.playerId = msg.id.slice(0, 32);
        slot.playerName = cleanName(msg.name);
        this.resetRoster();
        const me = this.colorById.get(slot.playerId) ?? playerColor(this.players.length - 1);
        this.colorById.set(slot.playerId, me);
        this.resetRoster();
        this.room?.sendTo(slot, { t: 'welcome', v: MP_VERSION, id: slot.playerId, color: me, players: this.players });
        this.sendCityTo(slot);
        this.broadcastPlayers(slot.inviteId);
        this.toast(L(`${slot.playerName} joined.`, `${slot.playerName} a rejoint.`));
        this.panel.addChat(slot.playerName, me, L('joined the city.', 'a rejoint la ville.'));
        break;
      }
      case 'map':
        this.applyGuestMap(slot, msg);
        break;
      case 'taxes':
        if (isTaxes(msg.taxes)) {
          try {
            this.game.setTaxes(msg.taxes);
          } catch { /* keep the host city intact */ }
        }
        break;
      case 'tax':
        if (Number.isFinite(msg.value)) {
          try {
            this.game.setTax(Math.max(0, Math.min(30, Math.round(msg.value))));
          } catch { /* ignore */ }
        }
        break;
      case 'funding':
        try {
          this.game.setFunding(msg.key as FundingKey, Math.max(50, Math.min(150, Math.round(msg.value / 10) * 10)));
        } catch { /* ignore */ }
        break;
      case 'policy':
        try {
          this.game.setPolicy(msg.id as PolicyId, msg.on === true);
        } catch { /* ignore */ }
        break;
      case 'loan':
        if (msg.action === 'take' || msg.action === 'repay') {
          try {
            this.game.loan(msg.action);
          } catch { /* ignore */ }
        }
        break;
      case 'districtPolicy':
        if (Number.isInteger(msg.district) && Number.isInteger(msg.mask)) {
          try {
            this.game.setDistrictPolicy(msg.district, msg.mask);
          } catch { /* ignore */ }
        }
        break;
      case 'disasters':
        try {
          this.game.setDisasters(msg.on === true);
        } catch { /* ignore */ }
        break;
      case 'cursor':
        if (slot.playerId && Number.isFinite(msg.x) && Number.isFinite(msg.z)) {
          const color = this.colorById.get(slot.playerId) ?? '#ffffff';
          this.cursors.set(slot.playerId, msg.x, msg.z, color);
          this.room?.broadcast({ t: 'cursor', v: MP_VERSION, id: slot.playerId, x: msg.x, z: msg.z }, slot.inviteId);
        }
        break;
      case 'chat': {
        const text = msg.text.slice(0, 200);
        if (!text.trim() || !slot.playerId) break;
        const color = this.colorById.get(slot.playerId) ?? '#ffffff';
        this.panel.addChat(slot.playerName || L('Guest', 'Invité·e'), color, text);
        this.room?.broadcast({ t: 'chat', v: MP_VERSION, id: slot.playerId, name: slot.playerName, text }, slot.inviteId);
        break;
      }
      case 'bye':
        this.onGuestClose(slot);
        break;
      default:
        break;
    }
  }

  private applyGuestMap(slot: GuestSlot, msg: Extract<MpMessage, { t: 'map' }>): void {
    const kind = unpackBytes(msg.kind, N_TILES);
    const rot = unpackBytes(msg.rot, N_TILES);
    const net = msg.net as AuthorityMap['net'];
    if (!kind || !rot || !net || !Array.isArray(net.nodes) || !Array.isArray(net.segs)) {
      this.sendCityTo(slot);
      return;
    }
    const extras = extrasFromJson(msg.extras, 10);
    if (!extras) {
      this.sendCityTo(slot);
      return;
    }
    const parkPaths = Array.isArray(msg.parkPaths) ? msg.parkPaths : [];
    const spent = Number.isFinite(msg.spent) ? Math.max(0, Math.min(10_000_000, Math.round(msg.spent))) : 0;
    let ok = false;
    try {
      ok = this.game.applyAuthority({ kind, rot, net, extras, parkPaths: parkPaths as AuthorityMap['parkPaths'] }, spent);
    } catch {
      ok = false;
    }
    if (!ok) {
      this.room?.sendTo(slot, { t: 'notice', v: MP_VERSION, text: L('Not enough shared money for that build.', 'Pas assez d’argent commun pour cette construction.') });
      this.sendCityTo(slot);
    }
    // On success the host's edit hook broadcasts the merged city to everyone.
  }

  // ---- host: broadcast ----

  private broadcastCity(): void {
    if (this.role !== 'host' || !this.room) return;
    if (!this.room.connected().length) return;
    let blob = '';
    try {
      blob = encode(this.game.snapshot());
    } catch {
      return;
    }
    this.room.broadcast({ t: 'city', v: MP_VERSION, blob });
  }

  private sendCityTo(slot: GuestSlot): void {
    let blob = '';
    try {
      blob = encode(this.game.snapshot());
    } catch {
      return;
    }
    this.room?.sendTo(slot, { t: 'city', v: MP_VERSION, blob });
  }

  private broadcastPlayers(exceptInvite?: string): void {
    if (this.role !== 'host' || !this.room) return;
    this.room.broadcast({ t: 'players', v: MP_VERSION, players: this.players }, exceptInvite);
  }

  // ---- guest: host messages ----

  private onHostMessage(msg: MpMessage): void {
    if (!this.link) return;
    switch (msg.t) {
      case 'welcome':
        this.myColor = typeof msg.color === 'string' ? msg.color : playerColor(0);
        this.players = msg.players.length ? msg.players : this.players;
        this.rememberRoster(this.players);
        this.refreshPlayers();
        break;
      case 'players':
        this.players = msg.players.length ? msg.players : this.players;
        this.rememberRoster(this.players);
        this.refreshPlayers();
        break;
      case 'city': {
        const data = decode(msg.blob);
        if (!data) break;
        this.applyingRemote = true;
        try {
          this.game.load(data, true);
        } catch { /* keep playing on the last good city */ }
        this.applyingRemote = false;
        this.guestSpent = 0;
        break;
      }
      case 'cursor':
        if (msg.id !== this.myId && Number.isFinite(msg.x) && Number.isFinite(msg.z)) {
          this.cursors.set(msg.id, msg.x, msg.z, this.colorById.get(msg.id) ?? '#ffffff');
        }
        break;
      case 'chat':
        this.panel.addChat(msg.name.slice(0, 24), this.colorById.get(msg.id) ?? '#ffffff', msg.text.slice(0, 200));
        break;
      case 'notice':
        this.toast(msg.text.slice(0, 200));
        break;
      default:
        break;
    }
  }

  // ---- shared ----

  private sendChat(text: string): void {
    const tidy = text.trim().slice(0, 200);
    if (!tidy || this.role === 'idle') return;
    if (this.role === 'host' && this.room) {
      this.panel.addChat(this.myName, this.myColor, tidy);
      this.room.broadcast({ t: 'chat', v: MP_VERSION, id: this.myId, name: this.myName, text: tidy });
    } else if (this.role === 'guest') {
      this.panel.addChat(this.myName, this.myColor, tidy);
      this.link?.send({ t: 'chat', v: MP_VERSION, id: this.myId, name: this.myName, text: tidy });
    }
  }

  private shareCursor(): void {
    if (this.role === 'idle') return;
    const focus = this.getFocus();
    if (!focus) return;
    const x = Math.max(0, Math.min(GRID, focus.x));
    const z = Math.max(0, Math.min(GRID, focus.z));
    if (this.role === 'host') {
      this.room?.broadcast({ t: 'cursor', v: MP_VERSION, id: this.myId, x, z });
    } else {
      this.link?.send({ t: 'cursor', v: MP_VERSION, id: this.myId, x, z });
    }
  }

  private rememberRoster(players: MpPlayer[]): void {
    this.colorById = new Map(players.map((p) => [p.id, p.color]));
  }

  private refreshPlayers(): void {
    this.rememberRoster(this.players);
    this.panel.setPlayers(this.players);
  }

  /** Forward a setter's decision to the host when guesting (local apply stays). */
  private forward<Key extends 'setTax' | 'setTaxes' | 'setFunding' | 'setPolicy' | 'loan' | 'setDistrictPolicy' | 'setDisasters'>(
    key: Key,
    make: (...args: Parameters<Game[Key]>) => MpMessage | null,
  ): void {
    const game = this.game;
    const orig = (game[key] as (...args: Parameters<Game[Key]>) => ReturnType<Game[Key]>).bind(game);
    (game[key] as (...args: Parameters<Game[Key]>) => ReturnType<Game[Key]>) = (...args: Parameters<Game[Key]>) => {
      const out = orig(...args);
      if (this.role === 'guest' && !this.applyingRemote) {
        const msg = make(...args);
        if (msg) this.link?.send(msg);
      }
      return out;
    };
  }
}

function isTaxes(value: unknown): value is Taxes {
  return Array.isArray(value) && value.length === 4
    && value.every((t) => Number.isInteger(t) && t >= 0 && t <= 30);
}

function loadName(): string {
  try {
    const raw = localStorage.getItem(NAME_KEY);
    if (raw) return cleanName(raw);
  } catch { /* storage may be blocked */ }
  return L('Maire', 'Maire');
}

function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch { /* storage may be blocked */ }
}
