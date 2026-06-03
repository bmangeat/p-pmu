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
    <header className="border-b border-amber-200/60 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-zinc-900">
            ⏰ P-PMU
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-zinc-500">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-zinc-900">
                {l.label}
              </Link>
            ))}
            {user?.isAdmin && (
              <Link href="/admin" className="text-violet-600 hover:text-violet-500">
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-zinc-600">
                {user.name || user.email}
                {user.isAdmin && (
                  <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
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
                <button className="rounded-full border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100">
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-orange-500 px-4 py-1.5 font-semibold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-400"
            >
              Se connecter
            </Link>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 pb-2 text-xs text-zinc-400">
        Cible suivie : <span className="font-medium text-zinc-600">{targetName()}</span>
      </div>
    </header>
  );
}
