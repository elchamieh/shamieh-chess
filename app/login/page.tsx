import Link from "next/link";
import ShamiehLogo from "@/components/ShamiehLogo";
import { login } from "./actions";

const errorMessages: Record<string, string> = {
  email_not_confirmed: "Your email is not confirmed yet. If the academy has already approved you, please contact the academy so we can activate your login.",
  invalid_credentials: "Incorrect email or password. If you forgot your password, use the reset link below instead of registering again.",
  login_failed: "We could not sign you in. Please try again or reset your password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="login">
      <div className="card login-card">
        <ShamiehLogo className="login-logo" />
        <span className="pill">Academy Platform</span>
        <h1 style={{ marginTop: 14 }}>Sign in</h1>
        <p className="small">Admin, coach and approved student accounts use the same login.</p>

        {params.reset ? (
          <div className="card" style={{ boxShadow: "none", margin: "16px 0" }}>
            <b>Password updated.</b>
            <div className="small">You can now sign in with your new password.</div>
          </div>
        ) : null}

        {params.error ? (
          <div className="card" style={{ boxShadow: "none", margin: "16px 0" }}>
            <b>Sign-in problem</b>
            <div className="small">{errorMessages[params.error] || errorMessages.login_failed}</div>
          </div>
        ) : null}

        <form action={login}>
          <label className="field"><span>Email</span><input className="input" name="email" type="email" required autoComplete="email" /></label>
          <label className="field"><span>Password</span><input className="input" name="password" type="password" required autoComplete="current-password" /></label>
          <button className="btn" type="submit" style={{ width: "100%" }}>Sign in</button>
        </form>

        <div style={{ marginTop: 14, textAlign: "center" }}>
          <Link href="/forgot-password" className="small"><b>Forgot password?</b></Link>
        </div>
        <div style={{ marginTop: 10, textAlign: "center" }}>
          <Link href="/register" className="small">New student? Register for approval</Link>
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href="/" className="btn secondary" style={{ width: "100%", textAlign: "center" }}>
            ← Back to main page
          </Link>
        </div>
      </div>
    </main>
  );
}
