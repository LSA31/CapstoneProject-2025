import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { registerUser } from '../services/users';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, getProfile } from '../services/users';
import { getDeviceId } from '../utils/device';
import { createComo, hasCreatedComo, markCreatedFlag } from '../services/como';

export default function SignupScreen() {
  const navigation: any = useNavigation();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async () => {
    if (!name || !email || !password) {
      Alert.alert('입력 오류', '이름, 이메일, 비밀번호를 모두 입력해 주세요.');
      return;
    }
    try {
      setLoading(true);
      const resp = await registerUser({ name, email, password });

      // Try to auto-login after successful registration so the tutorial gating
      // that's in LoginScreen is applied consistently for newly created users.
      try {
        const loginResp = await loginUser({ email, password });
        const token = loginResp?.id_token || loginResp?.token || loginResp?.accessToken;
        if (token) {
          await AsyncStorage.setItem('accessToken', token);

          // create Como on first login if needed (same behavior as LoginScreen)
          try {
            const created = await hasCreatedComo();
            if (!created) {
              let pname = email.split('@')[0];
              try {
                const profile = await getProfile();
                if (profile && profile.name) pname = profile.name;
              } catch (err) {
                // ignore
              }
              try {
                const deviceId = await getDeviceId();
                await createComo({ device_id: deviceId, name: pname });
                await markCreatedFlag();
              } catch (err) {
                console.warn('createComo failed after signup', err);
              }
            }
          } catch (err) {
            // ignore
          }

          // Force tutorial start for newly registered users (clear any leftover flag and start)
          try {
            await AsyncStorage.removeItem('hasSeenTutorial');
          } catch (err) {
            // ignore
          }
          navigation.replace('Tutorial1');
          return;
        }
      } catch (loginErr) {
        // fall back to asking user to login manually
        console.warn('auto-login after register failed', loginErr);
      }

      // If auto-login path didn't complete, fall back to the previous behavior.
      Alert.alert('회원가입 완료', resp?.message || '회원 가입이 완료되었습니다.', [
        { text: '확인', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e: any) {
      console.warn('register failed', e);
      // Prefer normalized error code from service
      const code = e?.code;
      const serverMsg = e?.message || e?.response?.data?.message || '';
      if (code === 'EMAIL_EXISTS' || /exist|duplicate|이미|중복/i.test(String(serverMsg))) {
        Alert.alert('회원가입 실패', '이미 사용 중인 이메일입니다. 다른 이메일로 시도해 주세요.');
      } else {
        const msg = serverMsg || '회원가입 중 오류가 발생했습니다.';
        Alert.alert('오류', String(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>회원가입</Text>

        <Text style={styles.label}>이름</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="홍길동" />

        <Text style={styles.label}>이메일</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>비밀번호</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="비밀번호" secureTextEntry />

        <TouchableOpacity style={styles.submit} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>회원가입</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>이미 계정이 있으신가요? 로그인</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24, color: '#333' },
  label: { color: '#666', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 8 },
  submit: { marginTop: 24, backgroundColor: '#3f3023', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#666' },
});
