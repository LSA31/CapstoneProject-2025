import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ComoCreatePayload = {
  device_id: string;
  name: string;
};

export async function createComo(payload: ComoCreatePayload) {
  // Try a reasonable endpoint; backend may vary (adjust if your API differs)
  try {
    // prefer singular endpoint if backend exposes /como
    const res = await api.post('/como', payload);
    console.log('[createComo] /como created', res.status, res.data);
    return res.data;
  } catch (e: any) {
    // Log helpful debug info and rethrow - backend should implement /como
    console.warn('[createComo] POST /como failed', {
      status: e?.response?.status,
      message: e?.message,
    });
    throw e;
  }
}

export async function getComo() {
  try {
    const res = await api.get('/como');
    return res.data;
  } catch (e: any) {
    // No plural fallback: the backend for this project should expose /como.
    console.warn('[getComo] GET /como failed', { status: e?.response?.status, message: e?.message });
    throw e;
  }
}

export async function markCreatedFlag() {
  try {
    await AsyncStorage.setItem('hasCreatedComo', 'true');
  } catch (e) {
    // ignore
  }
}

export async function hasCreatedComo(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem('hasCreatedComo');
    return v === 'true';
  } catch (e) {
    return false;
  }
}

export default { createComo, markCreatedFlag, hasCreatedComo, getComo };
