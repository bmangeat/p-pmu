import Link from "next/link";
import { auth } from "@/auth";
import { getUsersWithVisibility } from "@/lib/data";
import { isAdminEmail } from "@/lib/config";
import { setBetVisibilityAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-extrabold text-zinc-900">Admin</h1>
        <p className="text-zinc-600">
          Accès réservé aux administrateurs.{" "}
          <Link href="/" className="font-semibold text-orange-600 hover:text-orange-500">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    );
  }

  const { users, bets, hiddenByUser } = await getUsersWithVisibility();

  async function setVisibility(formData: FormData) {
    "use server";
    await setBetVisibilityAction({}, formData);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900">👥 Utilisateurs</h1>
        <p className="mt-1 text-zinc-500">
          {users.length} compte(s). Masque un pari à un utilisateur : il ne le verra plus
          ni n&apos;y aura accès.{" "}
          <Link href="/admin" className="text-orange-600 hover:text-orange-500">
            ← Espace admin
          </Link>
        </p>
      </div>

      <div className="space-y-4">
        {users.map((u) => {
          const admin = isAdminEmail(u.email);
          const hidden = hiddenByUser.get(u.id) ?? new Set<string>();
          return (
            <div
              key={u.id}
              className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-zinc-900">{u.name || "—"}</span>
                <span className="text-sm text-zinc-500">{u.email}</span>
                {admin && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                    admin
                  </span>
                )}
                {!u.verified && !admin && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    non validé
                  </span>
                )}
                {u.notifyEmail && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    rappels mail
                  </span>
                )}
              </div>

              {admin ? (
                <p className="mt-3 text-sm text-zinc-400">
                  Les admins voient tous les paris.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-zinc-600">Accès aux paris :</p>
                  <ul className="flex flex-wrap gap-2">
                    {bets.map((b) => {
                      const isHidden = hidden.has(b.key);
                      return (
                        <li key={b.key}>
                          <form action={setVisibility}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="betKey" value={b.key} />
                            <input type="hidden" name="hide" value={isHidden ? "0" : "1"} />
                            <button
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                                isHidden
                                  ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                              title={
                                isHidden ? "Cliquer pour afficher" : "Cliquer pour masquer"
                              }
                            >
                              {isHidden ? "🙈" : "👁️"} {b.label}
                            </button>
                          </form>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
