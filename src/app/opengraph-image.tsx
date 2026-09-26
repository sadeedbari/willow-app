import { ImageResponse } from "next/og";

export const alt = "Willow — Practice Management Software for Therapists";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Site-wide default: Next resolves file-convention OG images per segment,
// falling back to the closest ancestor -- so this one root-level file
// covers every public page (homepage, both /vs pages, /signup, /terms,
// /privacy) that doesn't define its own, without duplicating it six times.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #4F9E8C 0%, #6E93C9 33%, #9E8FD6 66%, #DB9179 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              width: "104px",
              height: "104px",
              borderRadius: "30px",
              background: "rgba(255,255,255,0.16)",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="#fff" strokeWidth={2}>
              <path d="M12 21c-4-2-7-6-7-11a7 7 0 0 1 14 0c0 5-3 9-7 11Z" />
              <path d="M12 10v6" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            Willow
          </div>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "40px",
            fontSize: 40,
            fontWeight: 600,
            color: "#fff",
            maxWidth: "980px",
            lineHeight: 1.25,
          }}
        >
          Practice management software that actually feels good to use
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "28px",
            fontSize: 28,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          Scheduling · Telehealth · Notes · Billing · Client Portal
        </div>
      </div>
    ),
    { ...size }
  );
}
