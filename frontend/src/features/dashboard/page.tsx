"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Compass,
  MessageSquare,
  ArrowRight,
  Check,
} from "lucide-react";
import { useApp } from "@/components/provider";
import { useData } from "@/lib/use-data";
import type { Book } from "@/lib/types";
import { Cover, BookCard } from "@/components/book-card";
import { Loading, Empty } from "@/components/ui";
export default function Dashboard() {
  const { account, shelf, ready, config } = useApp();
  const { data, loading, error } = useData<{ books: Book[] }>(
    "recommendations?limit=5",
  );
  const reading = shelf.filter((e) => e.status === "reading"),
    next = shelf.filter((e) => e.status === "want_to_read");
  if (!ready) return <Loading />;
  return (
    <div className="wrap page reader-dashboard">
      <div className="dashboard-greeting">
        <div>
          <span className="eyebrow">YOUR READING ROOM</span>
          <h1>
            {account ? (
              <>
                Welcome back, <em>{account.name.split(" ")[0]}.</em>
              </>
            ) : (
              <>
                Make a little room
                <br />
                for <em>discovery.</em>
              </>
            )}
          </h1>
          <p>
            {account
              ? "Pick up a chapter, follow a curiosity, or find something unexpected."
              : "Your guest shelf is waiting. Create an account to make it your own."}
          </p>
        </div>
        <div className="dashboard-greeting-actions">
          {!account && (
            <Link className="button secondary" href="/signup">
              Create an account
            </Link>
          )}
          <Link className="button primary" href="/librarian">
            Find my next read <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="reader-stat-row">
        {[
          [BookOpen, reading.length, "Currently reading"],
          [Bookmark, next.length, "On your reading list"],
          [
            Check,
            shelf.filter((e) => e.status === "finished").length,
            "Books finished",
          ],
        ].map(([Icon, n, label]) => {
          const I = Icon as typeof BookOpen;
          return (
            <div key={String(label)}>
              <I size={20} strokeWidth={1.4} />
              <span>
                <strong>{String(n)}</strong>
                {String(label)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="reader-workspace">
        <section>
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">BACK TO A GOOD CHAPTER</span>
              <h2>Keep reading.</h2>
            </div>
            <Link className="text-link" href="/shelf">
              Your whole shelf <ArrowRight size={14} />
            </Link>
          </div>
          {reading.length ? (
            <div className="continue-grid">
              {reading.slice(0, 2).map((e) => (
                <Link
                  key={e.book.id}
                  href={"/books/" + e.book.id}
                  className="continue-card"
                >
                  <Cover book={e.book} />
                  <div>
                    <span className="eyebrow">{e.book.genre}</span>
                    <h3>{e.book.title}</h3>
                    <p>{e.book.author}</p>
                    <div className="continue-progress">
                      <span style={{ width: e.progress + "%" }} />
                    </div>
                    <small>{e.progress}% of your journey</small>
                  </div>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="The first page is a good place to start."
              text="Mark a book as Reading on your shelf. It will be here when you return."
            >
              <Link className="button secondary" href="/shelf">
                Visit my shelf <ArrowRight size={14} />
              </Link>
            </Empty>
          )}
        </section>
        <aside className="reader-librarian-card">
          <span className="eyebrow">YOUR PERSONAL LIBRARIAN</span>
          <h2>
            A conversation.
            <br />
            <em>A new possibility.</em>
          </h2>
          <p>
            Tell us what you feel like reading. We’ll find a shortlist you can
            understand and refine.
          </p>
          <Link className="button primary" href="/librarian">
            Start a conversation <MessageSquare size={15} />
          </Link>
          <small>
            <span className="status-dot" />
            {config?.openai
              ? "OpenAI agent team configured"
              : "Catalog recommendations available"}
          </small>
        </aside>
      </div>
      <section className="book-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ROOM FOR ONE MORE</span>
            <h2>For the curious part of you.</h2>
          </div>
          <Link className="text-link" href="/discover">
            Explore the library <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <Empty title="Your suggestions couldn’t open" text={error} />
        ) : (
          <div className="book-grid five">
            {data?.books.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>
      <div className="dashboard-links">
        <Link href="/preferences">
          <Compass size={23} />
          <div>
            <strong>Shape your reading taste</strong>
            <p>
              Interests, preferences, and a little room to change your mind.
            </p>
          </div>
          <ArrowUpRight size={17} />
        </Link>
        <Link href="/paths">
          <BookOpen size={23} />
          <div>
            <strong>Read toward something</strong>
            <p>Curated paths for the things you want to learn.</p>
          </div>
          <ArrowUpRight size={17} />
        </Link>
      </div>
    </div>
  );
}
