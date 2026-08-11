"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteHomework } from "@/app/portal/coach/actions";

export default function DeleteHomeworkButton({ homeworkId }: { homeworkId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDelete() {
    const confirmed = window.confirm(
      "Delete this homework and all student submissions? This cannot be undone."
    );
    if (!confirmed) return;

    setError("");
    startTransition(async () => {
      const result = await deleteHomework({ homeworkId });
      if (!result.ok) {
        setError(result.error || "Could not delete homework.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        className="btn secondary"
        type="button"
        onClick={handleDelete}
        disabled={pending}
        style={{ color: "#9b1c1c" }}
      >
        {pending ? "Deleting..." : "Delete homework"}
      </button>
      {error ? <div className="small" style={{ marginTop: 6 }}>{error}</div> : null}
    </div>
  );
}
