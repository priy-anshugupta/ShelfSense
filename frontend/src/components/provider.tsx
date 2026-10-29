"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { api, supabase } from "@/lib/api";
import type { Config, Entry, Book, Account } from "@/lib/types";
type Context = {
  config: Config | null;
  shelf: Entry[];
  refresh: () => Promise<void>;
  save: (book: Book, status?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  notify: (text: string) => void;
  compare: Book[];
  toggleCompare: (b: Book) => void;
  email: string | null;
  ready: boolean;
  serviceError: string;
  account: Account | null;
  logout: () => Promise<void>;
};
const AppContext = createContext<Context | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null),
    [shelf, setShelf] = useState<Entry[]>([]),
    [toast, setToast] = useState(""),
    [compare, setCompare] = useState<Book[]>([]),
    [email, setEmail] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [serviceError, setServiceError] = useState(""),
    [account, setAccount] = useState<Account | null>(null);
  const refresh = useCallback(async () => {
    const [c, s, a] = await Promise.all([
      api<Config>("config"),
      api<{ entries: Entry[] }>("me/shelf"),
      api<{ account: Account | null }>("auth/me"),
    ]);
    setConfig(c);
    setShelf(s.entries);
    setReady(true);
    setServiceError("");
    let currentAccount = a.account;
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      if (data.user)
        currentAccount = {
          id: data.user.id,
          email: data.user.email || "",
          name:
            data.user.user_metadata?.name ||
            data.user.email?.split("@")[0] ||
            "Reader",
          provider: "supabase",
        };
    }
    setAccount(currentAccount);
    setEmail(currentAccount?.email || null);
  }, []);
  useEffect(() => {
    refresh().catch((e) => {
      setServiceError(e.message);
      setReady(true);
    });
    if (!supabase) return;
    supabase.auth
      .getUser()
      .then(({ data }) => setEmail(data.user?.email || null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email || null);
      setTimeout(() => {
        refresh().catch(() => {});
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const save = async (b: Book, status = "want_to_read") => {
    const old = shelf.find((e) => e.book.id === b.id);
    await api(`me/shelf/${b.id}`, {
      method: "PUT",
      body: JSON.stringify({
        status,
        progress: old?.progress || 0,
        rating: old?.rating || null,
        note: old?.note || "",
      }),
    });
    await refresh();
    setToast(
      status === "want_to_read"
        ? "Added to your reading shelf."
        : "Reading status updated.",
    );
  };
  const remove = async (id: string) => {
    const entry = shelf.find((item) => item.book.id === id);
    if (
      entry &&
      !window.confirm(
        `Remove “${entry.book.title}” from your shelf? This also deletes its private notes, rating, and reading progress. This cannot be undone.`,
      )
    )
      return;
    await api(`me/shelf/${id}`, { method: "DELETE" });
    await refresh();
    setToast("Removed from your shelf.");
  };
  const logout = async () => {
    await api("auth/logout", { method: "POST" });
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem("shelfsense-session");
    setCompare([]);
    await refresh();
    setToast("Signed out of your account.");
  };
  const toggleCompare = (b: Book) =>
    setCompare((prev) =>
      prev.some((x) => x.id === b.id)
        ? prev.filter((x) => x.id !== b.id)
        : prev.length < 3
          ? [...prev, b]
          : (setToast("Compare up to three books at a time."), prev),
    );
  return (
    <AppContext.Provider
      value={{
        config,
        shelf,
        refresh,
        save,
        remove,
        notify: setToast,
        compare,
        toggleCompare,
        email,
        ready,
        serviceError,
        account,
        logout,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </AppContext.Provider>
  );
}
export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error("Missing provider");
  return c;
}
