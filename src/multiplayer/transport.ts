/**
 * WebRTC transport for co-op: one RTCPeerConnection per guest, star topology
 * around the host, manual signalling (no server). Browser-only; protocol.ts
 * stays pure so tests never touch this module.
 */
import { ChunkBuffer, encodeSignal, decodeSignal, isMpMessage, parseWire, randomId, serializeWire } from './protocol.ts';
import type { MpMessage } from './protocol.ts';

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
};

const DC_LABEL = 'gridburg';
const GATHER_TIMEOUT = 12_000;

function waitGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };
    const onChange = (): void => {
      if (pc.iceGatheringState === 'complete') finish();
    };
    pc.addEventListener('icegatheringstatechange', onChange);
    window.setTimeout(finish, GATHER_TIMEOUT);
  });
}

export interface PeerEvents {
  onMessage(msg: MpMessage): void;
  onOpen(): void;
  onClose(): void;
}

/** One peer connection with a single ordered data channel. */
export class MpPeer {
  readonly pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private chunks = new ChunkBuffer();
  private events: PeerEvents;
  /** True once the data channel is open for sending. */
  open = false;

  constructor(events: PeerEvents) {
    this.events = events;
    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.pc.addEventListener('datachannel', (ev) => this.attach(ev.channel));
  }

  private attach(dc: RTCDataChannel): void {
    this.dc = dc;
    dc.binaryType = 'arraybuffer';
    dc.onopen = () => {
      this.open = true;
      this.events.onOpen();
    };
    dc.onclose = () => {
      this.open = false;
      this.events.onClose();
    };
    dc.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      const msg = parseWire(ev.data, this.chunks);
      if (msg && isMpMessage(msg)) this.events.onMessage(msg);
    };
  }

  /** Host side: create the channel, offer, and return a pasteable invite code. */
  async hostInvite(): Promise<string> {
    const dc = this.pc.createDataChannel(DC_LABEL, { ordered: true });
    this.attach(dc);
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await waitGatheringComplete(this.pc);
    return encodeSignal(this.pc.localDescription);
  }

  /** Host side: consume the guest's answer code. */
  async hostAccept(code: string): Promise<boolean> {
    const answer = decodeSignal<RTCSessionDescriptionInit>(code);
    if (!answer || typeof answer.type !== 'string' || typeof answer.sdp !== 'string') return false;
    try {
      await this.pc.setRemoteDescription(answer);
      return true;
    } catch {
      return false;
    }
  }

  /** Guest side: consume the host's invite, return a pasteable answer code. */
  async guestAnswer(code: string): Promise<string | null> {
    const offer = decodeSignal<RTCSessionDescriptionInit>(code);
    if (!offer || typeof offer.type !== 'string' || typeof offer.sdp !== 'string') return null;
    try {
      await this.pc.setRemoteDescription(offer);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await waitGatheringComplete(this.pc);
      return encodeSignal(this.pc.localDescription);
    } catch {
      return null;
    }
  }

  send(msg: MpMessage): boolean {
    if (!this.dc || this.dc.readyState !== 'open') return false;
    try {
      for (const part of serializeWire(`m-${randomId()}`, msg)) this.dc.send(part);
      return true;
    } catch {
      return false;
    }
  }

  close(): void {
    try {
      this.dc?.close();
    } catch { /* already gone */ }
    try {
      this.pc.close();
    } catch { /* already gone */ }
    this.open = false;
  }
}

export interface GuestSlot {
  inviteId: string;
  peer: MpPeer;
  playerId: string | null;
  playerName: string;
}

/**
 * Host side: one peer per guest. Invites are created one at a time: the host
 * shows an invite code, the guest answers, the host pastes the answer back.
 */
export class HostRoom {
  slots = new Map<string, GuestSlot>();
  onGuestMessage: ((slot: GuestSlot, msg: MpMessage) => void) | null = null;
  onGuestOpen: ((slot: GuestSlot) => void) | null = null;
  onGuestClose: ((slot: GuestSlot) => void) | null = null;

  /** Start a pending invite and return its code to show the guest. */
  async createInvite(): Promise<{ inviteId: string; code: string }> {
    const inviteId = randomId();
    let slotRef: GuestSlot | null = null;
    const peer = new MpPeer({
      onMessage: (msg) => {
        if (slotRef && this.onGuestMessage) this.onGuestMessage(slotRef, msg);
      },
      onOpen: () => {
        if (slotRef && this.onGuestOpen) this.onGuestOpen(slotRef);
      },
      onClose: () => {
        if (slotRef && this.onGuestClose) this.onGuestClose(slotRef);
      },
    });
    slotRef = { inviteId, peer, playerId: null, playerName: '' };
    this.slots.set(inviteId, slotRef);
    try {
      const code = await peer.hostInvite();
      return { inviteId, code };
    } catch {
      this.slots.delete(inviteId);
      throw new Error('invite-failed');
    }
  }

  /** Consume one guest's answer code for a pending invite. */
  async acceptAnswer(inviteId: string, code: string): Promise<boolean> {
    const slot = this.slots.get(inviteId);
    if (!slot) return false;
    const ok = await slot.peer.hostAccept(code);
    if (!ok) return false;
    return true;
  }

  drop(inviteId: string): void {
    const slot = this.slots.get(inviteId);
    if (!slot) return;
    slot.peer.close();
    this.slots.delete(inviteId);
  }

  sendTo(slot: GuestSlot, msg: MpMessage): boolean {
    return slot.peer.send(msg);
  }

  broadcast(msg: MpMessage, exceptInvite?: string): void {
    for (const [id, slot] of this.slots) {
      if (id === exceptInvite) continue;
      slot.peer.send(msg);
    }
  }

  /** Guests whose channel is open (invites still pending are skipped). */
  connected(): GuestSlot[] {
    return [...this.slots.values()].filter((s) => s.peer.open);
  }

  close(): void {
    for (const [, slot] of this.slots) slot.peer.close();
    this.slots.clear();
  }
}

/** Guest side: a single connection back to the host. */
export class GuestLink {
  peer: MpPeer | null = null;
  onMessage: ((msg: MpMessage) => void) | null = null;
  onOpen: (() => void) | null = null;
  onClose: (() => void) | null = null;

  /** Consume the host's invite code; returns our answer code to send back. */
  async join(code: string): Promise<string | null> {
    this.leave();
    const peer = new MpPeer({
      onMessage: (msg) => this.onMessage?.(msg),
      onOpen: () => this.onOpen?.(),
      onClose: () => this.onClose?.(),
    });
    this.peer = peer;
    const answer = await peer.guestAnswer(code);
    if (!answer) {
      this.leave();
      return null;
    }
    return answer;
  }

  send(msg: MpMessage): boolean {
    return this.peer?.send(msg) ?? false;
  }

  get connected(): boolean {
    return this.peer?.open ?? false;
  }

  leave(): void {
    this.peer?.close();
    this.peer = null;
  }
}
