const PATHS = {
  arrowUp: 'M7 17L17 7M8 7h9v9', arrowDown: 'M17 7L7 17M16 17H7V8', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
  send: 'M4 12l16-8-6 16-3-7-7-1z', home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  users: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20a7 7 0 0114 0M17 4.5a3.5 3.5 0 010 6.5M22 20a6 6 0 00-4-5.6',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', check: 'M5 12.5l4.5 4.5L19 7', x: 'M6 6l12 12M18 6L6 18',
  clock: 'M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z', logout: 'M10 5H5v14h5M15 8l4 4-4 4M19 12H9',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6', copy: 'M9 9h10v11H9zM5 15V4h10', trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
  chevR: 'M9 6l6 6-6 6', chevL: 'M15 6l-6 6 6 6', chevD: 'M6 9l6 6 6-6', search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  alert: 'M12 4l9 16H3zM12 10v4M12 17.5v.01', info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8v.01',
  key: 'M14 10a4 4 0 11-2.5-3.7L20 15v3h-3v-2h-2l-3-3', receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  wallet: 'M4 7h15a1 1 0 011 1v11H5a1 1 0 01-1-1zM4 7l12-3v3M16 13.5h.01', refresh: 'M20 11a8 8 0 10-2 6M20 4v7h-7',
  pulse: 'M3 12h4l3-7 4 14 3-7h4', ban: 'M12 21a9 9 0 100-18 9 9 0 000 18zM6 6l12 12',
  sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6', bell: 'M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z', bank: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18',
  back: 'M21 5H9l-6 7 6 7h12zM15 10l-4 4M11 10l4 4', flask: 'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M8 15h8',
};

export default function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      <path d={PATHS[name]} />
    </svg>
  );
}
