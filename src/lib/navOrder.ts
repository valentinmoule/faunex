/**
 * Position d'une page dans la barre du bas (gauche → droite) :
 * Collection, Terrain, Capture, Explorateurs, Défis. -1 hors barre.
 */
export const navSlot = (pathname: string, search = ''): number => {
  const under = (p: string) => pathname === p || pathname.startsWith(p + '/');
  if (under('/home')) return new URLSearchParams(search).get('tab') === 'map' ? 1 : 0;
  if (under('/capture')) return 2;
  if (under('/explorers')) return 3;
  if (under('/defis') || under('/apprendre')) return 4;
  return -1;
};

export const slideDirection = (from: number, to: number): 'right' | 'left' | null =>
  from >= 0 && to >= 0 && from !== to ? (to > from ? 'right' : 'left') : null;
