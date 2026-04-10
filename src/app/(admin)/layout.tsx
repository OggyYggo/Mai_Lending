import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("full_name, email")
    .eq("user_id", user.id)
    .single();

  const userInfo = {
    name: admin?.full_name ?? user.email ?? "Admin",
    email: admin?.email ?? user.email ?? "",
    avatar: "",
  };

  return <AdminShell user={userInfo}>{children}</AdminShell>;
}
