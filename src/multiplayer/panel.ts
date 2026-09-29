/**
 * Co-op panel: host or join a shared city with copy-paste codes, see who is
 * around, and coordinate over a small chat. Vanilla DOM like the rest of the HUD.
 */
import { getLang } from '../i18n.ts';
import type { MpPlayer } from './protocol.ts';

const L = (en: string, fr: string): string => getLang() === 'fr' ? fr : en;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export interface MpPanelActions {
  getName(): string;
  setName(name: string): void;
  host(): Promise<void>;
  newInvite(): Promise<void>;
  confirmAnswer(code: string): Promise<boolean>;
  join(code: string): Promise<string | null>;
  leave(): void;
  chat(text: string): void;
}

export type MpRole = 'idle' | 'host' | 'guest';

export class MpPanel {
  readonly root = el('div', 'mp-panel');
  private title = el('div', 'mp-title');
  private status = el('div', 'mp-status');
  private nameRow = el('label', 'mp-row');
  private nameInput = el('input', 'mp-name') as HTMLInputElement;
  private idleBox = el('div', 'mp-box');
  private hostBox = el('div', 'mp-box');
  private guestBox = el('div', 'mp-box');
  private inviteArea = el('textarea', 'mp-code') as HTMLTextAreaElement;
  private answerArea = el('textarea', 'mp-code') as HTMLTextAreaElement;
  private joinArea = el('textarea', 'mp-code') as HTMLTextAreaElement;
  private myAnswer = el('textarea', 'mp-code') as HTMLTextAreaElement;
  private playersBox = el('div', 'mp-players');
  private chatLog = el('div', 'mp-chatlog');
  private chatInput = el('input', 'mp-chatinput') as HTMLInputElement;
  private role: MpRole = 'idle';
  private busy = false;

  private myAnswerBox = el('div', 'mp-box');
  private actions: MpPanelActions;

