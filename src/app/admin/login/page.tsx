import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { isAdminAuthenticated } from "@/lib/session";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-16">
      <h1 className="mb-6 text-2xl font-bold text-heading">Admin Login</h1>
      <LoginForm />
    </div>
  );
}
