import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import VerifyForm from "@/components/VerifyForm";

export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.isAdmin) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { verified: true },
  });
  if (user?.verified) redirect("/");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900">Valide ton compte 🔐</h1>
        <p className="mt-1 text-zinc-500">
          Pour accéder à P-PMU, saisis le code fourni par un admin. Il est à usage unique.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <VerifyForm />
      </div>
    </div>
  );
}
