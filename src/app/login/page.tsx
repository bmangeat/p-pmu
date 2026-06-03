import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  const devEnabled = process.env.DEV_LOGIN === "1";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Connexion</h1>
        <p className="mt-1 text-white/60">Connecte-toi pour placer tes paris.</p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button className="w-full rounded-md bg-white px-4 py-2.5 font-medium text-slate-900 hover:bg-white/90">
          Continuer avec Google
        </button>
      </form>

      {devEnabled && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="mb-3 text-sm text-amber-200">
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
              className="w-full rounded-md border border-white/15 bg-white/10 px-3 py-2"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="ton.email@exemple.com"
              className="w-full rounded-md border border-white/15 bg-white/10 px-3 py-2"
            />
            <button className="w-full rounded-md bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400">
              Entrer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
