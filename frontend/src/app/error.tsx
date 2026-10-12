"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="wrap page">
      <div className="empty">
        <h2>The library needs a moment.</h2>
        <p>Please try opening this page again.</p>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
