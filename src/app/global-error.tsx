"use client";

// Last-resort boundary when the root layout itself fails; it must render its own <html>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", textAlign: "center", color: "#0f172a" }}>
        <h1 style={{ fontSize: "1.5rem" }}>Readyhire is having trouble</h1>
        <p style={{ color: "#475569" }}>
          Please try again in a moment{error.digest ? ` (reference ${error.digest})` : ""}.
        </p>
        <button type="button" onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