  constructor(actions: MpPanelActions) {
    this.actions = actions;
    this.root.setAttribute('aria-label', L('Multiplayer', 'Multijoueur'));
    const head = el('div', 'mp-head');
    const close = el('button', 'mp-x', '×');
    close.setAttribute('aria-label', L('Close', 'Fermer'));
    close.addEventListener('click', () => this.setOpen(false));
    head.append(el('strong', undefined, L('Multiplayer co-op', 'Multijoueur coop')), close);
    this.root.append(head, this.title, this.status);

    this.nameInput.maxLength = 24;
    this.nameInput.value = actions.getName();
    this.nameInput.setAttribute('aria-label', L('Your mayor name', 'Votre nom de maire'));
    this.nameInput.addEventListener('change', () => actions.setName(this.nameInput.value));
    this.nameRow.append(el('span', 'mp-label', L('Mayor', 'Maire')), this.nameInput);
    this.root.append(this.nameRow);

    // ---- idle: host a city or join one ----
    const hostBtn = el('button', 'mp-btn primary', L('Host this city', 'Héberger cette ville'));
    hostBtn.addEventListener('click', () => this.withBusy(() => this.actions.host()));
    const joinLabel = el('div', 'mp-label', L('Join with an invite code', 'Rejoindre avec un code d’invitation'));
    this.joinArea.rows = 3;
    this.joinArea.placeholder = L('Paste the host’s invite code…', 'Collez le code d’invitation de l’hôte…');
    this.joinArea.setAttribute('aria-label', L('Invite code', 'Code d’invitation'));
    const joinBtn = el('button', 'mp-btn primary', L('Join', 'Rejoindre'));
    joinBtn.addEventListener('click', () => this.withBusy(async () => {
      const answer = await this.actions.join(this.joinArea.value);
      if (answer) {
        this.myAnswer.value = answer;
        this.myAnswerBox.hidden = false;
      }
    }));
    this.myAnswer.rows = 3;
    this.myAnswer.readOnly = true;
    this.myAnswer.setAttribute('aria-label', L('Your answer code', 'Votre code de réponse'));
    const myAnswerLabel = el('div', 'mp-label', L('Send this answer back to the host', 'Renvoyez cette réponse à l’hôte'));
    const copyAnswer = el('button', 'mp-btn', L('Copy', 'Copier'));
    copyAnswer.addEventListener('click', () => copyText(this.myAnswer.value));
    this.myAnswerBox.append(myAnswerLabel, this.myAnswer, copyAnswer);
    this.myAnswerBox.hidden = true;
    this.idleBox.append(hostBtn, joinLabel, this.joinArea, joinBtn, this.myAnswerBox);
    this.root.append(this.idleBox);

    // ---- host: show invite, confirm answers ----
    const inviteLabel = el('div', 'mp-label', L('Invite code: send it to a friend', 'Code d’invitation : envoyez-le à un·e ami·e'));
    this.inviteArea.rows = 3;
    this.inviteArea.readOnly = true;
    this.inviteArea.setAttribute('aria-label', L('Invite code', 'Code d’invitation'));
    const inviteRow = el('div', 'mp-row');
    const copyInvite = el('button', 'mp-btn', L('Copy', 'Copier'));
    copyInvite.addEventListener('click', () => copyText(this.inviteArea.value));
    const freshInvite = el('button', 'mp-btn', L('New code', 'Nouveau code'));
    freshInvite.addEventListener('click', () => this.withBusy(() => this.actions.newInvite()));
    inviteRow.append(copyInvite, freshInvite);
    const answerLabel = el('div', 'mp-label', L('Paste the guest’s answer to let them in', 'Collez la réponse de l’invité·e pour le·la faire entrer'));
    this.answerArea.rows = 3;
    this.answerArea.placeholder = L('Guest answer code…', 'Code de réponse de l’invité·e…');
    this.answerArea.setAttribute('aria-label', L('Guest answer code', 'Code de réponse de l’invité·e'));
    const confirmBtn = el('button', 'mp-btn primary', L('Accept guest', 'Accepter l’invité·e'));
    confirmBtn.addEventListener('click', () => this.withBusy(async () => {
      const ok = await this.actions.confirmAnswer(this.answerArea.value);
      if (ok) this.answerArea.value = '';
    }));
    const leaveHost = el('button', 'mp-btn danger', L('Stop hosting', 'Arrêter l’hébergement'));
    leaveHost.addEventListener('click', () => this.actions.leave());
    this.hostBox.append(inviteLabel, this.inviteArea, inviteRow, answerLabel, this.answerArea, confirmBtn, leaveHost);
    this.root.append(this.hostBox);

    // ---- guest: session info ----
    const leaveGuest = el('button', 'mp-btn danger', L('Leave the city', 'Quitter la ville'));
    leaveGuest.addEventListener('click', () => this.actions.leave());
    this.guestBox.append(
      el('p', 'mp-note', L('You are building on the host’s city. Your edits go to the host, who shares money and growth with everyone.', 'Vous construisez sur la ville de l’hôte. Vos modifications partent chez l’hôte, qui partage caisse et croissance avec tout le monde.')),
      leaveGuest,
    );
    this.root.append(this.guestBox);

    // ---- players + chat ----
    this.root.append(el('div', 'mp-label', L('Mayors online', 'Maires en ligne')), this.playersBox);
    const chatRow = el('div', 'mp-row');
    this.chatInput.maxLength = 200;
    this.chatInput.placeholder = L('Coordinate… (Enter to send)', 'Coordonnez-vous… (Entrée pour envoyer)');
    this.chatInput.setAttribute('aria-label', L('Chat message', 'Message de discussion'));
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.chatInput.value.trim()) {
        this.actions.chat(this.chatInput.value.trim().slice(0, 200));
        this.chatInput.value = '';
      }
      e.stopPropagation();
    });
    const sendBtn = el('button', 'mp-btn', L('Send', 'Envoyer'));
    sendBtn.addEventListener('click', () => {
      if (this.chatInput.value.trim()) {
        this.actions.chat(this.chatInput.value.trim().slice(0, 200));
        this.chatInput.value = '';
      }
    });
    chatRow.append(this.chatInput, sendBtn);
    this.root.append(el('div', 'mp-label', L('Chat', 'Discussion')), this.chatLog, chatRow);
    this.root.append(el('p', 'mp-note', L(
      'Direct browser-to-browser link (no server). If codes fail, both sides reload the page and retry; strict corporate or school networks can block the connection.',
      'Lien direct de navigateur à navigateur (sans serveur). Si les codes échouent, rechargez la page des deux côtés et réessayez ; les réseaux d’entreprise ou d’école stricts peuvent bloquer la connexion.',
    )));
    this.render();
    this.root.hidden = true;
  }

  private async withBusy(fn: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.root.classList.add('mp-busy');
    try {
      await fn();
    } finally {
      this.busy = false;
      this.root.classList.remove('mp-busy');
    }
  }

  setOpen(open: boolean): void {
    this.root.hidden = !open;
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  toggle(): void {
    this.setOpen(!this.isOpen);
  }

  setRole(role: MpRole): void {
    this.role = role;
    this.render();
  }

  setStatus(text: string): void {
    this.status.textContent = text;
  }

  showInvite(code: string): void {
    this.inviteArea.value = code;
  }

  showAnswer(code: string): void {
    this.myAnswer.value = code;
    this.myAnswerBox.hidden = false;
  }

  setPlayers(players: MpPlayer[]): void {
    this.playersBox.replaceChildren();
    for (const p of players) {
      const row = el('div', 'mp-player');
      const dot = el('span', 'mp-dot');
      dot.style.background = p.color;
      row.append(dot, el('span', undefined, p.name));
      this.playersBox.append(row);
    }
    this.title.textContent = players.length > 1
      ? L(`${players.length} mayors building`, `${players.length} maires aux commandes`)
      : L('Solo city', 'Ville solo');
  }

  addChat(name: string, color: string, text: string): void {
    const row = el('div', 'mp-chatline');
    const who = el('strong', undefined, `${name} `);
    who.style.color = color;
    row.append(who, el('span', undefined, text));
    this.chatLog.append(row);
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
    while (this.chatLog.children.length > 80) this.chatLog.firstChild?.remove();
  }

  resetCodes(): void {
    this.joinArea.value = '';
    this.answerArea.value = '';
    this.myAnswer.value = '';
    this.myAnswerBox.hidden = true;
  }

  private render(): void {
    this.idleBox.hidden = this.role !== 'idle';
    this.hostBox.hidden = this.role !== 'host';
    this.guestBox.hidden = this.role !== 'guest';
    this.nameRow.hidden = this.role !== 'idle';
  }
}

async function copyText(text: string): Promise<void> {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard may be blocked: select the text so the player can copy by hand.
    const area = document.activeElement as HTMLTextAreaElement | null;
    if (area && 'select' in area) area.select();
  }
}
