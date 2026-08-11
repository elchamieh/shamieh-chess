import Link from "next/link";
import ShamiehLogo from "@/components/ShamiehLogo";
import { registerStudent } from "./actions";

const errorMessages: Record<string, string> = {
  missing_fields: "Please complete all required fields and use a password of at least 8 characters.",
  invalid_birth_date: "Please enter a valid date of birth.",
  fide_too_long: "The FIDE ID is too long.",
  phone_too_long: "The phone number is too long.",
  account_exists: "This email already has an account. Please sign in or reset your password instead of registering again.",
  registration_failed: "We could not submit the registration. Please try again.",
};

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
          Create your academy account request. Your login becomes active after academy approval and class placement.
        </p>

        {params.submitted ? (
          <div className="card" style={{ boxShadow: "none", margin: "16px 0" }}>
            <b>Registration submitted.</b>
            <p className="small" style={{ marginBottom: 0 }}>
              Wait for academy approval. Once you are approved and placed in a class, your login will be activated automatically. You do not need to register again.
            </p>
          </div>
        ) : null}

        {params.error ? (
          <div className="card" style={{ boxShadow: "none", margin: "16px 0" }}>
            <b>Could not submit registration.</b>
            <div className="small">{errorMessages[params.error] || errorMessages.registration_failed}</div>
            {params.error === "account_exists" ? (
              <div style={{ marginTop: 10 }}>
                <Link href="/login" className="small"><b>Sign in</b></Link>
                <span className="small"> · </span>
                <Link href="/forgot-password" className="small"><b>Reset password</b></Link>
              </div>
            ) : null}
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
              <span>Phone number <span className="small">(optional)</span></span>
              <input className="input" name="phone" type="tel" maxLength={32} placeholder="e.g. +961 3 123 456" />
            </label>
            <label className="field">
              <span>Email</span>
              <input className="input" name="email" type="email" required placeholder="student@example.com" autoComplete="email" />
            </label>
            <label className="field">
              <span>Password</span>
              <input className="input" name="password" type="password" required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" />
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
