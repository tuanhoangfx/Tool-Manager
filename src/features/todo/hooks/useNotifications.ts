import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { addNotificationsRealtimeListener } from "../notifications-realtime-hub";

export const useNotifications = (session: Session | null, enabled = true) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!enabled || !session?.user) {
      setUnreadCount(0);
      return;
    }

    const userId = session.user.id;
    let cancelled = false;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (cancelled) return;
      if (error) console.error("Error fetching unread count:", error);
      else setUnreadCount(count || 0);
    };

    void fetchUnreadCount();

    const removeListener = addNotificationsRealtimeListener(userId, () => {
      setUnreadCount((current) => current + 1);
    });

    return () => {
      cancelled = true;
      removeListener();
    };
  }, [enabled, session?.user?.id]);

  return { unreadCount, setUnreadCount };
};
