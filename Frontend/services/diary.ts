import api from './api';

export type DiaryItem = {
  diary_id: string;
  author_id: string;
  content: string;
  advice?: string | null;
  audio_url?: string[];
  emo_tag?: string[];
  created_at?: string;
  date: string;
  dialog?: string[] | null;
};

export type GetDiaryResult = { diary: DiaryItem | null; notFoundDetail?: string | null };

export async function getDiaryByDate(date?: string): Promise<GetDiaryResult> {
  try {
    // prefer new endpoint /diaries/today which can return today's diaries when no date provided
    // fallback to /diaries?date=... if not available
    // eslint-disable-next-line no-console
    console.log('[diary] GET /diaries/today', date ? `(requested date: ${date})` : '(no date param)');
    try {
      const res = date ? await api.get('/diaries/today', { params: { date } }) : await api.get('/diaries/today');
      console.log('[diary] getDiaryByDate /diaries/today response', res.status, res.data);
      if (Array.isArray(res.data)) {
        return { diary: res.data.length ? (res.data[res.data.length - 1] as DiaryItem) : null };
      }
      return { diary: res.data as DiaryItem };
    } catch (e) {
      console.warn('[diary] /diaries/today failed, falling back to /diaries?date', String(e));
    }

    if (date) {
      console.log('[diary] GET /diaries?date=', date);
      const res2 = await api.get('/diaries', { params: { date } });
      console.log('[diary] getDiaryByDate /diaries response', res2.status, res2.data);
      if (Array.isArray(res2.data)) return { diary: res2.data.length ? (res2.data[res2.data.length - 1] as DiaryItem) : null };
      return { diary: res2.data as DiaryItem };
    }
    // final fallback: try GET /diaries (list) and return the most recent entry if present
    try {
      const resAll = await api.get('/diaries');
      if (Array.isArray(resAll.data) && resAll.data.length) return { diary: resAll.data[resAll.data.length - 1] as DiaryItem };
    } catch (eAll) {
      // ignore
    }
    return { diary: null };
  } catch (e: any) {
    // Treat 404 (Not Found) and certain 401 (Unauthorized returned by some backends
    // when a diary isn't present) as "no diary yet" and return null. Other errors
    // should still be surfaced.
    const status = e?.response?.status;
    // eslint-disable-next-line no-console
    console.warn('[diary] getDiaryByDate error status=', status, e?.message || e);
    const detail = e?.response?.data?.detail;
    if (status === 404 || status === 401) {
      // Log that we're intentionally treating 401/404 like 'no diary' for UX resilience
      // eslint-disable-next-line no-console
      console.log('[diary] treating status', status, 'as no-diary -> returning null, detail=', detail);
      return { diary: null, notFoundDetail: typeof detail === 'string' ? detail : null };
    }
    throw e;
  }
}

export async function listDiaries(date?: string): Promise<DiaryItem[]> {
  try {
    // Prefer calling GET /diaries?date=YYYY-MM-DD if a date is provided.
    if (date) {
      // eslint-disable-next-line no-console
      console.log('[diary] listDiaries GET /diaries?date=', date);
      const res = await api.get('/diaries', { params: { date } });
      // eslint-disable-next-line no-console
      console.log('[diary] listDiaries response', res.status, Array.isArray(res.data) ? res.data.length : typeof res.data);
      if (Array.isArray(res.data)) return res.data as DiaryItem[];
      // if server returns a single object for that date, normalize to array
      if (res.data && typeof res.data === 'object') return [res.data as DiaryItem];
    }

    // fallback: try GET /diaries (list)
    // eslint-disable-next-line no-console
    console.log('[diary] GET /diaries (list) fallback');
    const res = await api.get('/diaries');
    // eslint-disable-next-line no-console
    console.log('[diary] listDiaries response', res.status, Array.isArray(res.data) ? res.data.length : typeof res.data);
    if (Array.isArray(res.data)) return res.data as DiaryItem[];

    // fallback endpoints
    const res2 = await api.get('/diaries/list');
    // eslint-disable-next-line no-console
    console.log('[diary] GET /diaries/list response', res2.status, Array.isArray(res2.data) ? res2.data.length : typeof res2.data);
    if (Array.isArray(res2.data)) return res2.data as DiaryItem[];

    try {
      const res3 = await api.get('/diaries/all');
      // eslint-disable-next-line no-console
      console.log('[diary] GET /diaries/all response', res3.status, Array.isArray(res3.data) ? res3.data.length : typeof res3.data);
      if (Array.isArray(res3.data)) return res3.data as DiaryItem[];
    } catch (e3) {
      // eslint-disable-next-line no-console
      console.warn('[diary] listDiaries fallback error', String(e3));
    }

    // final fallback: return empty array so UI shows empty state instead of error
    return [];
  } catch (e: any) {
    // last-resort: log and return empty array
    // eslint-disable-next-line no-console
    console.warn('[diary] listDiaries error', String(e));
    return [];
  }
}

export default { getDiaryByDate, listDiaries };
