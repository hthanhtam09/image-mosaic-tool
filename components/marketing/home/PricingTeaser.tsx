import Link from "next/link";
import { Check, cardBase, sectionTitle } from "./ui";

const PLANS = [
  { name: "Free", tag: "For trying things out", price: "$0", feats: ["5 exports / month", "3 mosaic styles", "Watermarked exports"], cta: "Start free", primary: false, pop: false },
  { name: "Plus", tag: "For active creators", price: "$19", feats: ["Unlimited exports", "All 10 styles · no watermark", "PDF book export"], cta: "Get Plus", primary: true, pop: true },
  { name: "Pro", tag: "For teams & volume", price: "$49", feats: ["Everything in Plus", "Bulk folder upload", "Commercial license"], cta: "Get Pro", primary: false, pop: false },
];

export default function PricingTeaser() {
  return (
    <section className="bg-bg-secondary py-24">
      <div className="mx-auto w-full max-w-[1180px] px-8">
        <div className="mb-12 text-center">
          <h2 className={sectionTitle}>Plans that scale with your catalog</h2>
        </div>
        <div className="mx-auto grid max-w-[920px] grid-cols-3 gap-4 max-[860px]:grid-cols-1">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`${cardBase} relative flex flex-col gap-3.5 p-[22px] ${plan.pop ? "!border-[#c0cde380] shadow-[0_0_50px_#c0cde314]" : ""}`}
            >
              {plan.pop && (
                <span className="absolute -top-[11px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#c0cde31f] px-[11px] py-1 text-xs font-medium leading-none text-accent">
                  Most popular
                </span>
              )}
              <div>
                <h3 className="text-xl font-semibold leading-[1.3]">{plan.name}</h3>
                <p className="mt-1 text-[13px] text-text-secondary">{plan.tag}</p>
              </div>
              <div className="font-mono text-[34px] font-semibold">
                {plan.price}
                <span className="text-sm font-normal text-text-secondary">/mo</span>
              </div>
              <ul className="flex list-none flex-col gap-[9px] text-sm text-text-secondary">
                {plan.feats.map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <Check /> {feat}
                  </li>
                ))}
              </ul>
              <Link className={`btn btn-block ${plan.primary ? "btn-primary" : "btn-ghost"}`} href="/pricing">
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-7 text-center">
          <Link className="btn-link" href="/pricing">
            See full pricing →
          </Link>
        </div>
      </div>
    </section>
  );
}
