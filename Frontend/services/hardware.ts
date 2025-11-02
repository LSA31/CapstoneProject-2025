import api from './api';

export type HardwareEvent = 'START' | 'STOP' | 'TALK' | 'TALK_STOP' | 'BACK';

export async function sendHardwareEvent(device_id: string, event: HardwareEvent) {
  try {
    const res = await api.post('/ws/send', { device_id, event });
    return res.data;
  } catch (e) {
    throw e;
  }
}

export default { sendHardwareEvent };