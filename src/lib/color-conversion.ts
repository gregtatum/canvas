export function hexToRgb(hex: number, target: Tuple3 = [0, 0, 0]): Tuple3 {
  const r = (0xff0000 & hex) >> 16;
  const g = (0x00ff00 & hex) >> 8;
  const b = 0x0000ff & hex;

  target[0] = r / 255;
  target[1] = g / 255;
  target[2] = b / 255;

  return target;
}

export function hexToString(hex: number): string {
  return "#" + (0xf000000 | hex).toString(16).substr(1);
}

export function hslaToRgb(
  h: number,
  s: number,
  l: number,
  a: number,
  target: Tuple4 = [0, 0, 0, 0]
): Tuple4 {
  hslToRgb(h, s, l, target as any as Tuple3);
  target[3] = a;
  return target;
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function hslToRgb(
  h: number,
  s: number,
  l: number,
  target: Tuple3 = [0, 0, 0]
): Tuple3 {
  let r, g, b;

  // achromatic
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }

  target[0] = r;
  target[1] = g;
  target[2] = b;

  return target;
}

export function rgbToFillStyle(h: number, s: number, l: number): string {
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `hsl(${h},${s}%,${l}%)`;
}

export function rgbaToFillStyle(
  h: number,
  s: number,
  l: number,
  a: number
): string {
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  // Round to 0.000
  a = Math.round(a * 1000) / 1000;

  return ["hsla(", h, ",", s, "%,", l, "%,", a, ")"].join("");
}

// Confines to a 0-255 range.
function floatToU8(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n * 255)));
}

export function rgbToHex(r: number, g: number, b: number): number {
  const r255 = floatToU8(r);
  const g255 = floatToU8(g);
  const b255 = floatToU8(b);

  return (r255 << 16) | (g255 << 8) | b255;
}

export function rgbaToHsl(
  r: number,
  g: number,
  b: number,
  a: number,
  target: Tuple4 = [0, 0, 0, 0]
): Tuple4 {
  rgbToHsl(r, g, b, target as any as Tuple3);
  target[3] = a;
  return target;
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number,
  target: Tuple3 = [0, 0, 0]
): Tuple3 {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h;
  let s;
  const l = (max + min) / 2;

  // achromatic
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        throw new Error("Could not convert to HSL." + [r, g, b]);
    }

    h /= 6;
  }

  target[0] = h;
  target[1] = s;
  target[2] = l;

  return target;
}

export function rgbFillStyle(r: number, g: number, b: number) {
  r = floatToU8(r);
  g = floatToU8(g);
  b = floatToU8(b);
  return `rgb(${r},${g},${b})`;
}

export function rgbaFillStyle(
  r: number,
  g: number,
  b: number,
  a: number
): string {
  r = floatToU8(r);
  g = floatToU8(g);
  b = floatToU8(b);

  // Round to 0.000
  a = Math.round(a * 1000) / 1000;

  return `rgba(${r},${g},${b},${a}")`;
}

export function stringToHex(string: string): number {
  return parseInt(string.substr(1), 16);
}
