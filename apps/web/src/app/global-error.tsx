"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "sans-serif",
            gap: "1rem",
          }}
        >
          <h2>Terjadi kesalahan</h2>
          <button onClick={() => reset()}>Coba lagi</button>
        </div>
      </body>
    </html>
  );
}
