import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function AuthPanel() {
  const [open, setOpen] = useState(false);
  const { firebaseUser, profile, loading, syncingProfile, error, signInWithGoogle, signOut } =
    useAuth();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      <button
        className="rounded-full border border-white/10 bg-black/60 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-white/70 backdrop-blur-md transition hover:border-white/20 hover:text-white"
        onClick={() => setOpen((value) => !value)}
      >
        Account
      </button>

      {open && (
        <div className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-black/70 backdrop-blur-md px-4 py-3 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {loading ? (
                <p className="mt-1 text-sm text-white/70">Checking session...</p>
              ) : firebaseUser ? (
                <>
                  <p className="mt-1 truncate text-sm font-medium">{profile?.displayName || firebaseUser.displayName || "Signed in"}</p>
                  <p className="truncate text-xs text-white/55">{profile?.email || firebaseUser.email || "No email"}</p>
                  {syncingProfile && <p className="mt-1 text-[11px] text-amber-300/90">Syncing profile...</p>}
                </>
              ) : (
                <p className="mt-1 text-sm text-white/70">Sign in to save learning progress.</p>
              )}
            </div>

            {firebaseUser ? (
              <button
                className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/30 hover:text-white"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            ) : (
              <button
                className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90"
                onClick={() => void signInWithGoogle()}
              >
                Google sign-in
              </button>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
        </div>
      )}
    </div>
  );
}
