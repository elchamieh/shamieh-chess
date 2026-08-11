"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { recordHomeworkSubmission } from "@/app/portal/homework/actions";
import { HOMEWORK_BUCKET, sanitizeFilename, validateSubmissionFile } from "@/lib/homework-files";

export default function StudentHomeworkSubmissionForm({
  homeworkId,
  classId,
  studentId,
  existingPath,
}: {
  homeworkId: string;
  classId: string;
  studentId: string;
  existingPath?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fileValue = formData.get("submission_file");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    if (!file) {
      setMessage("Choose your completed homework file first.");
      return;
    }

    const validationError = validateSubmissionFile(file);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setBusy(true);
    setMessage("Uploading your homework…");

    const supabase = createClient();
    const filePath = `submissions/${classId}/${homeworkId}/${studentId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(HOMEWORK_BUCKET)
        .upload(filePath, file, { contentType: file.type || undefined, upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      const result = await recordHomeworkSubmission({
        homeworkId,
        classId,
        filePath,
        fileName: file.name,
        mimeType: file.type,
      });

      if (!result.ok) {
        await supabase.storage.from(HOMEWORK_BUCKET).remove([filePath]);
        throw new Error(result.error || "Could not record your submission.");
      }

      if (existingPath && existingPath !== filePath) {
        await supabase.storage.from(HOMEWORK_BUCKET).remove([existingPath]);
      }

      form.reset();
      setMessage(existingPath ? "Homework submission replaced." : "Homework submitted successfully.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit homework.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
      <label className="field" style={{ marginBottom: 8 }}>
        <span>{existingPath ? "Replace your submission" : "Upload your completed homework"}</span>
        <input
          className="input"
          name="submission_file"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />
        <span className="small">Picture, PDF, DOC or DOCX · maximum 10 MB</span>
      </label>
      {message ? <div className="small" style={{ marginBottom: 8 }}>{message}</div> : null}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Uploading…" : existingPath ? "Replace submission" : "Submit homework"}</button>
    </form>
  );
}
