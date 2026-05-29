import { Heart } from "lucide-react";

export function CreditFooter() {
  return (
    <div className="py-3 text-center">
      <p className="text-[11px] text-muted-foreground/60 inline-flex items-center gap-1">
        Made with <Heart className="h-2.5 w-2.5 text-red-400 fill-red-400" /> by <span className="font-medium text-muted-foreground/80">Rahmat Iqbal</span>
      </p>
    </div>
  );
}
