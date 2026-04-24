import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, X, Info, AlertTriangle, CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const typeIcon: Record<Notification["type"], React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CircleCheck,
  warning: AlertTriangle,
  error: CircleX,
};

const typeColor: Record<Notification["type"], string> = {
  info: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daq`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat`;
  const d = Math.floor(h / 24);
  return `${d} kun`;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { items, unread, markAsRead, markAllAsRead, remove, clearAll } = useNotifications();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Bildirishnomalar">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center shadow-glow"
              >
                {unread > 99 ? "99+" : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 glass border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <p className="font-display font-semibold">Bildirishnomalar</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} ta yangi` : "Hammasi o'qildi"}
            </p>
          </div>
          <div className="flex gap-1">
            {unread > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} title="Hammasini o'qildi">
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            {items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} title="Hammasini tozalash" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[420px]">
          {items.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              Hozircha bildirishnoma yo'q
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const Icon = typeIcon[n.type];
                const content = (
                  <div className={cn(
                    "flex gap-3 p-4 transition-smooth hover:bg-muted/40",
                    !n.is_read && "bg-primary/5"
                  )}>
                    <div className={cn("mt-0.5", typeColor[n.type])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">{n.title}</p>
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                      {!n.is_read && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); markAsRead(n.id); }}
                          className="p-1 rounded hover:bg-muted"
                          title="O'qildi"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(n.id); }}
                        className="p-1 rounded hover:bg-destructive/20 text-destructive"
                        title="O'chirish"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} className="group">
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => { markAsRead(n.id); setOpen(false); }}
                        className="block"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div onClick={() => markAsRead(n.id)} className="cursor-pointer">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
