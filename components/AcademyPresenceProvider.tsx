"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PresenceEntry = {
  status: "online" | "playing";
  game_id?: string | null;
  online_at?: string;
};

type PresenceContextValue = {
  connected: boolean;
  online: Record<string, PresenceEntry>;
};

const PresenceContext = createContext<PresenceContextValue>({ connected: false, online: {} });

export function useAcademyPresence() {
  return useContext(PresenceContext);
}

export default function AcademyPresenceProvider({
  children,
  status = "online",
  gameId = null,
}: {
  children: React.ReactNode;
  status?: "online" | "playing";
  gameId?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState<Record<string, PresenceEntry>>({});

  useEffect(() => {
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || disposed) return;

      channel = supabase.channel("academy:students:presence", {
        config: {
          private: true,
          presence: { key: user.id },
        },
      });

      const syncPresence = () => {
        if (!channel || disposed) return;
        const state = channel.presenceState() as Record<string, Array<Record<string, unknown>>>;
        const next: Record<string, PresenceEntry> = {};

        for (const [presenceKey, metas] of Object.entries(state)) {
          const trustedMetas = metas.filter((meta) => String(meta.user_id || "") === presenceKey);
          if (!trustedMetas.length) continue;
          const playing = trustedMetas.find((meta) => meta.status === "playing");
          const selected = playing || trustedMetas[trustedMetas.length - 1];
          next[presenceKey] = {
            status: selected.status === "playing" ? "playing" : "online",
            game_id: selected.game_id ? String(selected.game_id) : null,
            online_at: selected.online_at ? String(selected.online_at) : undefined,
          };
        }
        setOnline(next);
      };

      channel
        .on("presence", { event: "sync" }, syncPresence)
        .on("presence", { event: "join" }, syncPresence)
        .on("presence", { event: "leave" }, syncPresence)
        .subscribe(async (subscriptionStatus) => {
          if (disposed || !channel) return;
          if (subscriptionStatus === "SUBSCRIBED") {
            setConnected(true);
            await channel.track({
              user_id: user.id,
              status,
              game_id: gameId,
              online_at: new Date().toISOString(),
            });
            syncPresence();
          } else if (["CLOSED", "CHANNEL_ERROR", "TIMED_OUT"].includes(subscriptionStatus)) {
            setConnected(false);
          }
        });
    })();

    return () => {
      disposed = true;
      setConnected(false);
      if (channel) {
        void channel.untrack();
        void supabase.removeChannel(channel);
      }
    };
  }, [gameId, status, supabase]);

  return <PresenceContext.Provider value={{ connected, online }}>{children}</PresenceContext.Provider>;
}
