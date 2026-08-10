import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";
import { createClass, setClassActive } from "./actions";

export default async function AdminClassesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/portal");

  const [{ data: branches }, { data: levels }, { data: classes }] = await Promise.all([
    supabase.from("branches").select("id, name").eq("active", true).order("name"),
    supabase.from("levels").select("id, name, sort_order").eq("active", true).order("sort_order"),
    supabase
      .from("classes")
      .select("id, name, active, branch:branches(name), level:levels(name, sort_order)")
      .order("created_at", { ascending: true }),
  ]);

  return (
    <PortalShell title="Classes" role="Admin">
      <div className="nav" style={{ marginBottom: 18 }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
      </div>

      <div className="grid">
        <div className="card span4">
          <h2>Create class</h2>
          <p className="small">A class is a teaching group inside one branch and level, for example Beginners A.</p>
          <form action={createClass}>
            <label className="field">
              <span>Branch</span>
              <select className="input" name="branch_id" required defaultValue="">
                <option value="" disabled>Select branch</option>
                {(branches || []).map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Level</span>
              <select className="input" name="level_id" required defaultValue="">
                <option value="" disabled>Select level</option>
                {(levels || []).map((level) => (
                  <option key={level.id} value={level.id}>{level.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Class name</span>
              <input className="input" name="name" required placeholder="e.g. Beginners A" />
            </label>

            <button className="btn" type="submit">Create class</button>
          </form>
        </div>

        <div className="card span8">
          <h2>Academy classes</h2>
          {!classes?.length ? (
            <p className="small">No classes yet. Create the first class using the form.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Level</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {classes.map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.branch?.name || "—"}</td>
                    <td>{item.level?.name || "—"}</td>
                    <td><b>{item.name}</b></td>
                    <td><span className="pill">{item.active ? "Active" : "Inactive"}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <form action={setClassActive}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="active" value={item.active ? "false" : "true"} />
                        <button className="btn secondary" type="submit">
                          {item.active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
