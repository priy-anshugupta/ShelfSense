import Link from "next/link";
export default function About() {
  return (
    <div className="wrap page content-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A LITTLE GUIDANCE. A WORLD OF BOOKS.</span>
          <h1>
            Built around <em>readers.</em>
          </h1>
          <p>
            A library assistant you can question, understand, and make your own.
          </p>
        </div>
      </div>
      <div className="prose">
        <h2>Good recommendations should make sense.</h2>
        <p>
          ShelfSense starts with your interests, a favorite book, a learning
          goal, or simply a mood. It searches an actual catalog, applies your
          restrictions, and explains the shortlist with information you can
          inspect.
        </p>
        <h2>Keep what you like. Change what you don’t.</h2>
        <p>
          The librarian’s preference tray lets you pin an attribute, ask for
          something shorter, or exclude a book you’ve already read. Refinements
          stay inside the current conversation unless you save a lasting
          preference. Undo returns to the previous request.
        </p>
        <h2>A title is not a physical copy.</h2>
        <p>
          Books can have different editions, languages, and lengths. ShelfSense
          checks available copies against eligible editions. Unknown or stale
          inventory stays unverified.
        </p>
        <div className="callout">
          <strong>A demonstration, honestly labeled</strong>
          <p>
            This release includes 40 real titles with project-curated
            descriptions and attributes, and fictional library copies for
            demonstrating the flow. The reading-room image is an original
            AI-generated editorial illustration, not a photo of a real college.
            This is not a complete ebook service.
          </p>
        </div>
        <h2>The technology behind the shelf</h2>
        <p>
          Next.js and TypeScript power the interface. FastAPI provides the
          catalog, inventory, conversation, and reading-data services. Content
          retrieval works without keys; optional Sentence Transformers adds
          embedding search, and OpenAI powers the specialist workflow. Local
          accounts work immediately; Supabase Auth and PostgreSQL are optional.
        </p>
        <p>
          The language model does not invent the recommended titles or
          availability. Final IDs and reasons come from catalog retrieval and
          stored evidence.
        </p>
        <h2 id="agents">Four specialists, one conversation.</h2>
        <p>
          The librarian coordinator understands your request. The discovery
          specialist searches the catalog and inspects real books. For learning
          goals, a learning-path specialist orders books using reviewed
          prerequisite notes. A critic reviews the shortlist. The server checks
          IDs, editions, and copy eligibility.
        </p>
        <p>
          Activity shows actual workflow steps and tool results. If OpenAI is
          unavailable, the clearly labeled local workflow keeps discovery
          available.
        </p>
        <h2>Sources and inspirations</h2>
        <p>
          Cover artwork is cached from{" "}
          <a
            href="https://openlibrary.org/dev/docs/api/covers"
            target="_blank"
            rel="noreferrer"
          >
            Open Library
          </a>
          . Library photography comes from{" "}
          <a
            href="https://unsplash.com/photos/brown-wooden-table-and-chairs-IgocsyMqK1c"
            target="_blank"
            rel="noreferrer"
          >
            Unsplash
          </a>
          . The original editorial direction takes inspiration from{" "}
          <a
            href="https://dribbble.com/shots/27731885-BookNest-Premium-Digital-Library-App-Landing-Page-Concept"
            target="_blank"
            rel="noreferrer"
          >
            BookNest’s warm reading aesthetic
          </a>
          , with layouts designed specifically for this application.
        </p>
        <p>
          <Link href="/evaluation">Explore the project evaluation</Link> or{" "}
          <Link href="/librarian">start a conversation</Link>.
        </p>
      </div>
    </div>
  );
}
