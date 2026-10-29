"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Search,
  ArrowUpRight,
  Menu,
  X,
  SlidersHorizontal,
  Scale,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "./provider";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    router = useRouter();
  const [menu, setMenu] = useState(false),
    [q, setQ] = useState("");
  const { config, email, compare, account, logout, notify } = useApp();
  const staffRoute = path.startsWith("/admin");
  const links = [
    [account ? "My reading room" : "Home", account ? "/dashboard" : "/"],
    ["Discover", "/discover"],
    ["Ask the librarian", "/librarian"],
    ["My shelf", "/shelf"],
    ["Reading paths", "/paths"],
  ];
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="ShelfSense home">
          <span className="brand-icon">
            <BookOpen size={24} strokeWidth={1.5} />
          </span>
          Shelf<span>Sense</span>
        </Link>
        <nav
          className={menu ? "nav-links open" : "nav-links"}
          aria-label="Main navigation"
        >
          {links.map(([label, url]) => (
            <Link
              key={url}
              className={
                (url === "/" ? path === "/" : path.startsWith(url))
                  ? "active"
                  : ""
              }
              href={url}
              onClick={() => setMenu(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <form
            className="header-search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push("/search?q=" + encodeURIComponent(q));
            }}
          >
            <Search size={17} />
            <input
              aria-label="Search the catalog"
              placeholder="Search books"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>
          <Link
            href="/preferences"
            className="icon-button desktop-pref"
            aria-label="Reading preferences"
          >
            <SlidersHorizontal size={18} />
          </Link>
          {account ? (
            <details className="account-menu">
              <summary>
                <span className="account-avatar">
                  {account.name[0]?.toUpperCase()}
                </span>
                <span>{account.name.split(" ")[0]}</span>
              </summary>
              <div>
                <span className="account-menu-name">
                  {account.name}
                  <small>{account.email}</small>
                </span>
                <Link href="/dashboard">My reading room</Link>
                <Link href="/settings">Account settings</Link>
                {config?.staff && <Link href="/admin">Library workspace</Link>}
                <button
                  onClick={() =>
                    logout()
                      .then(() => router.push("/"))
                      .catch((e) => notify(e.message))
                  }
                >
                  Sign out
                </button>
              </div>
            </details>
          ) : (
            <div className="auth-nav">
              <Link href="/login">Sign in</Link>
              <Link className="button primary" href="/signup">
                Create account <ArrowUpRight size={13} />
              </Link>
            </div>
          )}
          <button
            className="icon-button menu-button"
            onClick={() => setMenu(!menu)}
            aria-label="Toggle navigation"
            aria-expanded={menu}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">{children}</main>
      {!staffRoute && (
        <footer className="site-footer">
          <div>
            <Link href="/" className="wordmark small">
              <BookOpen size={20} />
              ShelfSense
            </Link>
            <p>A little guidance. A world of books.</p>
          </div>
          <div className="footer-links">
            <Link href="/about">
              Our approach <ArrowUpRight size={13} />
            </Link>
            <Link href="/evaluation">Project evaluation</Link>

            <Link href="/settings">Settings & privacy</Link>
          </div>
          <div className="footer-note">
            <span className="status-dot" />
            {config?.demo
              ? "Book discovery · curated catalog"
              : "Book discovery"}
            <small>Made for curious minds.</small>
          </div>
        </footer>
      )}
      {compare.length > 0 && (
        <Link href="/compare" className="compare-dock">
          <Scale size={17} /> Compare {compare.length} books{" "}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </>
  );
}
