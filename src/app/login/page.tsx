import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  const devEnabled = process.env.DEV_LOGIN === "1";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900">Connexion</h1>
        <p className="mt-1 text-zinc-500">Connecte-toi pour placer tes paris. 🎰</p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button className="flex w-full items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50">
          Continuer avec Google
        </button>
      </form>

      {devEnabled && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-sm font-medium text-amber-700">
            Connexion de développement (locale uniquement)
          </p>
          <form
            action={async (formData) => {
              "use server";
              await signIn("dev", {
                email: String(formData.get("email") || ""),
                name: String(formData.get("name") || ""),
                redirectTo: "/",
              });
            }}
            className="space-y-3"
          >
            <input
              name="name"
              placeholder="Ton nom"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="ton.email@exemple.com"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
            <button className="w-full rounded-full bg-orange-500 px-4 py-2.5 font-semibold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-400">
              Entrer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
