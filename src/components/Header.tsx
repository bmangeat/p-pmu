import Link from "next/link";
import { auth, signOut } from "@/auth";
import { targetName } from "@/lib/config";

export default async function Header() {
  const session = await auth();
  const user = session?.user;

  const links = [
    { href: "/", label: "Pari du jour" },
    { href: "/classement", label: "Classement" },
    { href: "/historique", label: "Historique" },
  ];

  return (
    <header className="border-b border-white/10 bg-white/5 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            ⏰ Pari Retard
          </Link>
          <nav className="flex items-center gap-4 text-sm text-white/70">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            ))}
            {user?.isAdmin && (
              <Link href="/admin" className="text-amber-300 hover:text-amber-200">
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-white/70">
                {user.name || user.email}
                {user.isAdmin && (
                  <span className="ml-1 rounded bg-amber-400/20 px-1.5 py-0.5 text-xs text-amber-300">
                    admin
                  </span>
                )}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="rounded-md border border-white/15 px-3 py-1.5 text-white/80 hover:bg-white/10">
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-indigo-500 px-3 py-1.5 font-medium text-white hover:bg-indigo-400"
            >
              Se connecter
            </Link>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 pb-2 text-xs text-white/40">
        Cible suivie : <span className="text-white/60">{targetName()}</span>
      </div>
    </header>
  );
}
