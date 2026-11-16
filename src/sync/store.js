const STORAGE_KEY = "tracker_p2p_state_v1";

function uuid() {
  return crypto.randomUUID();
}

function initialState() {
  return {
    schema: 1,
    deviceId: uuid(),
    clock: 0,
    records: {},       // id -> { id, fields, deleted, clock, deviceId }
    operations: []     // append-only operation log; retained for offline peers
  };
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw);
    if (parsed?.schema !== 1 || !parsed.deviceId || !parsed.records || !Array.isArray(parsed.operations)) {
      throw new Error("Format data tracker tidak dikenali");
    }
    return parsed;
  } catch (error) {
    // Jangan menimpa data rusak secara diam-diam.
    throw new Error(`Gagal membaca data lokal: ${error.message}`);
  }
}

let state = readState();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    throw new Error(`Gagal menyimpan LocalStorage (mungkin kuota penuh): ${error.message}`);
  }
  for (const listener of listeners) listener(getRecords());
}

function compareVersion(a, b) {
  if ((a?.clock ?? 0) !== (b?.clock ?? 0)) return (a?.clock ?? 0) - (b?.clock ?? 0);
  return String(a?.deviceId ?? "").localeCompare(String(b?.deviceId ?? ""));
}

function applyOperationToState(op) {
  const current = state.records[op.recordId];
  const incomingVersion = { clock: op.clock, deviceId: op.deviceId };
  const currentVersion = current ? { clock: current.clock, deviceId: current.deviceId } : null;
  if (!current || compareVersion(incomingVersion, currentVersion) > 0) {
    state.records[op.recordId] = {
      id: op.recordId,
      fields: op.fields ?? {},
      deleted: op.action === "delete",
      clock: op.clock,
      deviceId: op.deviceId
    };
  }
}

function makeOperation(action, recordId, fields = {}) {
  state.clock += 1;
  return {
    opId: uuid(),
    deviceId: state.deviceId,
    clock: state.clock,
    action,
    recordId,
    fields,
    createdAt: new Date().toISOString()
  };
}

export function getDeviceId() { return state.deviceId; }
export function getRecords() {
  return Object.values(state.records).filter(r => !r.deleted).map(r => ({ id: r.id, ...r.fields }));
}
export function getOperations() { return state.operations.slice(); }
export function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }

export function upsertRecord(fields) {
  const id = fields.id || uuid();
  const op = makeOperation("upsert", id, { ...fields, id: undefined });
  // Hilangkan properti undefined agar payload bersih.
  delete op.fields.id;
  state.operations.push(op);
  applyOperationToState(op);
  persist();
  return id;
}

export function deleteRecord(id) {
  const op = makeOperation("delete", id, {});
  state.operations.push(op);
  applyOperationToState(op);
  persist();
}

/** Merge operasi remote secara idempotent. Versi tertinggi menang secara deterministik.
 *  Ini adalah LWW berbasis Lamport clock + deviceId, bukan waktu dinding.
 */
export function mergeOperations(remoteOps) {
  if (!Array.isArray(remoteOps)) throw new Error("Batch operasi tidak valid");
  const known = new Set(state.operations.map(op => op.opId));
  let added = 0;
  for (const op of remoteOps) {
    if (!op || typeof op.opId !== "string" || typeof op.deviceId !== "string" ||
        typeof op.recordId !== "string" || !Number.isSafeInteger(op.clock) ||
        !["upsert", "delete"].includes(op.action)) continue;
    if (known.has(op.opId)) continue;
    known.add(op.opId);
    state.operations.push(op);
    state.clock = Math.max(state.clock, op.clock);
    applyOperationToState(op);
    added++;
  }
  if (added) persist();
  return added;
}

export function getDebugState() {
  return { deviceId: state.deviceId, clock: state.clock, recordCount: getRecords().length, operationCount: state.operations.length };
}
