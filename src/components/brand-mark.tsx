// The same gradient + location-pin mark used in the sidebar logo and the
// browser favicon (src/app/icon.svg) -- kept in one place so the auth pages,
// sidebar, and favicon can never drift from each other.
export function BrandMark({ size = 34 }: { size?: number }) {
  const radius = Math.round(size * 0.294);
  const iconSize = Math.round(size * 0.53);

  return (
    <div
      className="flex flex-none items-center justify-center shadow-md"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background:
          "conic-gradient(from 200deg, #4F9E8C, #6E93C9 30%, #9E8FD6 60%, #DB9179 85%, #4F9E8C)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        width={iconSize}
        height={iconSize}
      >
        <path d="M12 21c-4-2-7-6-7-11a7 7 0 0 1 14 0c0 5-3 9-7 11Z" />
        <path d="M12 10v6" />
      </svg>
    </div>
  );
}
