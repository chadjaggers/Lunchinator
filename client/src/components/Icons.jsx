// Icons — line-style SVG glyphs. Replaces the emoji that were used
// throughout the admin UI (the Phase2 brand guide explicitly forbids emoji).
//
// Drop-in equivalent to lucide-react, but inline so we don't have to
// add a new dependency. Stroke is currentColor — pass a color via
// style or wrap in an element with the right `color`.
//
// All icons accept `size` (default 18) and pass any other props through
// to the underlying <svg> (className, style, aria-label, etc).

function SVG({ size = 18, children, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: '-0.18em', flexShrink: 0 }}
      aria-hidden={!rest['aria-label'] || undefined}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IDice = (p) => (
  <SVG {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8"  cy="8"  r="1.1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="8"  r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="8"  cy="16" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="16" r="1.1" fill="currentColor" stroke="none" />
  </SVG>
);

export const ICheck = (p) => <SVG {...p}><path d="M5 12l4.5 4.5L19 7" /></SVG>;
export const IClose = (p) => <SVG {...p}><path d="M6 6l12 12M18 6L6 18" /></SVG>;
export const IArrowRight = (p) => <SVG {...p}><path d="M5 12h14M13 6l6 6-6 6" /></SVG>;
export const IPlus = (p) => <SVG {...p}><path d="M12 5v14M5 12h14" /></SVG>;
export const ISearch = (p) => <SVG {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></SVG>;
export const IClock = (p) => <SVG {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></SVG>;
export const ILink = (p) => (
  <SVG {...p}>
    <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />
  </SVG>
);
export const ISend = (p) => (
  <SVG {...p}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </SVG>
);
export const ISlack = (p) => (
  <SVG {...p}>
    <rect x="3" y="10" width="4" height="2" rx="1" />
    <rect x="10" y="3" width="2" height="4" rx="1" />
    <rect x="17" y="12" width="4" height="2" rx="1" />
    <rect x="12" y="17" width="2" height="4" rx="1" />
    <rect x="8" y="8" width="8" height="8" rx="2" />
  </SVG>
);
export const IEdit = (p) => (
  <SVG {...p}>
    <path d="M4 20h4l10-10-4-4L4 16v4z" />
    <path d="M14 6l4 4" />
  </SVG>
);
export const ITrash = (p) => (
  <SVG {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </SVG>
);
export const IUsers = (p) => (
  <SVG {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.5 19c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
    <circle cx="17.5" cy="7.5" r="2.5" />
    <path d="M16 14c2.4.2 4.6 1.7 5.5 4" />
  </SVG>
);
export const IAlert = (p) => (
  <SVG {...p}>
    <path d="M10.3 3.7l-8 13.8A2 2 0 004 20.5h16a2 2 0 001.7-3l-8-13.8a2 2 0 00-3.4 0z" />
    <path d="M12 9v5M12 17.5v.1" />
  </SVG>
);
