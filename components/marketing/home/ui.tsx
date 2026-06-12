// Shared style tokens and tiny icons used across the home-page sections.

export const sectionTitle = "text-[clamp(30px,4vw,36px)] font-bold leading-[1.15] tracking-[-0.015em]";
export const cardBase = "rounded-xl border border-border-primary bg-bg-secondary";
export const cardInteractive =
  "transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c0cde359] hover:bg-bg-tertiary";

export const Check = () => (
  <svg className="shrink-0 text-accent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const Star = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
  </svg>
);
