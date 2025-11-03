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
    return res.data;
  } catch (e) {
    try {
      // fallback to plural if singular not present
      const res2 = await api.post('/comos', payload);
      return res2.data;
    } catch (e2) {
      // rethrow original error to caller
      throw e;
    }
  }
}

export async function getComo() {
  try {
    const res = await api.get('/como');
    return res.data;
  } catch (e: any) {
    try {
      const res2 = await api.get('/comos');
      return res2.data;
    } catch (e2: any) {
      throw e;
    }
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
