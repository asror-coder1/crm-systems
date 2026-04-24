import { Construction, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { roleLabel, AppRole } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";

export default function RolePlaceholder({ role }: { role: AppRole }) {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Tizimdan chiqdingiz");
    navigate("/", { replace: true });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero p-6">
      <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Chiqish
        </Button>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass relative rounded-3xl p-10 md:p-16 text-center max-w-lg w-full"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring" }}
          className="inline-flex h-20 w-20 rounded-2xl bg-gradient-primary items-center justify-center shadow-glow mb-6 animate-float"
        >
          <Construction className="h-10 w-10 text-primary-foreground" />
        </motion.div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">
          Salom, {profile?.full_name || profile?.username}!
        </h1>
        <p className="mt-3 text-sm uppercase tracking-widest text-primary">
          {roleLabel[role]} paneli
        </p>
        <p className="text-muted-foreground mt-4 text-base">
          Sizning paneliningiz hozir tayyorlanmoqda. Tez orada ishga tushadi.
        </p>
      </motion.div>
    </div>
  );
}
