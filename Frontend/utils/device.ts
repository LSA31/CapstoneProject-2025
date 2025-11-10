import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getDeviceId(): Promise<string> {
  const KEY = 'deviceId';
  const FIXED = 'COMO_Device_f7fd00';
  // Overwrite any existing value and always return the fixed id
  try {
    await AsyncStorage.setItem(KEY, FIXED);
  } catch (e) {
    // ignore write
  }
  return FIXED;
}

export default { getDeviceId };
