import Link from 'next/link'

import MosaciLogo from '@/components/MosaciLogo'

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Mosaic Tool', href: '/studio/projects' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '#' },
      { label: 'Roadmap', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Tutorials', href: '#' },
      { label: 'Help', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '#' },
      { label: 'Privacy', href: '#' },
      { label: 'Refund', href: '#' },
      { label: 'License', href: '#' },
    ],
  },
]

export default function MarketingFooter() {
  return (
    <footer className="border-t border-border-primary bg-bg-secondary pb-8 pt-16">
      <div className="mx-auto w-full max-w-[1180px] px-8">
        <div className="grid grid-cols-2 gap-10 max-[900px]:grid-cols-2 min-[900px]:grid-cols-[1.6fr_repeat(4,1fr)]">
          <div>
            <MosaciLogo />
            <p className="my-4 mb-5 max-w-[280px] text-sm text-text-secondary">
              Turn any image into a print-ready color-by-number book.
            </p>
            <div className="flex max-w-[320px] gap-2">
              <input
                className="h-10 w-full rounded-lg border border-border-primary bg-bg-secondary px-3.5 text-[15px] text-text-primary outline-none transition focus:border-accent focus:shadow-[var(--ring)] placeholder:text-text-secondary"
                type="email"
                placeholder="you@email.com"
              />
              <button className="btn btn-primary" type="button">
                Subscribe
              </button>
            </div>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h5 className="mb-4 text-[13px] font-semibold text-text-primary">{column.title}</h5>
              <ul className="flex flex-col gap-[11px]">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link className="text-sm text-text-secondary transition-colors hover:text-text-primary" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border-primary pt-6 text-[13px] text-text-secondary">
          <span>© Mosaci 2026</span>
          <select className="h-[34px] cursor-pointer rounded-lg border border-border-primary bg-bg-secondary px-3 text-[13px] text-text-primary outline-none">
            <option>English</option>
          </select>
        </div>
      </div>
    </footer>
  )
}
