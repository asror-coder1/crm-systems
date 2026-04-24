import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail, roleHomePath, AppRole } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";

const schema = z.object({
  username: z.string().trim().min(3, "Username kamida 3 ta belgi").max(50),
  password: z.string().min(6, "Parol kamida 6 ta belgi").max(100),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && role) {
      navigate(roleHomePath[role as AppRole], { replace: true });
    }
  }, [user, role, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ username, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(parsed.data.username),
      password: parsed.data.password,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Username yoki parol noto'g'ri");
      return;
    }
    toast.success("Xush kelibsiz!");
    // navigation happens via effect once role loads
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full blur-3xl"
        style={{ background: "var(--gradient-glow)" }}
        aria-hidden
      />

      <Link
        to="/"
        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-smooth"
      >
        <ArrowLeft className="h-4 w-4" /> Bosh sahifa
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass rounded-3xl p-8 shadow-elegant">
          <div className="flex flex-col items-center mb-8">
            <div className="h-14 w-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow mb-4">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold">Xush kelibsiz</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Tizimga kirish uchun ma'lumotlaringizni kiriting
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                autoComplete="username"
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Parol</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={submitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kirilmoqda...
                </>
              ) : (
                "Tizimga kirish"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Akkauntingiz yo'qmi? Administratoringiz bilan bog'laning.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
