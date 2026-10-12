"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/api";
export default function Page() {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="wrap page content-page">
      <h1>Choose a new password.</h1>
      <p className="muted" style={{ margin: "20px 0" }}>
        Open this page from your secure email reset link.
      </p>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!supabase) {
            router.push("/forgot-password");
            return;
          }
          setBusy(true);
          const session = await supabase.auth.getSession();
          if (!session.data.session) {
            setError(
              "This reset link is missing or expired. Request a new link.",
            );
            setBusy(false);
            return;
          }
          const result = await supabase.auth.updateUser({ password });
          if (result.error) setError(result.error.message);
          else router.push("/dashboard");
          setBusy(false);
        }}
      >
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          Save new password
        </button>
      </form>
    </div>
  );
}
