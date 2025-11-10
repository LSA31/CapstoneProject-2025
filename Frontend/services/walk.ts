// NOTE: walk start/stop are performed over the websocket protocol in the current
// backend design. Do NOT call the HTTP /walk/stop endpoint from the client.
// Keep endWalk() as a no-op wrapper so callers (e.g. `WalkScreen`) can still
// await it without changing the UI flow.

export async function endWalk(payload?: { durationSec?: number; distanceMeters?: number }) {
  // Intentionally do not call HTTP /walk/stop. If you need to notify the server
  // over websocket, do so from the websocket service (e.g. services/affinity or
  // a dedicated ws client). Here we just return a resolved shape similar to
  // previous API responses so callers continue to work.
  return { ok: true, payload: payload || {} };
}

export default { endWalk };
