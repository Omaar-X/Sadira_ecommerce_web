import { requireAdmin } from "@/lib/adminSession";
import { AdminShell } from "@/components/admin/AdminShell";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
