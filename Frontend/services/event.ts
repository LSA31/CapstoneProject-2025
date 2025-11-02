import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppEventType = 'PLAY' | 'FEED' | 'WALK_START' | 'WALK_STOP';

export type AppEventResponse = {
  owner_id: string;
  experience: number;
  level: number;
  state?: string;
  was_hungry?: boolean;
};

export async function sendEvent(eventType: AppEventType): Promise<AppEventResponse> {
  const body = { event_type: eventType };

  // Read token explicitly and include in the request to ensure the server receives it.
  let token: string | null = null;
  try {
    token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      // eslint-disable-next-line no-console
      console.warn('[event] sendEvent called but no accessToken found in AsyncStorage');
    } else {
      const masked = token.length > 10 ? `${token.slice(0, 6)}...${token.slice(-4)}` : token;
      // eslint-disable-next-line no-console
      console.log(`[event] using accessToken (masked)=${masked}`);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[event] failed to read accessToken from AsyncStorage', e);
  }

  try {
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.post('/como/event', body, { headers });
    return res.data as AppEventResponse;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) {
      // eslint-disable-next-line no-console
      console.warn('[event] /como/event returned 401', err?.response?.data || err?.response?.statusText || err);
      throw Object.assign(new Error('Unauthorized (401) from server when calling /como/event'), { code: 'UNAUTHORIZED' });
    }
    // bubble up other errors
    throw err;
  }
}

export default { sendEvent };
