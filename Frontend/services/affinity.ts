import api from './api';
import { getComo } from './como';

type AffinityCallback = (raw: any) => void;

let ws: WebSocket | null = null;
let reconnectTimer: number | null = null;
let stopped = false;

const getWsUrl = (): string => {
  const base = (api.defaults && (api.defaults as any).baseURL) || '';
  if (!base) return 'ws://localhost:8080/ws/affinity';
  // convert http(s) base to ws(s)
  return base.replace(/^http/, 'ws') + '/ws/affinity';
};

export function startAffinitySocket(onMessage?: AffinityCallback) {
  stopped = false;
  const connect = () => {
    const url = getWsUrl();
    try {
      ws = new WebSocket(url);
    } catch (e) {
      // fallback: try without trailing path
      ws = new WebSocket(url);
    }

    if (!ws) return;

    ws.onopen = () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[affinity] connected to', getWsUrl());
      } catch (e) {}
      if (reconnectTimer) {
        clearTimeout(reconnectTimer as any);
        reconnectTimer = null;
      }
    };

    ws.onmessage = async (ev) => {
      try {
        const text = typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data);
        // eslint-disable-next-line no-console
        console.log('[affinity] message', text);
        let parsed: any = null;
        try { parsed = JSON.parse(text); } catch (e) { parsed = text; }
        // call optional callback
        try { onMessage && onMessage(parsed); } catch (e) {}

        // default behavior: re-fetch latest Como so UI can update
        try {
          const c = await getComo();
          // eslint-disable-next-line no-console
          console.log('[affinity] fetched /como after ws message', c && typeof c === 'object' ? Object.keys(c) : typeof c);
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore
      }
    };

    ws.onclose = (ev) => {
      try {
        console.warn('[affinity] socket closed', ev?.code, ev?.reason || '');
      } catch (e) {}
      ws = null;
      if (!stopped) scheduleReconnect();
    };

    ws.onerror = (err) => {
      try {
        console.warn('[affinity] socket error', err);
      } catch (e) {}
      // errors will be followed by onclose
    };
  };

  const scheduleReconnect = () => {
    if (reconnectTimer) return;
    // try reconnect after 2s
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!stopped) connect();
    }, 2000) as unknown as number;
  };

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer as any);
      reconnectTimer = null;
    }
    if (ws) {
      try { ws.close(); } catch (e) {}
      ws = null;
    }
  };
}

export function stopAffinitySocket() {
  try {
    if (ws) {
      ws.close();
      ws = null;
    }
  } catch (e) {}
  if (reconnectTimer) {
    clearTimeout(reconnectTimer as any);
    reconnectTimer = null;
  }
  stopped = true;
}

export default { startAffinitySocket, stopAffinitySocket };
