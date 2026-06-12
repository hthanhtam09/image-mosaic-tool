import MosaciLogo from '@/components/MosaciLogo'

export default function Logo({ href = '/' }: Readonly<{ href?: string }>) {
  return <MosaciLogo href={href} size="md" />
}
