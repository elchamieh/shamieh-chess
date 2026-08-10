export default function PortalShell({title,role,children}:{title:string;role:string;children:React.ReactNode}) {
  return <main className="shell"><header className="topbar"><div><div className="brand">SHAMIEH CHESS</div><div className="small">Academy Platform</div></div><div><span className="pill">{role}</span></div></header><section className="page"><h1>{title}</h1>{children}</section></main>;
}
