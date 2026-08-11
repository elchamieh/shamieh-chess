import Link from "next/link";
import ShamiehLogo from "@/components/ShamiehLogo";
import { requestPasswordReset } from "./actions";

const errorMessages: Record<string, string> = {
  invalid_email: "Enter the email address you used for your Shamieh Chess account.",
  rate_limit: "Too many reset emails were requested. Please wait a little before trying again.",
  send_failed: "We could not send the reset email. Please try again.",
  invalid_link: "That password reset link is invalid or has expired. Request a new one below.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="login">
      <div className="card login-card">
        <ShamiehLogo className="login-logo" />
        <span className="pill">Account Recovery</span>
        <h1 style={{ marginTop: 14 }}>Reset your password</h1>
        <p className="small">Enter the email address you used when you registered.</p>

        {params.sent ? (
          <div className="card" style={{ boxShadow: "none", margin: "16px 0" }}>
            <b>Check your email.</b>
            <div className="small">If an account exists for that email, we sent a password reset link.</div>
          </div>
        ) : null}

        {params.error ? (
          <div className="card" style={{ boxShadow: "none", margin: "16px 0" }}>
            <b>Could not reset password.</b>
            <div className="small">{errorMessages[params.error] || errorMessages.send_failed}</div>
          </div>
        ) : null}

        {!params.sent ? (
          <form action={requestPasswordReset}>
            <label className="field">
              <span>Email</span>
              <input className="input" name="email" type="email" required autoComplete="email" placeholder="student@example.com" />
            </label>
            <button className="btn" type="submit" style={{ width: "100%" }}>Send reset link</button>
          </form>
        ) : null}

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/login" className="small">Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}
