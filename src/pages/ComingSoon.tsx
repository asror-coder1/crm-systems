import { Construction, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass rounded-2xl p-12 md:p-20 text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="inline-flex h-16 w-16 rounded-2xl bg-gradient-primary items-center justify-center shadow-glow mb-5 animate-float"
        >
          <Construction className="h-8 w-8 text-primary-foreground" />
        </motion.div>
        <p className="font-display text-2xl font-semibold">Tez orada</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Bu modul keyingi bosqichlarda ishga tushadi. Hozircha boshqa sahifalardan foydalanishingiz mumkin.
        </p>
        <Button asChild variant="ghost" className="mt-6">
          <Link to="/super-admin/dashboard">
            <ArrowLeft className="h-4 w-4" /> Dashboard'ga qaytish
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
