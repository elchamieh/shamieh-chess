"use client";

import { FormEvent, useState, useTransition } from "react";
import { updateStudentProfile } from "@/app/portal/profile/actions";

export default function StudentProfileForm({
  fullName,
  dateOfBirth,
  fideId,
  phone,
}: {
  fullName: string;
  dateOfBirth?: string | null;
  fideId?: string | null;
  phone?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);

    startTransition(async () => {
      const result = await updateStudentProfile({
        dateOfBirth: String(formData.get("date_of_birth") || ""),
        fideId: String(formData.get("fide_id") || ""),
        phone: String(formData.get("phone") || ""),
      });
      setMessage(result.ok ? "Profile updated." : result.error || "Could not update profile.");
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="field">
        <span>Full name</span>
        <input className="input" value={fullName} readOnly disabled />
        <span className="small">Your name is managed by Shamieh Chess and cannot be edited here.</span>
      </label>
      <label className="field">
        <span>Date of birth</span>
        <input className="input" name="date_of_birth" type="date" required defaultValue={dateOfBirth || ""} />
      </label>
      <label className="field">
        <span>FIDE ID <span className="small">(optional)</span></span>
        <input className="input" name="fide_id" maxLength={32} defaultValue={fideId || ""} placeholder="e.g. 1234567" />
      </label>
      <label className="field">
        <span>Phone number <span className="small">(optional)</span></span>
        <input className="input" name="phone" type="tel" maxLength={32} defaultValue={phone || ""} placeholder="e.g. +961 3 123 456" />
      </label>
      {message ? <div className="small" style={{ marginBottom: 8 }}>{message}</div> : null}
      <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
