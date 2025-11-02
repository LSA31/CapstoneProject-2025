import api from './api';

export async function endWalk(payload?: { durationSec?: number; distanceMeters?: number }) {
  // payload is optional; backend may accept metadata about the walk
  const body = payload || {};
  const res = await api.post('/walk/end', body);
  return res.data;
}

export default { endWalk };
