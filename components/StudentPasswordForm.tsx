"use client";

import { FormEvent, useState, useTransition } from "react";
import { changeStudentPassword } from "@/app/portal/profile/actions";

export default function StudentPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setMessage(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await changeStudentPassword({
        currentPassword: String(formData.get("current_password") || ""),
        newPassword: String(formData.get("new_password") || ""),
        confirmPassword: String(formData.get("confirm_password") || ""),
      });

      setSuccess(result.ok);
      setMessage(result.ok ? "Password changed successfully." : result.error || "Could not change password.");
      if (result.ok) form.reset();
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="field">
        <span>Current password</span>
        <input
          className="input"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>

      <label className="field">
        <span>New password</span>
        <input
          className="input"
          name="new_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <span className="small">At least 8 characters.</span>
      </label>

      <label className="field">
        <span>Confirm new password</span>
        <input
          className="input"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      {message ? (
        <div className="small" style={{ marginBottom: 8 }}>
          {success ? "✓ " : ""}{message}
        </div>
      ) : null}

      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
