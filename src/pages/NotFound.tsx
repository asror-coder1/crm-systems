import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404: Route not found:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full blur-3xl"
        style={{ background: "var(--gradient-glow)" }}
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center px-4"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="inline-flex h-20 w-20 rounded-3xl bg-gradient-primary items-center justify-center shadow-glow mb-8 animate-float"
        >
          <Compass className="h-10 w-10 text-primary-foreground" />
        </motion.div>

        <h1 className="font-display text-7xl md:text-9xl font-bold neon-text leading-none">404</h1>
        <p className="mt-4 font-display text-2xl md:text-3xl font-semibold">Sahifa topilmadi</p>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          So'ralgan manzil mavjud emas yoki o'chirilgan bo'lishi mumkin.
        </p>
        <p className="mt-2 text-xs text-muted-foreground font-mono opacity-60">
          {location.pathname}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="ghost" size="lg" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Orqaga
          </Button>
          <Button asChild variant="hero" size="lg">
            <Link to="/">
              <Home className="h-4 w-4" /> Bosh sahifa
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
