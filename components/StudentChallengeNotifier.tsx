"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatTimeControl, LiveChallenge } from "@/lib/live-chess";

export default function StudentChallengeNotifier() {
  const supabase = useMemo(() => createClient(), []);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<LiveChallenge | null>(null);
  const [challengerName, setChallengerName] = useState("Academy student");

  const refresh = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("live_challenges")
      .select("*")
      .eq("challenged_id", id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const next = (data || null) as LiveChallenge | null;
    setChallenge(next);
    if (!next) return;

    const { data: challenger } = await supabase
      .from("academy_player_directory")
      .select("display_name")
      .eq("user_id", next.challenger_id)
      .maybeSingle();
    setChallengerName(challenger?.display_name || "Academy student");
  }, [supabase]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let timer: number | null = null;

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setStudentId(user.id);
      await refresh(user.id);

      channel = supabase
        .channel(`student-challenge-alerts:${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "live_challenges" }, () => void refresh(user.id))
        .subscribe();

      timer = window.setInterval(() => void refresh(user.id), 15000);
    })();

    return () => {
      if (timer !== null) window.clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh, supabase]);

  if (!studentId || !challenge) return null;

  return (
    <div className="page" style={{ paddingTop: 10, paddingBottom: 0 }}>
      <div className="card" style={{ border: "1px solid #c6d8cc", boxShadow: "none" }}>
        <div className="row" style={{ paddingTop: 0 }}>
          <div>
            <span className="pill">New challenge</span>
            <div style={{ marginTop: 7 }}><b>{challengerName}</b> challenged you to {formatTimeControl(challenge.initial_seconds, challenge.increment_seconds)}.</div>
          </div>
          <Link className="btn" href="/portal/play">Open challenge</Link>
        </div>
      </div>
    </div>
  );
}
