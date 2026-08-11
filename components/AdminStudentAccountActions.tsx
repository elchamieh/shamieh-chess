"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { manageStudentAccount } from "@/app/portal/admin/students/actions";

export default function AdminStudentAccountActions({
  studentId,
  studentName,
  frozen,
}: {
  studentId: string;
  studentName: string;
  frozen: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: "freeze" | "unfreeze" | "delete") {
    if (action === "delete") {
      const confirmed = window.confirm(
        `Permanently delete ${studentName}'s Shamieh Chess account? Their login, class membership, tournament registrations and homework submissions will be removed. This cannot be undone.`
      );
      if (!confirmed) return;
    }

    if (action === "freeze") {
      const confirmed = window.confirm(
        `Freeze ${studentName}'s account? Their records and class placement will stay saved, but they will not be able to use the portal until you unfreeze them.`
      );
      if (!confirmed) return;
    }

    setError(null);
    startTransition(async () => {
      const result = await manageStudentAccount({ studentId, action });
      if (!result.ok) {
        setError(result.error || "Could not update student account.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="btn secondary"
          type="button"
          disabled={pending}
          onClick={() => run(frozen ? "unfreeze" : "freeze")}
        >
          {pending ? "Working…" : frozen ? "Unfreeze account" : "Freeze account"}
        </button>
        <button
          className="btn secondary"
          type="button"
          disabled={pending}
          onClick={() => run("delete")}
          style={{ color: "#9b1c1c" }}
        >
          Delete student
        </button>
      </div>
      {error ? <div className="small" style={{ marginTop: 6 }}>{error}</div> : null}
    </div>
  );
}
