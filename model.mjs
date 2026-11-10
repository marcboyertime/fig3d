// Constant-D spherical diffusion, c(1,t)=1 and c(x,0)=0.
// Forty terms are sufficient throughout the displayed Fourier-number range [0.02,0.32].
export function concentration(x, tau, terms = 40) {
  if (!(x >= 0 && x <= 1 && tau > 0)) throw new RangeError('Expected x in [0,1] and positive tau');
  if (x === 1) return 1;
  let sum = 0;
  for (let n = 1; n <= terms; n++) {
    const sign = n % 2 ? 1 : -1;
    const radial = x === 0 ? Math.PI : Math.sin(n * Math.PI * x) / (n * x);
    sum += sign * radial * Math.exp(-n * n * Math.PI * Math.PI * tau);
  }
  return 1 - 2 * sum / Math.PI;
}
export function particleState(radiusNm) {
  if (!(radiusNm >= 25 && radiusNm <= 100)) throw new RangeError('Radius outside preview range');
  const diffusivity = 1e-16, elapsedSeconds = 2;
  const radiusMeters = radiusNm * 1e-9;
  return {radiusNm, tau: diffusivity * elapsedSeconds / (radiusMeters ** 2), relativeTime: (radiusNm / 50) ** 2};
}
// The radius explorer draws the particle to scale: SVG units per nanometre of radius, so 25 to 100 nm is drawn four times
// as wide, and the 100 nm particle still leaves its 560 × 380 frame room for the words above and below it.
export const DRAWN_PER_NM = 1.2;
export const drawnRadius = radiusNm => DRAWN_PER_NM * radiusNm;
