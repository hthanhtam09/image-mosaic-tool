"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  type BillingInterval,
  normalizeBillingInterval,
  normalizePlan,
} from "@/lib/auth/user";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { createClient } from "@/utils/supabase/client";
import { CMP, FAQ, PLANS, type Plan } from "./pricing-data";
import "./pricing.css";

const Check = () => (
  <svg className="mt-px shrink-0 text-accent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const wrap = "mx-auto w-full max-w-[1180px] px-8";
const h2 = "text-[clamp(24px,3vw,28px)] font-semibold leading-[1.2] tracking-[-0.01em]";
const muted = "text-text-secondary";
const chip = "inline-flex items-center gap-1.5 rounded-full bg-[#c0cde31f] px-[11px] py-1 text-xs font-medium leading-none text-accent";

const readPricingConfig = () => {
  if (typeof window === "undefined") {
    return {
      billing: "monthly" as BillingInterval,
      checkoutPlan: null as Plan | null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const requestedCheckout = normalizePlan(params.get("checkout"));
  const billing = normalizeBillingInterval(params.get("billing"));

  return {
    billing,
    checkoutPlan:
      requestedCheckout === "Free"
        ? null
        : PLANS.find((plan) => plan.name === requestedCheckout) ?? null,
  };
};

export default function PricingClient() {
  const [initialConfig] = useState(readPricingConfig);
  const [yearly, setYearly] = useState(initialConfig.billing === "yearly");
  const [checkout, setCheckout] = useState<Plan | null>(initialConfig.checkoutPlan);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [processingPlan, setProcessingPlan] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setAuthUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const cmpCell = (v: string) =>
    v === "✓" ? <Check /> : v === "—" ? <span className="text-text-muted">—</span> : <span className="font-mono">{v}</span>;

  const billingInterval: BillingInterval = yearly ? "yearly" : "monthly";
  const price = checkout ? (yearly ? checkout.m * 0.8 : checkout.m) : 0;
  const tax = price * 0.08;

  const redirectToLoginForPlan = (plan: Plan) => {
    const params = new URLSearchParams({
      mode: "signup",
      plan: plan.name,
      billing: billingInterval,
    });
    window.location.assign(`/login?${params.toString()}`);
  };

  const savePlan = async (plan: Plan, status: "active" | "payment_passed") => {
    const { error } = await createClient().auth.updateUser({
      data: {
        plan: plan.name,
        subscription_plan: plan.name,
        billing_interval: plan.name === "Free" ? null : billingInterval,
        subscription_status: status,
        payment_status:
          plan.name === "Free" ? "not_required" : "payment_skipped_checkout_pending",
        pending_plan: null,
        pending_billing_interval: null,
      },
    });

    if (error) throw error;
  };

  const choosePlan = async (plan: Plan) => {
    setCheckoutError("");
    if (!authUser) {
      redirectToLoginForPlan(plan);
      return;
    }

    if (plan.name !== "Free") {
      setCheckout(plan);
      return;
    }

    setProcessingPlan(true);
    try {
      await savePlan(plan, "active");
      window.location.assign("/studio/projects");
    } catch (planError) {
      setCheckoutError(planError instanceof Error ? planError.message : "Could not update plan.");
    } finally {
      setProcessingPlan(false);
    }
  };

  const proceedToCheckout = async () => {
    if (!checkout) return;
    setCheckoutError("");
    if (!authUser) {
      redirectToLoginForPlan(checkout);
      return;
    }

    setProcessingPlan(true);
    try {
      await savePlan(checkout, "payment_passed");
      window.location.assign("/studio/projects");
    } catch (planError) {
      setCheckoutError(planError instanceof Error ? planError.message : "Could not complete checkout.");
      setProcessingPlan(false);
    }
  };

  return (
    <>
      <MarketingHeader active="pricing" />

      <main>
        <section className="relative bg-[radial-gradient(#ffffff09_1px,transparent_1px)] bg-[length:24px_24px] pb-10 pt-[72px] text-center">
          <div className={wrap}>
            <h1 className="text-[clamp(30px,4vw,36px)] font-bold leading-[1.15] tracking-[-0.015em]">Simple pricing that scales with your books</h1>
            <p className={`mt-3.5 text-[17px] ${muted}`}>Start free. Upgrade when you&apos;re selling. Cancel anytime.</p>
            <div className="mt-7 inline-flex items-center gap-3.5 text-sm">
              <span className={yearly ? "text-text-secondary" : "text-text-primary"}>Monthly</span>
              <button type="button" aria-pressed={yearly} aria-label="Toggle yearly billing" className={`toggle${yearly ? " on" : ""}`} onClick={() => setYearly((y) => !y)} />
              <span className={yearly ? "text-text-primary" : "text-text-secondary"}>Yearly</span>
              <span className={`${chip} text-accent`}>Save 20%</span>
            </div>
          </div>
        </section>

        <section className="pb-20 pt-5">
          <div className={wrap}>
            <div className="mx-auto grid max-w-[1000px] grid-cols-3 items-start gap-[18px]">
              {PLANS.map((p) => (
                <div key={p.name} className={`relative flex flex-col gap-4 rounded-xl border bg-bg-secondary p-7 ${p.pop ? "border-[#c0cde380] shadow-[0_0_60px_#c0cde31a]" : "border-border-primary"}`}>
                  {p.pop && <span className={`${chip} absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap`}>Most popular</span>}
                  <div>
                    <h3 className="text-xl font-semibold leading-[1.3]">{p.name}</h3>
                    <p className={`mt-1 text-[13px] ${muted}`}>{p.desc}</p>
                  </div>
                  <div className="font-mono text-[40px] font-semibold leading-none">
                    ${yearly ? p.y : p.m}
                    <span className="font-sans text-sm font-normal text-text-secondary">/month</span>
                  </div>
                  <ul className="flex flex-1 list-none flex-col gap-[11px] text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-[9px] text-text-secondary">
                        <Check /> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`btn ${p.pop ? "btn-primary" : "btn-ghost"} btn-block`}
                    type="button"
                    onClick={() => void choosePlan(p)}
                    disabled={processingPlan}
                  >
                    {processingPlan ? "Please wait..." : p.cta}
                  </button>
                </div>
              ))}
            </div>
            {checkoutError && (
              <p className="mx-auto mt-5 max-w-[1000px] rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {checkoutError}
              </p>
            )}
          </div>
        </section>

        <section className="pb-24">
          <div className={`${wrap} mx-auto max-w-[920px]`}>
            <div className="mb-9 text-center">
              <h2 className={h2}>Compare plans</h2>
            </div>
            <table className="w-full border-collapse [&_td:not(:first-child)]:text-center [&_th:not(:first-child)]:text-center">
              <thead>
                <tr className="[&_th]:border-b [&_th]:border-border-primary [&_th]:px-4 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-[13px] [&_th]:font-semibold [&_th]:text-text-primary">
                  <th>Feature</th>
                  <th>Free</th>
                  <th className="!text-accent">Pro</th>
                  <th>Studio</th>
                </tr>
              </thead>
              <tbody className="[&_tr:nth-child(2n)]:bg-[#ffffff03]">
                {CMP.map((r) => (
                  <tr key={r[0]} className="[&_td]:border-b [&_td]:border-border-primary [&_td]:px-4 [&_td]:py-3.5 [&_td]:text-sm [&_td:first-child]:text-text-secondary">
                    <td>{r[0]}</td>
                    <td>{cmpCell(r[1])}</td>
                    <td>{cmpCell(r[2])}</td>
                    <td>{cmpCell(r[3])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="pb-24">
          <div className={`${wrap} mx-auto max-w-[760px]`}>
            <div className="mb-6 text-center">
              <h2 className={h2}>Frequently asked</h2>
            </div>
            {FAQ.map(([q, a], i) => (
              <details key={q} className="acc border-b border-border-primary" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-base font-medium">
                  {q}
                  <svg className="pm shrink-0 text-accent transition-transform duration-200" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="pb-5 text-[15px] leading-[1.6] text-text-secondary">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* checkout drawer */}
      <div
        className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-lg transition-opacity duration-[250ms] ${checkout ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setCheckout(null)}
      />
      <aside
        className={`fixed bottom-0 right-0 top-0 z-[101] flex w-[420px] max-w-[92vw] flex-col border-l border-border-primary bg-bg-secondary transition-transform duration-300 ${checkout ? "translate-x-0" : "translate-x-full"}`}
        aria-label="Checkout"
      >
        <div className="flex items-center justify-between border-b border-border-primary px-6 py-[22px]">
          <h3 className="text-xl font-semibold leading-[1.3]">Order summary</h3>
          <button className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border-primary text-text-secondary transition hover:bg-bg-tertiary" aria-label="Close" onClick={() => setCheckout(null)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 rounded-xl border border-border-primary bg-bg-primary p-[22px]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{checkout?.name ?? "Pro"} plan</div>
                <div className={`text-[13px] ${muted}`}>Billed {yearly ? "yearly" : "monthly"}</div>
              </div>
              {checkout?.name === "Pro" && <span className={chip}>Most popular</span>}
            </div>
          </div>
          <div className="flex justify-between py-[11px] text-sm">
            <span className={muted}>Subtotal</span>
            <span className="font-mono">${price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-[11px] text-sm">
            <span className={muted}>Tax (est.)</span>
            <span className="font-mono">${tax.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border-primary pt-4 text-base">
            <span>Total</span>
            <b className="font-mono text-[26px] text-accent">${(price + tax).toFixed(2)}</b>
          </div>
          {checkoutError && (
            <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
              {checkoutError}
            </p>
          )}
          <button
            className="btn btn-primary btn-lg btn-block mt-5"
            type="button"
            disabled={processingPlan}
            onClick={() => void proceedToCheckout()}
          >
            {processingPlan ? "Processing..." : "Proceed to checkout"}
          </button>
          <p className={`mt-3.5 text-center text-[11px] ${muted}`}>
            Payment is temporarily passed until checkout integration is complete.
          </p>
          <div className="mt-3.5 flex items-center justify-center gap-2.5 text-text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="font-mono text-[11px]">VISA</span>
            <span className="font-mono text-[11px]">MC</span>
            <span className="font-mono text-[11px]">AMEX</span>
          </div>
        </div>
      </aside>

      <MarketingFooter />
    </>
  );
}
