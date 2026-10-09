const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwpAqWQYNdZmdevauAlwNrYNkAKtbR-Mq9aroRXi86feAuALCTqBZvXLjpxESIVbfV3/exec';

const POLL_SHEET_MS  = 5000;
const POLL_HIDDEN_MS = 30000;
const POLL_LOCAL_MS  = 1000;
const FETCH_TIMEOUT  = 25000;
const LOCAL_KEY = 'atelier_results';
const PW_KEY    = 'atelier_pw';

const DB = (() => {
  const useSheet = !!SCRIPT_URL;

  const store = {
    get () { try { return sessionStorage.getItem(PW_KEY); } catch (e) { return null; } },
    set (v) { try { v == null ? sessionStorage.removeItem(PW_KEY) : sessionStorage.setItem(PW_KEY, v); } catch (e) {} }
  };
  const authListeners = new Set();
  const notifyAuth = () => authListeners.forEach(f => f(!!store.get()));

  async function call (action, extra = {}) {
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    let res;
    try {
      res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action, password: store.get() || '', ...extra }),
        signal: controller.signal
      });
    } finally { clearTimeout(abort); }
    let json;
    try { json = await res.json(); } catch (e) { throw new Error('Réponse invalide du serveur'); }
    if (!json.ok) { const err = new Error(json.error || 'Erreur'); err.code = json.error; throw err; }
    return json;
  }

  const readLocal = () => JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');

  const backend = useSheet ? {
    save:      record => call('submit', { record }),
    list:      async () => (await call('list')).records,
    deleteAll: () => call('deleteAll'),
    verify: async password => {
      try { await call('check', { password }); return true; }
      catch (e) { if (e.code === 'unauthorized') return false; throw e; }
    }
  } : {
    save: async record => {
      const all = readLocal();
      if (!all.some(r => r.session_id === record.session_id)) all.push(record);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    },
    list:      async () => readLocal(),
    deleteAll: async () => localStorage.removeItem(LOCAL_KEY),
    verify:    async password => sha256Hex(password) === AUTH.HASH
  };

  const subs = new Set();
  const refreshAll = () => Promise.all([...subs].map(s => s.now()));

  function subscribe (onData, onError, onStatus) {
    let stopped = false, running = false, failed = false, last = null, timer = null, connected = false;
    const status = (s, at) => { if (onStatus && !stopped) onStatus(s, at); };

    const tick = async () => {
      if (stopped || running) return;
      clearTimeout(timer);
      running = true;
      if (!connected) status('connecting');
      try {
        const records = await backend.list();
        connected = true; status('connected', new Date());
        const serialized = JSON.stringify(records);
        if (failed || serialized !== last) {
          last = serialized; failed = false;
          if (!stopped) onData(records);
        }
      } catch (e) {
        failed = true; connected = false; status('disconnected');
        if (e.code === 'unauthorized') { store.set(null); notifyAuth(); }
        if (onError) onError(e);
      }
      running = false;
      if (!stopped) timer = setTimeout(tick, document.hidden ? POLL_HIDDEN_MS : (useSheet ? POLL_SHEET_MS : POLL_LOCAL_MS));
    };

    const wake = () => tick();
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('online', wake);
    const handle = { now: tick };
    subs.add(handle);
    tick();
    return () => {
      stopped = true; clearTimeout(timer);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
      window.removeEventListener('online', wake);
      subs.delete(handle);
    };
  }

  return {
    mode: useSheet ? 'sheet' : 'local',
    signedHint: () => !!store.get(),
    init: async () => {},
    save: async record => { await backend.save(record); refreshAll(); },
    deleteAll: async () => { await backend.deleteAll(); refreshAll(); },
    refresh: () => refreshAll(),
    signIn: async password => {
      const ok = await backend.verify(password);
      if (ok) { store.set(password); notifyAuth(); }
      return ok;
    },
    signOut: async () => { store.set(null); notifyAuth(); },
    subscribe,
    onAuth (cb) {
      authListeners.add(cb);
      cb(!!store.get());
      return () => authListeners.delete(cb);
    }
  };
})();
