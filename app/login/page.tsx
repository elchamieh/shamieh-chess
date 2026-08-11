import Link from "next/link";
import ShamiehLogo from "@/components/ShamiehLogo";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <main className="login">
      <div className="card login-card">
        <ShamiehLogo className="login-logo" />
        <span className="pill">Academy Platform</span>
        <h1 style={{ marginTop: 14 }}>Sign in</h1>
        <p className="small">Admin, coach and approved student accounts use the same login.</p>
        <form action={login}>
          <label className="field"><span>Email</span><input className="input" name="email" type="email" required /></label>
          <label className="field"><span>Password</span><input className="input" name="password" type="password" required /></label>
          <button className="btn" type="submit" style={{ width: "100%" }}>Sign in</button>
        </form>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/register" className="small">New student? Register for approval</Link>
        </div>
      </div>
    </main>
  );
}
