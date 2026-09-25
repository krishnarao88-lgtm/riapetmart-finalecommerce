import { headers } from "next/headers";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/auth";

// Sign-in and 2-step pages render bare; everything else gets the sidebar frame.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-admin-path") ?? "";
  if (path.startsWith("/admin/login") || path.startsWith("/admin/mfa")) {
    return (
      <main id="main" className="admin-theme flex-1 bg-ground">
        {children}
      </main>
    );
  }
  const { user, role } = await getAdminSession();
  if (!role) {
    return (
      <main id="main" className="admin-theme flex-1 bg-ground">
        {children}
      </main>
    );
  }
  return (
    <AdminShell email={user.email ?? ""} role={role}>
      {children}
    </AdminShell>
  );
}
