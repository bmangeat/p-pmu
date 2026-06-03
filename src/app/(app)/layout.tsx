import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Garde d'accès : connexion obligatoire, puis compte validé (sauf admins).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.isAdmin) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { verified: true },
    });
    if (!user?.verified) redirect("/verify");
  }

  return <>{children}</>;
}
