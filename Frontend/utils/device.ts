import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getDeviceId(): Promise<string> {
  const KEY = 'deviceId';
  try {
    const existing = await AsyncStorage.getItem(KEY);
    if (existing) return existing;
  } catch (e) {
    // ignore
  }

  // simple UUID v4 generator (lightweight, no dependency)
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  try {
    await AsyncStorage.setItem(KEY, uuid);
  } catch (e) {
    // ignore write
  }
  return uuid;
}

export default { getDeviceId };
