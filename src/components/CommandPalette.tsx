import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  UserCog,
  Wallet,
  Calendar as CalendarIcon,
  MessagesSquare,
  Settings,
  User as UserIcon,
  Activity,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const routes = [
  { to: "/super-admin/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Sahifalar" },
  { to: "/super-admin/organizations", label: "Tashkilotlar", icon: Building2, group: "Sahifalar" },
  { to: "/super-admin/users", label: "Barcha foydalanuvchilar", icon: Users, group: "Sahifalar" },
  { to: "/super-admin/admins", label: "Adminlar", icon: UserCog, group: "Sahifalar" },
  { to: "/super-admin/teachers", label: "O'qituvchilar", icon: GraduationCap, group: "Sahifalar" },
  { to: "/super-admin/students", label: "Talabalar", icon: Users, group: "Sahifalar" },
  { to: "/super-admin/audit", label: "Audit jurnali", icon: Activity, group: "Sahifalar" },
  { to: "/super-admin/finance", label: "Moliya", icon: Wallet, group: "Sahifalar" },
  { to: "/super-admin/calendar", label: "Kalendar", icon: CalendarIcon, group: "Sahifalar" },
  { to: "/super-admin/messages", label: "Xabarlar", icon: MessagesSquare, group: "Sahifalar" },
  { to: "/super-admin/profile", label: "Profil", icon: UserIcon, group: "Sahifalar" },
  { to: "/super-admin/settings", label: "Sozlamalar", icon: Settings, group: "Sahifalar" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { signOut } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buyruq yoki sahifa qidiring..." />
      <CommandList>
        <CommandEmpty>Hech narsa topilmadi</CommandEmpty>
        <CommandGroup heading="Sahifalar">
          {routes.map((r) => (
            <CommandItem key={r.to} onSelect={() => go(r.to)} value={r.label}>
              <r.icon className="mr-2 h-4 w-4" />
              {r.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Amallar">
          <CommandItem onSelect={() => { toggle(); setOpen(false); }}>
            {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {theme === "dark" ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
          </CommandItem>
          <CommandItem
            onSelect={async () => {
              setOpen(false);
              await signOut();
              toast.success("Tizimdan chiqdingiz");
              navigate("/", { replace: true });
            }}
            className="text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Tizimdan chiqish
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
