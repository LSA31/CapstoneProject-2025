import api from './api';

type RegisterPayload = {
  user_type?: string;
  name: string;
  email: string;
  password: string;
};

export async function registerUser(payload: RegisterPayload) {
  // backend expects user_type, name, email, password
  const body = {
    user_type: payload.user_type || 'user',
    name: payload.name,
    email: payload.email,
    password: payload.password,
  };

  try {
    const res = await api.post('/users/register', body);
    return res.data;
  } catch (e: any) {
    // normalize common errors so the UI can react
    const status = e?.response?.status;
    const serverMsg = e?.response?.data?.message || e?.response?.data || e?.message || '서버 오류';
    const err = new Error(String(serverMsg));
    // attach a simple code for common cases
    if (status === 409 || /exist|duplicate|이미|중복/i.test(String(serverMsg))) {
      // email already exists
      // @ts-ignore
      err.code = 'EMAIL_EXISTS';
    } else {
      // @ts-ignore
      err.code = 'API_ERROR';
    }
    throw err;
  }
}

export async function loginUser(payload: { email: string; password: string }) {
  try {
    const res = await api.post('/users/login', {
      email: payload.email,
      password: payload.password,
    });
    // backend returns { id_token: string }
    return res.data;
  } catch (e: any) {
    const status = e?.response?.status;
    const serverMsg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || '로그인 오류';
    const err = new Error(String(serverMsg));
    // attach code for 401
    if (status === 401) {
      // @ts-ignore
      err.code = 'INVALID_CREDENTIALS';
    } else {
      // @ts-ignore
      err.code = 'API_ERROR';
    }
    throw err;
  }
}

export async function getProfile() {
  try {
    const res = await api.get('/users/me');
    return res.data;
  } catch (e) {
    throw e;
  }
}

export default { registerUser };
