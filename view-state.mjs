// Shareable views: what a reader is looking at, kept in the address as a hash (#question=stress&view=x1), so a copied
// address reopens the same view, on the same question, figure, slider position and cut.
// A page lists its view as ordered fields, each with the reducer action that sets it. A field is written only when it
// differs from what replaying the fields before it gives, and only if replaying it really reproduces it, so the default
// view has no hash at all and a link never claims a view it cannot show. Restoring replays the same actions in order.
//   field: {key, get: state => value, act: (value, state) => action or null, parse?: text => value, format?: value => text,
//           when?: state => bool (write the field only while it shapes what is shown, e.g. one question's own slider)}
// A hash with "=" in it is a view; a plain #anchor (#explorer, #hop) is left alone. Any hash already skips the opening.
const same = (a, b) => typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 5e-4 : a === b;

export function viewParams(hash = globalThis.location?.hash || '') {
  return hash.length > 1 && hash.includes('=') ? new URLSearchParams(hash.slice(1)) : null;
}

export function encodeView(fields, state, start, reduce) {
  const out = new URLSearchParams(); let s = start;
  for (const f of fields) {
    if (f.when && !f.when(state)) continue;
    const v = f.get(state); if (v == null || same(v, f.get(s))) continue;
    const a = f.act(v, s); if (!a) continue;
    const t = reduce(s, a); if (!same(f.get(t), v)) continue;
    out.set(f.key, f.format ? f.format(v) : String(v)); s = t;
  }
  return out;
}

export function decodeView(fields, params, state, reduce) {
  let s = state;
  for (const f of fields) {
    if (!params?.has(f.key)) continue;
    const v = f.parse ? f.parse(params.get(f.key)) : params.get(f.key);
    if (v == null || Number.isNaN(v)) continue;
    const a = f.act(v, s); if (a) s = reduce(s, a);
  }
  return s;
}

// Keep the address in step with the view without adding history entries; waits for the reader to pause.
export function viewWriter(delay = 400) {
  let timer = 0;
  return params => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (typeof location === 'undefined' || typeof history === 'undefined') return;   // not in a browser (Node checks)
      // ':' and ',' are legal in a fragment: keep them readable (face=111:1,1,1, not face=111%3A1%2C1%2C1).
      const h = params.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ','), here = location.pathname + location.search;
      if (!h && !viewParams()) return;   // leave a plain #anchor alone
      const url = here + (h ? '#' + h : '');
      if (url !== here + location.hash) history.replaceState(history.state, '', url);
    }, delay);
  };
}

// Parsers shared by the pages.
export const num = t => (t === '' || t == null ? NaN : +t);
export const bool = t => t === '1' || t === 'true';
export const fixed = n => v => (+v).toFixed(n).replace(/\.?0+$/, '') || '0';
export const flag = v => (v ? '1' : '0');
