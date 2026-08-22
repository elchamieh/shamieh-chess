import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/access";
import { assignCoach, createCoach, removeCoachAssignment } from "./actions";

export default async function AdminCoachesPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, approved, frozen, is_admin")
    .eq("id", user.id)
    .single();
  if (!hasAdminAccess(profile)) redirect("/portal");

  const [{ data: coaches }, { data: classes }, { data: assignments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "coach").order("full_name"),
    supabase
      .from("classes")
      .select("id, name, branch:branches(name), level:levels(name, sort_order)")
      .eq("active", true)
      .order("name"),
    supabase
      .from("coach_class_assignments")
      .select("id, coach_id, class_id, class:classes(name, branch:branches(name), level:levels(name))")
      .order("created_at"),
  ]);

  const byCoach = new Map<string, any[]>();
  for (const assignment of assignments || []) {
    const list = byCoach.get(assignment.coach_id) || [];
    list.push(assignment);
    byCoach.set(assignment.coach_id, list);
  }

  return (
    <PortalShell title="Coaches" role="Admin">
      <div className="nav" style={{ marginBottom: 18 }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
      </div>

      {params.created ? <div className="card" style={{ marginBottom: 18 }}><b>Coach created successfully.</b></div> : null}
      {params.error ? <div className="card" style={{ marginBottom: 18 }}><b>Could not create coach:</b> {decodeURIComponent(params.error)}</div> : null}

      <div className="grid">
        <div className="card span4">
          <h2>Create coach</h2>
          <p className="small">Create the login and choose the classes this coach can access. The email is auto-confirmed for academy-created accounts.</p>
          <form action={createCoach}>
            <label className="field">
              <span>Full name</span>
              <input className="input" name="full_name" required placeholder="Coach name" />
            </label>
            <label className="field">
              <span>Email</span>
              <input className="input" name="email" type="email" required placeholder="coach@example.com" />
            </label>
            <label className="field">
              <span>Temporary password</span>
              <input className="input" name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
            </label>

            <div className="field">
              <span>Initial class access</span>
              <div className="list" style={{ gap: 6 }}>
                {(classes || []).map((item: any) => (
                  <label key={item.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" name="class_ids" value={item.id} />
                    <span>{item.branch?.name} · {item.level?.name} · <b>{item.name}</b></span>
                  </label>
                ))}
              </div>
            </div>

            <button className="btn" type="submit">Create coach account</button>
          </form>
        </div>

        <div className="card span8">
          <h2>Coach access</h2>
          {!coaches?.length ? (
            <p className="small">No coach accounts yet.</p>
          ) : (
            <div className="list">
              {coaches.map((coach) => {
                const coachAssignments = byCoach.get(coach.id) || [];
                const assignedIds = new Set(coachAssignments.map((a) => a.class_id));
                const available = (classes || []).filter((c: any) => !assignedIds.has(c.id));
                return (
                  <div className="card" key={coach.id} style={{ boxShadow: "none" }}>
                    <h3>{coach.full_name}</h3>
                    <div className="small" style={{ marginBottom: 10 }}>Assigned classes</div>
                    {!coachAssignments.length ? <p className="small">No classes assigned.</p> : (
                      <div className="list" style={{ gap: 6 }}>
                        {coachAssignments.map((assignment: any) => (
                          <div className="row" key={assignment.id}>
                            <div>
                              <b>{assignment.class?.name}</b>
                              <div className="small">{assignment.class?.branch?.name} · {assignment.class?.level?.name}</div>
                            </div>
                            <form action={removeCoachAssignment}>
                              <input type="hidden" name="assignment_id" value={assignment.id} />
                              <button className="btn secondary" type="submit">Remove</button>
                            </form>
                          </div>
                        ))}
                      </div>
                    )}

                    {available.length ? (
                      <form action={assignCoach} style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "end" }}>
                        <input type="hidden" name="coach_id" value={coach.id} />
                        <label className="field" style={{ margin: 0, flex: 1 }}>
                          <span>Add class</span>
                          <select className="input" name="class_id" required defaultValue="">
                            <option value="" disabled>Select class</option>
                            {available.map((item: any) => (
                              <option key={item.id} value={item.id}>{item.branch?.name} · {item.level?.name} · {item.name}</option>
                            ))}
                          </select>
                        </label>
                        <button className="btn" type="submit">Assign</button>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
