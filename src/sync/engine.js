import { getOperations, mergeOperations } from "./store.js";

const MAX_OPS_PER_BATCH = 25;
const MAX_MESSAGE_CHARS = 48_000;

function sendJson(channel, value) {
  if (!channel || channel.readyState !== "open") throw new Error("Perangkat belum terhubung");
  const text = JSON.stringify(value);
  if (text.length > MAX_MESSAGE_CHARS) throw new Error("Pesan terlalu besar; kecilkan ukuran batch");
  channel.send(text);
}

export function sendSync(channel) {
  const operations = getOperations();
  const total = Math.max(1, Math.ceil(operations.length / MAX_OPS_PER_BATCH));
  sendJson(channel, { type: "SYNC_BEGIN", totalOps: operations.length, batches: total });
  for (let i = 0; i < operations.length; i += MAX_OPS_PER_BATCH) {
    sendJson(channel, {
      type: "OPS_BATCH",
      batch: Math.floor(i / MAX_OPS_PER_BATCH),
      operations: operations.slice(i, i + MAX_OPS_PER_BATCH)
    });
  }
  // Kirim batch kosong agar peer dengan operation log kosong tetap menerima sesi sync.
  if (operations.length === 0) sendJson(channel, { type: "OPS_BATCH", batch: 0, operations: [] });
  sendJson(channel, { type: "SYNC_END" });
}

export function attachSyncProtocol(channel, { onLog = () => {}, onComplete = () => {} } = {}) {
  let received = 0;
  channel.addEventListener("message", event => {
    let message;
    try { message = JSON.parse(event.data); }
    catch { onLog("Pesan non-JSON diabaikan"); return; }

    try {
      if (message.type === "SYNC_BEGIN") {
        received = 0;
        onLog(`Peer mengirim ${message.totalOps} operasi`);
      } else if (message.type === "OPS_BATCH") {
        const added = mergeOperations(message.operations);
        received += added;
        sendJson(channel, { type: "BATCH_ACK", batch: message.batch, accepted: added });
        onLog(`Batch ${message.batch + 1}: ${added} operasi baru diterapkan`);
      } else if (message.type === "SYNC_END") {
        sendJson(channel, { type: "SYNC_DONE", received });
        onComplete({ received });
      } else if (message.type === "SYNC_DONE") {
        onLog(`Sinkronisasi peer selesai; ${message.received} operasi diterima peer`);
      } else if (message.type === "BATCH_ACK") {
        onLog(`ACK batch ${message.batch + 1}`);
      }
    } catch (error) { onLog(`Sync error: ${error.message}`); }
  });
}
