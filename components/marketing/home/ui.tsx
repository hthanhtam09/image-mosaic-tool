// Shared style tokens and tiny icons used across the home-page sections.
import { Check as LucideCheck, Star as LucideStar } from "lucide-react";

export const sectionTitle = "text-[clamp(30px,4vw,36px)] font-bold leading-[1.15] tracking-[-0.015em]";
export const cardBase = "rounded-xl border border-border-primary bg-bg-secondary";
export const cardInteractive =
  "transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c0cde359] hover:bg-bg-tertiary";

export const Check = () => <LucideCheck className="shrink-0 text-accent" width={16} height={16} strokeWidth={2.5} />;

export const Star = () => <LucideStar width={20} height={20} fill="currentColor" strokeWidth={0} />;
