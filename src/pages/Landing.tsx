import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Sparkles,
  BarChart3,
  Users,
  MessageSquare,
  Wallet,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const features = [
  { icon: Users, title: "Multi-tenant", desc: "Cheksiz o'quv markazlar uchun yagona platforma" },
  { icon: BarChart3, title: "Real-time Analytics", desc: "Kunlik, oylik, yillik statistikalar" },
  { icon: MessageSquare, title: "Built-in Chat", desc: "Telegram darajasidagi xabar almashinuv" },
  { icon: Wallet, title: "Smart Payments", desc: "Avtomatik to'lov nazorati va eslatmalar" },
  { icon: ShieldCheck, title: "Role-based Access", desc: "5 ta role, har biriga moslashgan UI" },
  { icon: Sparkles, title: "AI Insights", desc: "O'quvchi va o'qituvchini avtomatik tahlil" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      {/* Decorative grid + glow */}
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" aria-hidden />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[1000px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "var(--gradient-glow)" }}
        aria-hidden
      />

      {/* Navbar */}
      <header className="relative z-10 container flex items-center justify-between py-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-semibold tracking-tight">EduCore</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button asChild variant="hero" size="lg">
            <Link to="/auth">
              Sign in
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </header>

      {/* Hero */}
      <section className="relative z-10 container pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 glass px-4 py-1.5 text-sm text-muted-foreground mb-8"
        >
          <span className="h-2 w-2 rounded-full bg-primary animate-glow-pulse" />
          Multi-tenant LMS · CRM · ERP — bir platformada
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight max-w-5xl mx-auto"
        >
          O'quv markazingizni{" "}
          <span className="neon-text">yangi avlod</span>{" "}
          tizimi bilan boshqaring
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          Talabalar, o'qituvchilar, to'lovlar, davomat, baholar va analitika —
          hammasi bitta zamonaviy panelda. PDP, Najot Ta'lim va boshqa yetakchi
          markazlar uchun mo'ljallangan.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          <Button asChild size="xl" variant="hero">
            <Link to="/auth">
              Tizimga kirish
              <ArrowRight className="ml-1 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="xl" variant="glass">
            <a href="#features">Imkoniyatlar</a>
          </Button>
        </motion.div>

        {/* Floating preview card */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-20 mx-auto max-w-4xl"
        >
          <div className="glass rounded-2xl p-2 shadow-elegant animate-float">
            <div className="rounded-xl bg-card/80 p-8">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Talabalar", value: "12,847", color: "text-primary" },
                  { label: "Markazlar", value: "24", color: "text-secondary" },
                  { label: "Daromad", value: "$1.2M", color: "text-accent" },
                ].map((s) => (
                  <div key={s.label} className="text-left">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </p>
                    <p className={`mt-1 font-display text-3xl font-bold ${s.color}`}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-32 rounded-lg bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-border/40 grid-bg" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 container pb-32">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold">
            Hamma narsa <span className="neon-text">bir joyda</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Tizimni boshqarish uchun zarur bo'lgan barcha vositalar
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="group glass rounded-2xl p-6 hover:border-primary/40 transition-smooth hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center mb-4 shadow-glow group-hover:scale-110 transition-spring">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/40 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} EduCore — Multi-tenant Education Platform
        </div>
      </footer>
    </div>
  );
}
