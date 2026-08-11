import Link from "next/link";
import ShamiehLogo from "@/components/ShamiehLogo";
import { registerStudent } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="login">
      <div className="card login-card">
        <ShamiehLogo className="login-logo" />
        <span className="pill">Student Registration</span>
        <h1 style={{ marginTop: 14 }}>Join Shamieh Chess</h1>
        <p className="small">
          Create your login request. Your registration becomes active only after academy approval and class placement.
        </p>

        {params.submitted ? (
          <div className="card" style={{ boxShadow: "none", margin: "16px 0" }}>
            <b>Registration submitted.</b>
            <p className="small" style={{ marginBottom: 0 }}>
              Confirm your email if Supabase sends you a verification message. After that, wait for academy approval before signing in.
            </p>
          </div>
        ) : null}

        {params.error ? (
          <div className="card" style={{ boxShadow: "none", margin: "16px 0" }}>
            <b>Could not submit registration.</b>
            <div className="small">{decodeURIComponent(params.error)}</div>
          </div>
        ) : null}

        {!params.submitted ? (
          <form action={registerStudent}>
            <label className="field">
              <span>Full name</span>
              <input className="input" name="full_name" required placeholder="Student name" />
            </label>
            <label className="field">
              <span>Date of birth</span>
              <input className="input" name="date_of_birth" type="date" required />
            </label>
            <label className="field">
              <span>FIDE ID <span className="small">(optional)</span></span>
              <input className="input" name="fide_id" maxLength={32} placeholder="e.g. 1234567" />
            </label>
            <label className="field">
              <span>Email</span>
              <input className="input" name="email" type="email" required placeholder="student@example.com" />
            </label>
            <label className="field">
              <span>Password</span>
              <input className="input" name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
            </label>
            <button className="btn" type="submit" style={{ width: "100%" }}>
              Submit registration
            </button>
          </form>
        ) : null}

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/login" className="small">Already registered? Sign in</Link>
        </div>
      </div>
    </main>
  );
}
