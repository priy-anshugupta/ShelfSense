"use client";
import { useState } from "react";
import Link from "next/link";
import { Download, LogOut, ArrowUpRight } from "lucide-react";
import { useApp } from "@/components/provider";
import { api, supabase } from "@/lib/api";
import { Modal } from "@/components/ui";
export default function SettingsPage() {
  const { config, email, refresh, notify, logout } = useApp();
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  const download = async () => {
    try {
      const data = await api("me/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "shelfsense-reading-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const clear = async () => {
    setBusy(true);
    try {
      await api("me/data", { method: "DELETE" });
      localStorage.removeItem("shelfsense-session");
      await refresh();
      setConfirm(false);
      notify("Your reading data has been removed.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="wrap page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR LIBRARY, YOUR CHOICES</span>
          <h1>
            A little <em>housekeeping.</em>
          </h1>
          <p>Manage your account, reading data, and preferences.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="settings-card">
          <h2>Your account</h2>
          <p>
            {email ||
              "You’re exploring as a guest. Create an account to keep your reading life together and sign in from another browser."}
          </p>
          {email ? (
            <button
              className="button secondary"
              onClick={() => logout().catch((e) => notify(e.message))}
            >
              <LogOut size={15} /> Sign out
            </button>
          ) : (
            <Link className="button secondary" href="/login">
              Account sign-in <ArrowUpRight size={15} />
            </Link>
          )}
        </section>
        <section className="settings-card">
          <h2>Your reading taste</h2>
          <p>
            Update interests, choose your home branch, or reset learned
            feedback.
          </p>
          <Link href="/preferences" className="button secondary">
            Edit preferences <ArrowUpRight size={15} />
          </Link>
        </section>
        <section className="settings-card">
          <h2>Your data belongs to you</h2>
          <p>
            Export your shelf, notes, preferences, and conversations as JSON.
            Reading notes stay private and are not sent to the model.
          </p>
          <button className="button secondary" onClick={download}>
            <Download size={15} /> Export reading data
          </button>
        </section>
        <section className="settings-card">
          <h2>A fresh start</h2>
          <p>
            Remove this profile’s shelf, preferences, feedback, and
            conversations. Your account remains available for signing in.
          </p>
          <button
            className="text-button danger"
            onClick={() => setConfirm(true)}
          >
            Delete my reading data
          </button>
        </section>
        <section className="settings-card">
          <h2>Connected services</h2>
          <p>
            Library:{" "}
            {config?.demo ? "Demonstration inventory" : "Configured inventory"}
            <br />
            Librarian:{" "}
            {config?.openai
              ? "OpenAI specialist agents"
              : "Local catalog recommendations"}
            <br />
            Search:{" "}
            {config?.semantic
              ? "Sentence Transformer enabled"
              : "TF-IDF content retrieval"}
            <br />
            Storage: {config?.storage || "Connecting…"}
          </p>
          <p className="fineprint">
            No API keys are exposed here. Provider calls require backend
            configuration.
          </p>
        </section>
      </div>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete your reading data?"
      >
        <p>
          This permanently removes your shelf, notes, preferences, feedback, and
          conversations for this profile. It cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            className="button secondary"
            onClick={() => setConfirm(false)}
          >
            Keep my data
          </button>
          <button className="button primary" disabled={busy} onClick={clear}>
            {busy ? "Removing…" : "Delete reading data"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
