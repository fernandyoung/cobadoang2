import QRCode from "qrcode";
import QrScanner from "qr-scanner";
import { upsertRecord, getRecords, getDeviceId, subscribe, getDebugState } from "./sync/store.js";
import { PairingSession } from "./sync/peer.js";
import { sendSync, attachSyncProtocol } from "./sync/engine.js";

// Keep the service-worker URL and scope correct on GitHub Pages repository paths.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL
    }).catch(error => console.warn("Service worker registration failed:", error));
  });
}

const $ = id => document.getElementById(id);
let session = null;
let scanner = null;
let channel = null;

function log(message) {
  const el = $("log");
  el.textContent = `${new Date().toLocaleTimeString()} — ${message}\n${el.textContent}`.slice(0, 5000);
}
function status(message) {
  $("status").textContent = message;
  log(message);
}
function render() {
  $("records").textContent = JSON.stringify({ deviceId: getDeviceId(), ...getDebugState(), records: getRecords() }, null, 2);
}
function newSession() {
  session?.close();
  session = new PairingSession({
    onStatus: status,
    onChannel: ch => { channel = ch; attachSyncProtocol(ch, { onLog: log, onComplete: render }); }
  });
  return session;
}
async function showQr(payload) {
  $("payload").value = payload;
  const canvas = $("qr");
  try {
    await QRCode.toCanvas(canvas, payload, {
      errorCorrectionLevel: "L",
      margin: 2,
      width: 560,
      color: { dark: "#111827", light: "#ffffff" }
    });
    canvas.hidden = false;
  } catch (error) {
    canvas.hidden = true;
    throw new Error(`Gagal membuat QR (${error.message}). Gunakan salin-tempel payload di kotak teks.`);
  }
}

$("add").onclick = () => {
  const title = $("title").value.trim();
  if (!title) return alert("Isi nama aktivitas terlebih dahulu");
  upsertRecord({ title, description: $("description").value.trim(), completed: false, createdAt: new Date().toISOString() });
  $("title").value = ""; $("description").value = ""; render();
};
$("refresh").onclick = render;
subscribe(render);
render();

$("create").onclick = async () => {
  try {
    const s = newSession();
    const offer = await s.createOffer();
    await showQr(offer);
    status("Offer siap. Pindai QR ini dari perangkat kedua.");
  } catch (e) { status(e.message); }
};
$("acceptOffer").onclick = async () => {
  try {
    const s = newSession();
    const answer = await s.acceptOffer($("payload").value.trim());
    await showQr(answer);
    status("Answer siap. Pindai QR ini dari perangkat pembuat Offer.");
  } catch (e) { status(e.message); }
};
$("acceptAnswer").onclick = async () => {
  try {
    if (!session) throw new Error("Buat Offer terlebih dahulu pada perangkat ini");
    await session.acceptAnswer($("payload").value.trim());
    status("Answer diterapkan. Menunggu koneksi WebRTC...");
  } catch (e) { status(e.message); }
};
$("scan").onclick = async () => {
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Kamera membutuhkan HTTPS atau localhost");
    const video = $("video"); video.hidden = false;
    scanner?.stop();
    scanner = new QrScanner(video, result => {
      $("payload").value = result.data;
      scanner.stop(); video.hidden = true;
      status("QR berhasil dipindai. Pilih Accept Offer atau Accept Answer sesuai peran perangkat.");
    }, { returnDetailedScanResult: true, highlightScanRegion: true });
    await scanner.start();
  } catch (e) { status(`Scanner: ${e.message}`); }
};
$("stopScan").onclick = () => { scanner?.stop(); $("video").hidden = true; };
$("sync").onclick = () => {
  try { sendSync(channel); log("Operation log dikirim ke peer"); }
  catch (e) { status(e.message); }
};
