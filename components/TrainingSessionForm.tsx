"use client";

import { useState } from "react";

type ClassOption = {
  id: string;
  name: string;
  branch: string;
  level: string;
};

export default function TrainingSessionForm({
  classes,
  today,
  action,
}: {
  classes: ClassOption[];
  today: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [dates, setDates] = useState([today]);

  function addDate() {
    setDates((current) => [...current, ""]);
  }

  function updateDate(index: number, value: string) {
    setDates((current) => current.map((date, itemIndex) => itemIndex === index ? value : date));
  }

  function removeDate(index: number) {
    setDates((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <form action={action}>
      <label className="field">
        <span>Class</span>
        <select className="input" name="class_id" required defaultValue="">
          <option value="" disabled>Select class</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>{item.branch} · {item.level} · {item.name}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Training type</span>
        <select className="input" name="delivery_mode" required defaultValue="live">
          <option value="live">Inside Academy</option>
          <option value="online">Online</option>
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label className="field">
          <span>Start time</span>
          <input className="input" type="time" name="start_time" required />
        </label>
        <label className="field">
          <span>End time</span>
          <input className="input" type="time" name="end_time" required />
        </label>
      </div>

      <div className="field">
        <span>Training dates</span>
        <div style={{ display: "grid", gap: 9 }}>
          {dates.map((date, index) => (
            <div key={index} style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                type="date"
                name="dates"
                value={date}
                onChange={(event) => updateDate(index, event.target.value)}
                required
              />
              {dates.length > 1 ? (
                <button className="btn secondary" type="button" onClick={() => removeDate(index)} aria-label="Remove date">×</button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <button className="btn secondary" type="button" onClick={addDate}>+ Add another date</button>
        <button className="btn" type="submit">Publish training dates</button>
      </div>
    </form>
  );
}
