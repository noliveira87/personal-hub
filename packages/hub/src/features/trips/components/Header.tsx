import { Heart } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-accent fill-accent" />
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">Our Journey</span>
        </div>
        <p className="text-sm text-muted-foreground font-body hidden sm:block">A travel journal for two</p>
      </div>
    </header>
  );
}
