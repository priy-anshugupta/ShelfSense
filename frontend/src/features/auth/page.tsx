"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  Download,
  BookOpen,
} from "lucide-react";
import { api, supabase } from "@/lib/api";
import { useApp } from "@/components/provider";
import type { Account } from "@/lib/types";
import { Modal } from "@/components/ui";
export default function AuthPage({
  signup = false,
  recovery = false,
}: {
  signup?: boolean;
  recovery?: boolean;
}) {
  const router = useRouter();
  const { refresh, notify } = useApp();
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [nextCode, setNextCode] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const finish = async () => {
    await refresh();
    router.push(signup ? "/onboarding" : "/dashboard");
  };
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (supabase) {
        if (recovery) {
          const result = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + "/reset-password",
          });
          if (result.error) throw result.error;
          setConfirmed(true);
          return;
        }
        const result = signup
          ? await supabase.auth.signUp({
              email,
              password,
              options: { data: { name } },
            })
          : await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        if (signup && !result.data.session) {
          setConfirmed(true);
          return;
        }
      } else {
        const result = await api<{ account: Account; recovery_code?: string }>(
          "auth/" + (recovery ? "recover" : signup ? "signup" : "login"),
          {
            method: "POST",
            body: JSON.stringify(
              recovery
                ? { email, password, recovery_code: code }
                : signup
                  ? { email, password, name }
                  : { email, password },
            ),
          },
        );
        if (result.recovery_code) setNextCode(result.recovery_code);
      }
      await api("me/claim", { method: "POST" });
      await refresh();
      if (!signup && !recovery) router.push("/dashboard");
      if (supabase && (signup || recovery)) await finish();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          `ShelfSense recovery code\nAccount: ${email}\nRecovery code: ${nextCode}\nKeep this private. A password reset rotates the code.\n`,
        ],
        { type: "text/plain" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "shelfsense-recovery-code.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="auth-page wrap">
      <div className="auth-layout upgraded-auth">
        <section className="auth-form">
          <Link href="/" className="auth-mini-brand">
            <BookOpen size={21} /> Your reading life, thoughtfully kept.
          </Link>
          <span className="eyebrow">
            {recovery
              ? "FIND YOUR WAY BACK"
              : signup
                ? "YOUR NEXT CHAPTER"
                : "WELCOME TO YOUR LIBRARY"}
          </span>
          <h1>
            {recovery ? (
              "A fresh start."
            ) : signup ? (
              <>
                A shelf of <em>your own.</em>
              </>
            ) : (
              <>
                Good to see
                <br />
                <em>you again.</em>
              </>
            )}
          </h1>
          <p>
            {recovery
              ? supabase
                ? "We’ll send a secure reset link to your email."
                : "Use the private recovery code you saved when creating your account."
              : signup
                ? "Save your discoveries, keep your reading notes, and find books that feel like you."
                : "Sign in to pick up where you left off."}
          </p>
          {confirmed && !nextCode ? (
            <div className="auth-confirmation">
              <span>
                <Check size={22} />
              </span>
              <h2>Check your inbox.</h2>
              <p>
                {recovery
                  ? "If the address has an account, a reset link will arrive shortly."
                  : "Confirm your email address, then sign in to your new library."}
              </p>
              <Link className="button primary" href="/login">
                Back to sign in <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              {signup && (
                <label>
                  Your name
                  <input
                    autoComplete="name"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="How should we greet you?"
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              {recovery && !supabase && (
                <label>
                  Recovery code
                  <input
                    required
                    autoComplete="off"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Your saved private recovery code"
                  />
                </label>
              )}
              {(!recovery || !supabase) && (
                <label>
                  <span className="label-row">
                    {recovery ? "New password" : "Password"}
                    {!signup && !recovery && (
                      <Link href="/forgot-password">Forgot password?</Link>
                    )}
                  </span>
                  <div className="password-field">
                    <input
                      type={visible ? "text" : "password"}
                      autoComplete={
                        signup || recovery ? "new-password" : "current-password"
                      }
                      required
                      minLength={signup || recovery ? 10 : 1}
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        signup
                          ? "At least 10 characters"
                          : "Enter your password"
                      }
                    />
                    <button
                      type="button"
                      aria-label={visible ? "Hide password" : "Show password"}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {signup && (
                    <small className="fineprint">
                      Use a unique password with at least 10 characters.
                    </small>
                  )}
                </label>
              )}
              {error && (
                <p className="inline-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button primary" disabled={busy}>
                {busy
                  ? "Opening your library…"
                  : recovery
                    ? "Recover access"
                    : signup
                      ? "Create my account"
                      : "Sign in"}
                <ArrowRight size={16} />
              </button>
              <p className="auth-privacy">
                <ShieldCheck size={14} />
                Your reading notes stay private.
              </p>
            </form>
          )}
          <div className="auth-footer">
            {recovery ? (
              <Link href="/login">Return to sign in</Link>
            ) : (
              <>
                {signup
                  ? "Already have a shelf here? "
                  : "Your first chapter? "}
                <Link href={signup ? "/login" : "/signup"}>
                  {signup ? "Sign in" : "Create an account"}
                </Link>
              </>
            )}
          </div>
          <Link href="/discover" className="auth-guest-link">
            Keep exploring as a guest <ArrowRight size={13} />
          </Link>
        </section>
        <div className="auth-art">
          <img
            src="/images/reading-room.webp"
            alt="An illustrated sunlit reading room"
          />
          <div className="auth-art-caption">
            <span className="eyebrow">A WORLD WORTH GETTING LOST IN</span>
            <h2>
              Somewhere between
              <br />a good book
              <br />
              and <em>a new beginning.</em>
            </h2>
            <p>A little guidance. A world of possibility.</p>
          </div>
        </div>
      </div>
      <Modal
        dismissible={false}
        open={!!nextCode}
        onOpenChange={() => {}}
        title="Keep your recovery code safe"
      >
        <div className="recovery-code-panel">
          <ShieldCheck size={30} />
          <p>
            Your account is ready. This private code lets you reset your
            password. It is shown once; we store only its hash.
          </p>
          <code>{nextCode}</code>
          <button className="button secondary" onClick={download}>
            <Download size={15} /> Download recovery code
          </button>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            I’ve saved my recovery code.
          </label>
          <button
            className="button primary"
            disabled={!confirmed}
            onClick={() => {
              setNextCode("");
              finish().catch((e) => notify(e.message));
            }}
          >
            Enter my library <ArrowRight size={16} />
          </button>
        </div>
      </Modal>
    </div>
  );
}
