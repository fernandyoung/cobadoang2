const APP = "PWA_TRACKER_P2P";
const CHANNEL = "tracker-sync-v1";

function waitForIceGathering(pc, timeoutMs = 15000) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error("ICE gathering timeout")); }, timeoutMs);
    const onChange = () => {
      if (pc.iceGatheringState === "complete") { cleanup(); resolve(); }
    };
    const cleanup = () => { clearTimeout(timeout); pc.removeEventListener("icegatheringstatechange", onChange); };
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

function makePeer() {
  // Tanpa STUN/TURN: paling cocok untuk jaringan lokal yang mengizinkan koneksi peer-to-peer.
  return new RTCPeerConnection({ iceServers: [] });
}

function pack(type, sdp) { return JSON.stringify({ app: APP, type, sdp }); }
function unpack(payload, expectedType) {
  const value = JSON.parse(payload);
  if (value?.app !== APP || value?.type !== expectedType || !value?.sdp?.type || !value?.sdp?.sdp) {
    throw new Error(`QR/payload bukan ${expectedType} PWA Tracker yang valid`);
  }
  return value.sdp;
}

export class PairingSession {
  constructor({ onChannel, onStatus }) {
    this.pc = makePeer();
    this.channel = null;
    this.onChannel = onChannel;
    this.onStatus = onStatus || (() => {});
    this.pc.onconnectionstatechange = () => this.onStatus(`WebRTC: ${this.pc.connectionState}`);
    this.pc.oniceconnectionstatechange = () => this.onStatus(`ICE: ${this.pc.iceConnectionState}`);
  }

  attachChannel(channel) {
    this.channel = channel;
    channel.binaryType = "arraybuffer";
    channel.onopen = () => {
      this.onStatus("Terhubung — DataChannel terbuka");
      this.onChannel?.(channel);
    };
    channel.onclose = () => this.onStatus("Koneksi ditutup");
    channel.onerror = () => this.onStatus("DataChannel mengalami error");
  }

  async createOffer() {
    this.attachChannel(this.pc.createDataChannel(CHANNEL, { ordered: true }));
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await waitForIceGathering(this.pc);
    return pack("offer", this.pc.localDescription);
  }

  async acceptOffer(payload) {
    const offer = unpack(payload, "offer");
    this.pc.ondatachannel = event => this.attachChannel(event.channel);
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await waitForIceGathering(this.pc);
    return pack("answer", this.pc.localDescription);
  }

  async acceptAnswer(payload) {
    const answer = unpack(payload, "answer");
    await this.pc.setRemoteDescription(answer);
  }

  close() {
    try { this.channel?.close(); } catch {}
    this.pc.close();
  }
}
