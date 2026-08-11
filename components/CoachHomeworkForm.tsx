"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createHomework } from "@/app/portal/coach/actions";
import { HOMEWORK_BUCKET, sanitizeFilename, validateAssignmentFile } from "@/lib/homework-files";

type ClassOption = {
  id: string;
  label: string;
};

export default function CoachHomeworkForm({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const classId = String(formData.get("class_id") || "");
    const title = String(formData.get("title") || "").trim();
    const fileValue = formData.get("attachment_file");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    if (!classId || !title) {
      setMessage("Class and title are required.");
      return;
    }

    if (file) {
      const validationError = validateAssignmentFile(file);
      if (validationError) {
        setMessage(validationError);
        return;
      }
    }

    setBusy(true);
    setMessage(file ? "Uploading homework file…" : "Publishing homework…");

    const supabase = createClient();
    let attachmentPath: string | undefined;

    try {
      if (file) {
        attachmentPath = `assignments/${classId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from(HOMEWORK_BUCKET)
          .upload(attachmentPath, file, { contentType: file.type || undefined, upsert: false });

        if (uploadError) throw new Error(uploadError.message);
      }

      const result = await createHomework({
        classId,
        title,
        instructions: String(formData.get("instructions") || ""),
        dueDate: String(formData.get("due_date") || ""),
        attachmentUrl: String(formData.get("attachment_url") || ""),
        attachmentPath,
        attachmentName: file?.name,
        attachmentMimeType: file?.type,
      });

      if (!result.ok) {
        if (attachmentPath) await supabase.storage.from(HOMEWORK_BUCKET).remove([attachmentPath]);
        throw new Error(result.error || "Could not create homework.");
      }

      form.reset();
      setMessage("Homework published.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not publish homework.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="field">
        <span>Class</span>
        <select className="input" name="class_id" required defaultValue="">
          <option value="" disabled>Select class</option>
          {classes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Title</span>
        <input className="input" name="title" required placeholder="Homework title" />
      </label>
      <label className="field">
        <span>Instructions</span>
        <textarea className="input" name="instructions" rows={4} placeholder="What should students do?" />
      </label>
      <label className="field">
        <span>Due date</span>
        <input className="input" name="due_date" type="date" />
      </label>
      <label className="field">
        <span>Homework file</span>
        <input className="input" name="attachment_file" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
        <span className="small">Optional · PDF, DOC or DOCX · maximum 10 MB</span>
      </label>
      <label className="field">
        <span>Resource link</span>
        <input className="input" name="attachment_url" type="url" placeholder="Optional https://..." />
      </label>
      {message ? <div className="small" style={{ margin: "10px 0" }}>{message}</div> : null}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Working…" : "Publish homework"}</button>
    </form>
  );
}
