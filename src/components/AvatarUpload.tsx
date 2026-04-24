import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  currentUrl: string | null;
  initials: string;
  onUploaded: (url: string) => void;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

export default function AvatarUpload({ userId, currentUrl, initials, onUploaded, size = "lg" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Faqat rasm fayli yuklash mumkin");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Rasm 2MB dan kichik bo'lishi kerak");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = data.publicUrl;
    const { error: profErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    if (profErr) {
      toast.error(profErr.message);
      setUploading(false);
      return;
    }
    onUploaded(url);
    toast.success("Avatar yangilandi");
    setUploading(false);
  };

  return (
    <div className="relative inline-block group">
      <Avatar className={cn(sizeMap[size], "border-2 border-primary/30 shadow-glow")}>
        {currentUrl && <AvatarImage src={currentUrl} alt="Avatar" />}
        <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "absolute inset-0 rounded-full grid place-items-center bg-background/70 backdrop-blur-sm",
          "opacity-0 group-hover:opacity-100 transition-smooth disabled:cursor-wait",
          uploading && "opacity-100",
        )}
        aria-label="Avatarni almashtirish"
      >
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
