import { sectionTitle } from "./ui";

const STEPS: [string, string, string][] = [
  ["01", "Upload images", "Drag in up to 100 PNGs or JPGs — single shots or an entire themed folder at once."],
  ["02", "Pick pattern & palette", "Choose one of 10 grid styles per page and tune cell size and color count to your audience."],
  ["03", "Export PDF / ZIP", "Assemble a print-ready coloring book in one click, or download every page individually."],
];

export default function HowItWorks() {
  return (
    <section className="bg-bg-secondary py-24">
      <div className="mx-auto w-full max-w-[1000px] px-8">
        <div className="mb-[54px] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c0cde333] bg-[#c0cde31a] px-3.5 py-1.5 text-[13px] font-medium text-accent">
            How it works
          </span>
          <h2 className={`${sectionTitle} mt-4`}>Three steps to a finished book</h2>
        </div>
        <div className="grid grid-cols-3 gap-10 max-[860px]:grid-cols-1 max-[860px]:gap-7">
          {STEPS.map(([num, title, body]) => (
            <div key={num} className="flex flex-col">
              <div className="mb-[22px] flex items-center gap-4">
                <span className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-[#c0cde359] bg-[#c0cde312] font-mono text-[13px] text-accent">
                  {num}
                </span>
                <span className="h-px flex-1 bg-[linear-gradient(90deg,#c0cde34d,var(--border)_60%,transparent)]" />
              </div>
              <h3 className="mb-2 text-[19px] font-semibold tracking-[-0.01em]">{title}</h3>
              <p className="text-[14.5px] leading-[1.65] text-text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
