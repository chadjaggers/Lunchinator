// Eyebrow — the Phase2 signature: cyan underscore + tracked Manrope
// section label. Use anywhere you'd normally put a small uppercase header.
//
// Usage:
//   <Eyebrow>Restaurant</Eyebrow>
//   <Eyebrow color="var(--ice)">Last session</Eyebrow>

export default function Eyebrow({ children, color = 'var(--cyan)', className = '' }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      style={{
        fontFamily: 'Manrope, sans-serif',
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: '0.2em',
        color,
        lineHeight: 1,
      }}
    >
      <span aria-hidden style={{ opacity: 0.95 }}>_</span>
      <span>{children}</span>
    </div>
  );
}
