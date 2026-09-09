"use client";

// Only triggers if the ROOT LAYOUT itself throws (error.tsx can't catch
// that, since the layout wraps error.tsx too) -- must render its own
// <html>/<body> since it replaces the entire root layout when active. Kept
// deliberately plain (no design-token CSS import, since the thing that
// broke might be upstream of globals.css loading correctly).
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          background: "#f5f7f6",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360, padding: "0 16px" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a1f1c" }}>Something went wrong</h1>
          <p style={{ marginTop: 8, fontSize: 13.5, color: "#56605a" }}>
            Willow hit a problem loading this page. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              borderRadius: 8,
              background: "#4f9e8c",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13.6,
              padding: "8px 16px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
