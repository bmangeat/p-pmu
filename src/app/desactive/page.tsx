import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export const dynamic = "force-dynamic";

export default async function DesactivePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900">Accès désactivé 🚫</h1>
        <p className="mt-1 text-zinc-500">
          Ton compte a été désactivé par un administrateur. Tu n&apos;as plus accès à
          P-PMU. Contacte un admin si tu penses qu&apos;il s&apos;agit d&apos;une erreur.
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 hover:bg-zinc-100">
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
