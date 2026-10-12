import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap page">
      <div className="empty">
        <h1>A chapter we couldn’t find.</h1>
        <p>That page isn’t in this library.</p>
        <Link className="button primary" href="/discover">
          Return to discovery
        </Link>
      </div>
    </div>
  );
}
