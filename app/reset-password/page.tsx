import Link from "next/link";
import { redirect } from "next/navigation";
import ShamiehLogo from "@/components/ShamiehLogo";
import { createClient } from "@/lib/supabase/server";
import { updateRecoveredPassword } from "./actions";

const errorMessages: Record<string, string> = {
  too_short: "Your new password must be at least 8 characters.",
  mismatch: "The two new-password fields do not match.",
  update_failed: "We could not update your password. Please request a new reset link and try again.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=invalid_link");

  return (
    <main className="login">
      <div className="card login-card">
        <ShamiehLogo className="login-logo" />
        <span className="pill">Account Recovery</span>
        <h1 style={{ marginTop: 14 }}>Choose a new password</h1>
        <p className="small">Use at least 8 characters. Enter the new password twice to confirm it.</p>

        {params.error ? (
          <div className="card" style={{ boxShadow: "none", margin: "16px 0" }}>
            <b>Password not changed.</b>
            <div className="small">{errorMessages[params.error] || errorMessages.update_failed}</div>
          </div>
        ) : null}

        <form action={updateRecoveredPassword}>
          <label className="field">
            <span>New password</span>
            <input className="input" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <input className="input" name="confirm_password" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <button className="btn" type="submit" style={{ width: "100%" }}>Update password</button>
        </form>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/login" className="small">Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}
