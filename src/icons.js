const s = (d, extra = '') => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const icons = {
  back: s('<path d="M15 18l-6-6 6-6"/>'),
  play: s('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
  pause: s('<path d="M8 5v14M16 5v14"/>'),
  restart: s('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
  help: s('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>'),
  soundOn: s('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>'),
  soundOff: s('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  full: s('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  heart: s('<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/>'),
  search: s('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  grid: s('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
  clock: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  bolt: s('<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  arrow: s('<path d="M5 12h14M13 6l6 6-6 6"/>'),
};
export const logoSVG = (id = 'lg') => `<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true"><defs>
<linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ab8ff"/><stop offset="1" stop-color="#3d6bff"/></linearGradient>
<linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b5cff"/><stop offset="1" stop-color="#4a2fd6"/></linearGradient>
<linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ff4f6d"/></linearGradient></defs>
<path d="M32 4 56 18 32 32 8 18Z" fill="url(#${id}t)"/><path d="M8 18 32 32 32 60 8 46Z" fill="url(#${id}l)"/><path d="M56 18 56 46 32 60 32 32Z" fill="url(#${id}r)"/>
<path d="M27.5 23.5 27.5 45.5 46.5 34.5Z" fill="#0b1020" opacity=".35"/><path d="M26 22 26 44 45 33Z" fill="#fff"/></svg>`;
