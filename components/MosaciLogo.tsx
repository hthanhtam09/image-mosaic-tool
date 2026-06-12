import Link from 'next/link'

interface MosaciLogoProps {
  readonly href?: string
  readonly size?: 'sm' | 'md' | 'lg'
  readonly showText?: boolean
  readonly className?: string
}

const SIZE = {
  sm: { tile: 'h-6 w-6 gap-[3px] rounded-[6px] p-[5px]', dot: 'rounded-[1.5px]', text: 'text-base' },
  md: { tile: 'h-7 w-7 gap-0.5 rounded-[7px] p-1',       dot: 'rounded-[1.5px]', text: 'text-lg'   },
  lg: { tile: 'h-9 w-9 gap-[3px] rounded-[9px] p-[6px]', dot: 'rounded-[2px]',   text: 'text-xl'   },
}

export function MosaciLogoMark({ size = 'md' }: Readonly<{ size?: 'sm' | 'md' | 'lg' }>) {
  const s = SIZE[size]
  return (
    <span className={`grid grid-cols-2 grid-rows-2 shrink-0 border border-[#c0cde340] bg-[#c0cde31f] ${s.tile}`}>
      <i className={`block bg-accent ${s.dot}`} />
      <i className={`block bg-accent opacity-50 ${s.dot}`} />
      <i className={`block bg-accent opacity-50 ${s.dot}`} />
      <i className={`block bg-accent ${s.dot}`} />
    </span>
  )
}

export default function MosaciLogo({ href = '/', size = 'md', showText = true, className = '' }: MosaciLogoProps) {
  const s = SIZE[size]
  return (
    <Link className={`inline-flex shrink-0 items-center gap-2.5 ${className}`} href={href}>
      <MosaciLogoMark size={size} />
      {showText && (
        <span className={`font-bold tracking-[-0.01em] ${s.text}`}>Mosaci</span>
      )}
    </Link>
  )
}
