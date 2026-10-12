"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  BookOpen,
  Compass,
  Leaf,
  Lightbulb,
  Check,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useData } from "@/lib/use-data";
import type { Book } from "@/lib/types";
import { BookCard } from "@/components/book-card";
import { Loading, Empty, Modal } from "@/components/ui";
import {useApp} from '@/components/provider';

const moods = [
  ["A little escape", "Fantasy"],
  ["Something thoughtful", "Reflective"],
  ["A fresh perspective", "Technology"],
  ["Just one more chapter", "Mystery"],
];
function SearchBox({ large = false }: { large?: boolean }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  return (
    <form
      className={"discovery-search " + (large ? "large" : "")}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push("/librarian?q=" + encodeURIComponent(q));
      }}
    >
      <Search size={20} />
      <input
        aria-label="Describe your next read"
        placeholder="A book, a mood, a little curiosity…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        maxLength={1500}
      />
      <button aria-label="Find your next book">
        <ArrowRight size={20} />
      </button>
    </form>
  );
}
export function HomePage() {
  const {account}=useApp();
  const { data, error, loading } = useData<{ books: Book[] }>("books?limit=40");
  const featured = [
    "midnight-library",
    "beautiful-world",
    "educated",
    "atomic-habits",
    "alchemist",
  ]
    .map((id) => data?.books.find((b) => b.id === id))
    .filter((b): b is Book => !!b);
  return (
    <div className="home-page">
      <section className="hero wrap">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-line" /> YOUR NEXT CHAPTER STARTS HERE
          </div>
          <h1>
            A good book.
            <br />
            A whole new <em>world.</em>
          </h1>
          <p className="hero-description">
            For the books you didn’t know you were looking for.
            <br className="desktop" /> A personal librarian, a thoughtful match,
            your next great read.
          </p>
          <div className="hero-cta-row"><Link className="button primary" href="/discover">Explore the library <ArrowUpRight size={16}/></Link><Link className="hero-secondary-link" href={account?'/dashboard':'/signup'}>{account?'Your reading room':'Create your reading space'} <ArrowRight size={15}/></Link></div>
          <SearchBox large />
          <div className="hero-prompts">
            <span>Try a little inspiration</span>
            <Link href="/librarian?q=A%20short%20hopeful%20read">
              A hopeful read <ArrowUpRight size={12} />
            </Link>
            <Link href="/librarian?q=Beginner%20friendly%20artificial%20intelligence">
              Learn something new <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="hero-foot">
            <span>
              <Check size={14} /> Picks with a reason
            </span>
            <span>
              <BookOpen size={14} /> Find it in your library
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <img
            className="hero-photo"
            src="/images/reading-room.webp"
            alt="Sunlit reading room with oak bookshelves and a forest-green armchair"
            fetchPriority="high"
          />
          <div className="photo-label">
            <span className="status-dot" /> A space for curious minds{" "}
            <span>01 / THE READING ROOM</span>
          </div>
          <div className="hero-note">
            <span className="note-icon">
              <BookOpen size={20} strokeWidth={1.4} />
            </span>
            <div>
              <strong>Your next favorite is out there.</strong>
              <span>Let’s find it together.</span>
            </div>
            <ArrowUpRight size={18} />
          </div>
          <div className="image-caption">
            An original editorial illustration
          </div>
        </div>
      </section>
      <section className="mood-section wrap">
        <div className="mood-heading">
          <span className="eyebrow">FOLLOW YOUR CURIOSITY</span>
          <h2>What are you in the mood for?</h2>
        </div>
        <div className="mood-options">
          {moods.map(([label, value], i) => (
            <Link
              key={label}
              href={`/search?${i === 1 ? "mood" : "genre"}=${encodeURIComponent(value)}`}
            >
              <span className={"mood-icon m" + i}>
                {i === 0 ? (
                  <Compass />
                ) : i === 1 ? (
                  <Leaf />
                ) : i === 2 ? (
                  <Lightbulb />
                ) : (
                  <BookOpen />
                )}
              </span>
              <span>{label}</span>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </section>
      <section className="book-section wrap">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE SHELFSENSE EDIT</span>
            <h2>
              A good place to start<span className="heading-dot">.</span>
            </h2>
            <p>
              Thoughtful stories and fresh ideas, picked for a little discovery.
            </p>
          </div>
          <Link href="/discover" className="text-link">
            Explore all books <ArrowRight size={16} />
          </Link>
        </div>
        {error ? (
          <Empty title="The library is taking a moment" text={error} />
        ) : loading ? (
          <Loading />
        ) : (
          <div className="book-grid five">
            {featured.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>
      <section className="curated-collections wrap"><div className="section-heading"><div><span className="eyebrow">A DIFFERENT DOOR INTO THE LIBRARY</span><h2>Where will your curiosity take you?</h2></div><Link className="text-link" href="/paths">Follow a learning path <ArrowUpRight size={15}/></Link></div><div className="collection-grid"><Link href="/search?genre=Fantasy" className="collection-tile fiction"><span className="collection-number">01 / STORIES</span><h3>A little escape.<br/><em>A lot of possibility.</em></h3><p>Step into another world.</p><div className="collection-covers"><img src="/images/covers/piranesi.jpg" alt="Piranesi cover"/><img src="/images/covers/hobbit.jpg" alt="The Hobbit cover"/></div><ArrowUpRight size={24}/></Link><Link href="/search?mode=learning" className="collection-tile learning"><span className="collection-number">02 / IDEAS</span><h3>Make room<br/>for <em>a new idea.</em></h3><p>Books that open up a subject.</p><div className="collection-covers"><img src="/images/covers/design-everyday.jpg" alt="The Design of Everyday Things cover"/><img src="/images/covers/ai-guide.jpg" alt="Artificial Intelligence guide cover"/></div><ArrowUpRight size={24}/></Link><Link href="/search?max_pages=250" className="collection-tile short"><span className="collection-number">03 / SMALL WONDERS</span><h3>A few pages.<br/><em>A lasting impression.</em></h3><p>Find a good read under 250 pages.</p><div className="collection-covers"><img src="/images/covers/little-prince.jpg" alt="The Little Prince cover"/><img src="/images/covers/animal-farm.jpg" alt="Animal Farm cover"/></div><ArrowUpRight size={24}/></Link></div></section>
      <section className="editorial-banner wrap">
        <div className="editorial-photo">
          <img
            src="/images/library-tables.webp"
            alt="Quiet library tables and bookshelves"
            loading="lazy"
          />
        </div>
        <div className="editorial-copy">
          <span className="eyebrow">A LITTLE GUIDANCE GOES A LONG WAY</span>
          <h2>
            Less searching.
            <br />
            <em>More getting lost.</em>
          </h2>
          <p>
            Tell us what you love, what you’re curious about, or simply how you
            feel. We’ll help you find a book—and show you why it belongs on your
            shelf.
          </p>
          <Link href="/librarian" className="button primary">
            Meet your librarian <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section className="how-section wrap">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DISCOVERY, MADE PERSONAL</span>
            <h2>Your taste. Your pace. Your library.</h2>
          </div>
          <Link className="text-link" href="/about">
            Our approach <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="how-grid">
          {[
            [
              "01",
              "Start with a feeling",
              "A favorite book, a learning goal, or a mood. There’s no wrong place to begin.",
            ],
            [
              "02",
              "Find your kind of book",
              "A shortlist with clear reasons. Keep what you like, change what you don’t.",
            ],
            [
              "03",
              "Turn the first page",
              "Find an available copy, note its shelf, and make room for your next chapter.",
            ],
          ].map(([n, t, p]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="join-library wrap"><div><span className="eyebrow">A SHELF THAT GROWS WITH YOU</span><h2>Your discoveries deserve<br/><em>a place of their own.</em></h2><p>Save the books you find, keep private reading notes, and pick up where you left off.</p></div><div><Link className="button primary" href={account?'/dashboard':'/signup'}>{account?'Enter my reading room':'Create my account'} <ArrowUpRight size={17}/></Link><span>No account needed to explore.</span></div></section>
    </div>
  );
}

export function DiscoverPage() {
  const [route, setRoute] = useState("familiar"),
    [mode, setMode] = useState("");
  const { data, error, loading } = useData<{ books: Book[]; engine: string }>(
    `books?limit=40&route=${route}&mode=${mode}`,
  );
  return (
    <div className="wrap page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A WORLD WORTH EXPLORING</span>
          <h1>
            Follow your <em>curiosity.</em>
          </h1>
          <p>
            A familiar favorite, a fresh perspective, or something entirely
            unexpected.
          </p>
        </div>
        <Link href="/preferences" className="button secondary">
          <SlidersHorizontal size={16} /> Shape your taste
        </Link>
      </div>
      <SearchBox />
      <div className="discovery-controls">
        <div className="segmented" role="group" aria-label="Discovery route">
          {["familiar", "explore", "surprise"].map((r) => (
            <button
              className={route === r ? "active" : ""}
              onClick={() => setRoute(r)}
              key={r}
            >
              {r === "familiar"
                ? "For your shelf"
                : r === "explore"
                  ? "A little further"
                  : "Surprise me"}
            </button>
          ))}
        </div>
        <div className="chips">
          <button
            className={mode === "" ? "selected" : ""}
            onClick={() => setMode("")}
          >
            All books
          </button>
          <button
            className={mode === "fiction" ? "selected" : ""}
            onClick={() => setMode("fiction")}
          >
            Stories
          </button>
          <button
            className={mode === "learning" ? "selected" : ""}
            onClick={() => setMode("learning")}
          >
            Ideas & learning
          </button>
        </div>
      </div>
      <div className="section-heading compact">
        <h2>
          {route === "familiar"
            ? "Make yourself at home"
            : route === "explore"
              ? "Beyond the familiar"
              : "An unexpected next chapter"}
        </h2>
        <span className="fineprint">
          {data?.books.length || 0} books · Demo library
        </span>
      </div>
      {error ? (
        <Empty title="Couldn’t open the catalog" text={error} />
      ) : loading ? (
        <Loading />
      ) : (
        <div className="book-grid">
          {data?.books.map((b) => (
            <BookCard book={b} key={b.id} />
          ))}
        </div>
      )}
    </div>
  );
}

const genres = [
  "Fiction",
  "Fantasy",
  "Science fiction",
  "Mystery",
  "Technology",
  "Science",
  "Design",
  "Psychology",
  "History",
  "Personal growth",
  "Memoir",
];
export function SearchPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SearchInner />
    </Suspense>
  );
}
function SearchInner() {
  const params = useSearchParams(),
    router = useRouter();
  const [q, setQ] = useState(params.get("q") || ""),
    [open, setOpen] = useState(false);
  const query = params.toString();
  const { data, error, loading } = useData<{ books: Book[]; total: number }>(
    `books?${query}`,
  );
  const change = (name: string, value: string) => {
    const p = new URLSearchParams(query);
    if (value) p.set(name, value);
    else p.delete(name);
    router.replace("/search?" + p.toString(), { scroll: false });
  };
  const filter = (
    <>
      <label>
        Genre
        <select
          value={params.get("genre") || ""}
          onChange={(e) => change("genre", e.target.value)}
        >
          <option value="">Every genre</option>
          {genres.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
      <label>
        Reading mood
        <select
          value={params.get("mood") || ""}
          onChange={(e) => change("mood", e.target.value)}
        >
          <option value="">Any mood</option>
          {[
            "Reflective",
            "Hopeful",
            "Thoughtful",
            "Funny",
            "Adventurous",
            "Mysterious",
            "Practical",
            "Emotional",
            "Suspenseful",
            "Dark",
          ].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
      <label>
        Reading level
        <select
          value={params.get("level") || ""}
          onChange={(e) => change("level", e.target.value)}
        >
          <option value="">All levels</option>
          {["Beginner", "Intermediate", "Advanced"].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
      <label>
        Book length
        <select
          value={params.get("max_pages") || ""}
          onChange={(e) => change("max_pages", e.target.value)}
        >
          <option value="">Any length</option>
          <option value="200">Under 200 pages</option>
          <option value="350">Under 350 pages</option>
          <option value="500">Under 500 pages</option>
        </select>
      </label>
      <label>
        Edition language
        <select
          value={params.get("language") || ""}
          onChange={(e) => change("language", e.target.value)}
        >
          <option value="">Any language</option>
          <option value="eng">English</option>
          <option value="hin">Hindi</option>
        </select>
      </label>
      <label>
        Library branch
        <select
          value={params.get("branch") || ""}
          onChange={(e) => change("branch", e.target.value)}
        >
          <option value="">All branches</option>
          <option>Central Library</option>
          <option>Study Annex</option>
        </select>
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={params.get("available_only") === "true"}
          onChange={(e) =>
            change("available_only", e.target.checked ? "true" : "")
          }
        />{" "}
        Available copies only
      </label>
      <button className="text-button" onClick={() => router.replace("/search")}>
        Reset filters <X size={13} />
      </button>
      <p className="fineprint">
        Sample inventory. Availability is verified only while its timestamp is
        fresh.
      </p>
    </>
  );
  return (
    <div className="wrap page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE LIBRARY, AT YOUR FINGERTIPS</span>
          <h1>
            Find something <em>good.</em>
          </h1>
          <p>Search a title, a topic, or the kind of story you want.</p>
        </div>
      </div>
      <form
        className="catalog-search"
        onSubmit={(e) => {
          e.preventDefault();
          change("q", q);
        }}
      >
        <Search size={20} />
        <input
          aria-label="Search books"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search books, authors, ideas…"
        />
        <button className="button primary">
          Search <ArrowRight size={16} />
        </button>
      </form>
      <div className="search-layout">
        <aside className="filter-panel">
          <h3>Make it your own</h3>
          {filter}
        </aside>
        <section>
          <div className="results-heading">
            <span>
              {data?.total ?? "…"} discoveries
              {params.get("q") ? ` for “${params.get("q")}”` : ""}
            </span>
            <button
              className="button secondary mobile-filter"
              onClick={() => setOpen(true)}
            >
              <SlidersHorizontal size={15} /> Filters
            </button>
          </div>
          {error ? (
            <Empty title="Search couldn’t finish" text={error} />
          ) : loading ? (
            <Loading />
          ) : !data?.books.length ? (
            <Empty
              title="A little too specific?"
              text="No verified matches fit these filters. Try a different mood, a longer page limit, or include unavailable books."
            >
              <button
                className="button primary"
                onClick={() => router.replace("/search")}
              >
                Explore every book
              </button>
            </Empty>
          ) : (
            <div className="book-grid search-grid">
              {data.books.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          )}
        </section>
      </div>
      <Modal open={open} onOpenChange={setOpen} title="Refine your discovery">
        <div className="filter-panel mobile-panel">
          {filter}
          <button className="button primary" onClick={() => setOpen(false)}>
            Show results
          </button>
        </div>
      </Modal>
    </div>
  );
}
