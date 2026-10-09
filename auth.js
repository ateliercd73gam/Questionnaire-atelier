const AUTH = {
  HASH: '271a5ef3c8d25428fabd651526abb6af97790148c845f613958b4a2711ea8997',
  KEY:  'atelier_auth'
};

function sha256Hex (str) {
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const bytes = Array.from(unescape(encodeURIComponent(str)), c => c.charCodeAt(0));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < bytes.length; off += 64) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) {
      w[i] = (bytes[off + i*4] << 24) | (bytes[off + i*4 + 1] << 16) | (bytes[off + i*4 + 2] << 8) | bytes[off + i*4 + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i-15], 7) ^ rotr(w[i-15], 18) ^ (w[i-15] >>> 3);
      const s1 = rotr(w[i-2], 17) ^ rotr(w[i-2], 19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

function bindGateForm (form, onSuccess) {
  const input = form.querySelector('input');
  let busy = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy || !input.value) return;
    busy = true;
    let ok = false;
    try { ok = await DB.signIn(input.value); } catch (err) { console.error(err); }
    busy = false;
    if (ok) { onSuccess(); return; }
    input.value = '';
    form.classList.remove('shake');
    void form.offsetWidth;
    form.classList.add('shake');
    input.focus();
  });
}

function mountResultsAccess () {
  const box = document.createElement('div');
  box.className = 'res-access';
  box.innerHTML = `
    <button type="button" class="res-btn">backstage</button>
    <form class="gate-form" autocomplete="off">
      <input type="text" placeholder="mot de passe" aria-label="Mot de passe" autocomplete="off" autocapitalize="off" spellcheck="false">
      <button type="submit" aria-label="Valider">→</button>
    </form>`;
  document.body.appendChild(box);

  const form  = box.querySelector('form');
  const input = box.querySelector('input');
  const close = () => { box.classList.remove('open'); input.value = ''; };

  box.querySelector('.res-btn').addEventListener('click', () => {
    if (DB.signedHint()) { window.location.href = 'results.html'; return; }
    box.classList.toggle('open');
    if (box.classList.contains('open')) input.focus();
  });
  document.addEventListener('click', e => { if (!box.contains(e.target)) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  bindGateForm(form, () => { window.location.href = 'results.html'; });
}
