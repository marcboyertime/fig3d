// The scene kit: pieces every 3D page shares, extracted from the pages as they were, with no visual change.
// renderer.mjs: the site's WebGL renderer, the way every scene made it (antialiased, transparent over the page's #0f111b,
// sRGB output, ACES filmic tone mapping). A page passes only what differs: its exposure, and whether it needs shadows,
// clipping planes, a non-black clear colour or a kept drawing buffer (review captures only).
//   const renderer = createRenderer(THREE, canvas, {exposure: .92, shadows: true});
export function createRenderer(T, canvas, {exposure = 1, shadows = false, clipping = false, clear = 0x000000, keepBuffer = false} = {}) {
  const renderer = new T.WebGLRenderer({canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!keepBuffer});
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.setClearColor(clear, 0);
  if (shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; }
  if (clipping) renderer.localClippingEnabled = true;
  return renderer;
}
