/**
 * A `Scene` as SVG markup. The web game draws every scene as an <img> of this
 * (scene3d.tsx), and the art preview (assets/source/build-peg-preview.ts)
 * stitches scenes into one sheet with it.
 */
import type { Grad, Prim, Scene } from './perspectiveModel';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function attrs(o: Record<string, string | number | undefined>): string {
  return Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k}="${typeof v === 'string' ? esc(v) : v}"`)
    .join('');
}

export function gradSvg(g: Grad): string {
  const stops = g.stops
    .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`)
    .join('');
  return g.kind === 'radial'
    ? `<radialGradient id="${g.id}" cx="${g.cx}" cy="${g.cy}" r="${g.r}">${stops}</radialGradient>`
    : `<linearGradient id="${g.id}" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${stops}</linearGradient>`;
}

export function primSvg(p: Prim): string {
  const common = {
    fill: p.fill ?? 'none',
    stroke: p.stroke,
    'stroke-width': p.sw,
    opacity: p.opacity,
    transform: p.transform,
    'stroke-linecap': p.round ? 'round' : undefined,
    'stroke-linejoin': p.round ? 'round' : undefined,
  };
  switch (p.t) {
    case 'circle':
      return `<circle${attrs({ cx: p.cx, cy: p.cy, r: p.r, ...common })}/>`;
    case 'ellipse':
      return `<ellipse${attrs({ cx: p.cx, cy: p.cy, rx: p.rx, ry: p.ry, ...common })}/>`;
    case 'path':
      return `<path${attrs({ d: p.d, ...common })}/>`;
  }
}

/** One scene as a standalone SVG document, sized by its viewBox. */
export function sceneSvg(scene: Scene): string {
  const defs = scene.grads.length > 0 ? `<defs>${scene.grads.map(gradSvg).join('')}</defs>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.w} ${scene.h}">` +
    defs +
    scene.prims.map(primSvg).join('') +
    '</svg>'
  );
}

/** `sceneSvg` as an <img src>. */
export const sceneDataUri = (scene: Scene) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sceneSvg(scene))}`;
