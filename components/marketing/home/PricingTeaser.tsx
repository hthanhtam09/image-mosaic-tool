import Link from "next/link";
import { PLAN, PLAN_DESC, PLAN_PRICE_DISPLAY, PLAN_FEATURES, PLAN_CTA } from "@/lib/plans";
import { Check, cardBase, sectionTitle } from "./ui";

const TEASER_PLANS = [
  { plan: PLAN.FREE,  primary: false, pop: false },
  { plan: PLAN.PLUS, primary: true,  pop: true  },
  { plan: PLAN.PRO,  primary: false, pop: false },
] as const;

export default function PricingTeaser() {
  return (
    <section className="bg-bg-secondary py-24">
      <div className="mx-auto w-full max-w-[1180px] px-8">
        <div className="mb-12 text-center">
          <h2 className={sectionTitle}>Plans that scale with your catalog</h2>
        </div>
        <div className="mx-auto grid max-w-[920px] grid-cols-3 gap-4 max-[860px]:grid-cols-1">
          {TEASER_PLANS.map(({ plan, primary, pop }) => (
            <div
              key={plan}
              className={`${cardBase} relative flex flex-col gap-3.5 p-[22px] ${pop ? "border-[#c0cde380]! shadow-[0_0_50px_#c0cde314]" : ""}`}
            >
              {pop && (
                <span className="absolute -top-[11px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#c0cde31f] px-[11px] py-1 text-xs font-medium leading-none text-accent">
                  Most popular
                </span>
              )}
              <div>
                <h3 className="text-xl font-semibold leading-[1.3]">{plan}</h3>
                <p className="mt-1 text-[13px] text-text-secondary">{PLAN_DESC[plan]}</p>
              </div>
              <div className="font-mono text-[34px] font-semibold">
                {PLAN_PRICE_DISPLAY[plan]}
                <span className="text-sm font-normal text-text-secondary">/mo</span>
              </div>
              <ul className="flex list-none flex-col gap-[9px] text-sm text-text-secondary">
                {PLAN_FEATURES[plan].map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <Check /> {feat}
                  </li>
                ))}
              </ul>
              <Link className={`btn btn-block ${primary ? "btn-primary" : "btn-ghost"}`} href="/pricing">
                {PLAN_CTA[plan]}
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
