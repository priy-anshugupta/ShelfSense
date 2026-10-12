"use client";
import { useEffect, useState } from "react";
import { Check, ArrowUpRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/components/provider";
const interests = [
  "mystery",
  "friendship",
  "science",
  "fantasy",
  "philosophy",
  "psychology",
  "artificial intelligence",
  "programming",
  "history",
  "creativity",
  "habits",
  "adventure",
  "romance",
  "space",
  "design",
  "learning",
];
type Preferences = {
  interests: string[];
  exclusions: string[];
  branch: string;
  language: string;
};
export default function PreferencesPage() {
  const { notify } = useApp();
  const [p, setP] = useState<Preferences>({
      interests: [],
      exclusions: [],
      branch: "Central Library",
      language: "eng",
    }),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Preferences>("me/preferences")
      .then(setP)
      .catch((e) => notify(e.message));
  }, [notify]);
  const toggle = (t: string) =>
    setP({
      ...p,
      interests: p.interests.includes(t)
        ? p.interests.filter((x) => x !== t)
        : [...p.interests, t],
    });
  const save = async () => {
    setBusy(true);
    try {
      await api("me/preferences", { method: "PATCH", body: JSON.stringify(p) });
      notify("Your reading preferences are saved.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="wrap page preferences-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THERE’S NO ONE RIGHT WAY TO READ</span>
          <h1>
            Make it <em>personal.</em>
          </h1>
          <p>
            A few preferences help us find your kind of book. Change them
            whenever you like.
          </p>
        </div>
      </div>
      <div className="preference-layout">
        <section className="preference-form">
          <span className="eyebrow">01 / FOLLOW YOUR INTERESTS</span>
          <h2>What catches your attention?</h2>
          <p className="muted">
            Pick as many as you like. It’s fine to start with just one.
          </p>
          <div className="interest-grid">
            {interests.map((t) => (
              <button
                key={t}
                onClick={() => toggle(t)}
                className={p.interests.includes(t) ? "selected" : ""}
              >
                {t}
                {p.interests.includes(t) && <Check size={15} />}
              </button>
            ))}
          </div>
          <div className="preferences-fields">
            <label>
              Home library
              <select
                value={p.branch}
                onChange={(e) => setP({ ...p, branch: e.target.value })}
              >
                <option>Central Library</option>
                <option>Study Annex</option>
              </select>
            </label>
            <label>
              Preferred book language
              <select
                value={p.language}
                onChange={(e) => setP({ ...p, language: e.target.value })}
              >
                <option value="eng">English</option>
                <option value="hin">Hindi</option>
              </select>
            </label>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={p.exclusions.includes("romance")}
              onChange={(e) =>
                setP({ ...p, exclusions: e.target.checked ? ["romance"] : [] })
              }
            />{" "}
            Exclude catalog-tagged romance
          </label>
          <p className="fineprint">
            Language applies when explicitly selected in search. Exclusions use
            curated tags; absent tags are not verified content warnings.
          </p>
          <button className="button primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save my preferences"}
            <Check size={16} />
          </button>
          <button
            className="text-button reset-preferences"
            onClick={() =>
              api("me/preferences/reset-learned", { method: "POST" })
                .then(() => notify("Learned feedback has been reset."))
                .catch((e) => notify(e.message))
            }
          >
            <RotateCcw size={14} /> Reset learned feedback
          </button>
        </section>
        <aside className="preference-note">
          <LeafIllustration />
          <span className="eyebrow">ROOM TO CHANGE YOUR MIND</span>
          <h2>
            Your taste is a starting point.
            <br />
            <em>Not a box.</em>
          </h2>
          <p>
            You can explore beyond these interests, pin a preference for one
            conversation, or change direction completely.
          </p>
          <Link className="text-link" href="/discover">
            Follow your curiosity <ArrowUpRight size={15} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
function LeafIllustration() {
  return (
    <svg aria-hidden="true" width="130" height="150" viewBox="0 0 130 150">
      <path
        d="M63 141Q75 80 64 21M66 84Q9 76 25 30Q63 38 66 84ZM68 106Q114 85 108 51Q79 60 68 106Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}
