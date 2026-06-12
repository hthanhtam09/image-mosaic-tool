import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple pricing that scales with your books. Start free, upgrade when you're selling. Cancel anytime.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing · Mosaci",
    description: "Simple pricing that scales with your books. Start free, upgrade when you're selling. Cancel anytime.",
    url: "/pricing",
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
