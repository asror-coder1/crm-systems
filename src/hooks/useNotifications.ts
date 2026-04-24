import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: "info" | "success" | "warning" | "error";
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setItems((data ?? []) as Notification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev]);
          // Toast for live notifications
          const fn = n.type === "error" ? toast.error
                    : n.type === "success" ? toast.success
                    : n.type === "warning" ? toast.warning
                    : toast.info;
          fn(n.title, { description: n.body ?? undefined });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => prev.map((it) => (it.id === n.id ? n : it)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unread = items.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  const clearAll = async () => {
    if (!user) return;
    setItems([]);
    await supabase.from("notifications").delete().eq("user_id", user.id);
  };

  return { items, unread, loading, markAsRead, markAllAsRead, remove, clearAll, reload: load };
}
