import { login } from "./actions";

export default function LoginPage() {
  return (
    <main className="login"><div className="card login-card"><span className="pill">Academy Platform</span><h1 style={{marginTop:14}}>Sign in</h1><p className="small">Admin, coach and student accounts use the same login.</p><form action={login}><label className="field"><span>Email</span><input className="input" name="email" type="email" required /></label><label className="field"><span>Password</span><input className="input" name="password" type="password" required /></label><button className="btn" type="submit" style={{width:"100%"}}>Sign in</button></form></div></main>
  );
}
