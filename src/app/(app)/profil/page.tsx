import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await auth();
  const user = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, notifyEmail: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900">👤 Mon profil</h1>
        <p className="mt-1 text-zinc-500">
          {user?.name || user?.email}
        </p>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <ProfileForm enabled={user?.notifyEmail ?? false} />
      </div>
    </div>
  );
}
