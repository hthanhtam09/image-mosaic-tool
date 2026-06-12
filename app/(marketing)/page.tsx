import MarketingFooter from '@/components/marketing/MarketingFooter'
import MarketingHeader from '@/components/marketing/MarketingHeader'
import FeaturesBento from '@/components/marketing/home/FeaturesBento'
import FinalCta from '@/components/marketing/home/FinalCta'
import Hero from '@/components/marketing/home/Hero'
import HowItWorks from '@/components/marketing/home/HowItWorks'
import InteractiveShowcase from '@/components/marketing/home/InteractiveShowcase'
import ProductDemo from '@/components/marketing/home/ProductDemo'
import PricingTeaser from '@/components/marketing/home/PricingTeaser'
import Testimonial from '@/components/marketing/home/Testimonial'
import type { Metadata } from 'next'
import MosaicInit from './MosaicInit'
import './home.css'

export const metadata: Metadata = {
  title: { absolute: 'Mosaci — Turn any image into a color-by-number book' },
  description:
    'Upload, pick a mosaic style, export a print-ready PDF coloring book. 10 mosaic styles, bulk folder upload and one-click PDF export. Built for KDP creators.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Mosaci — Turn any image into a color-by-number book',
    description: 'Upload, pick a mosaic style, export a print-ready PDF coloring book. Built for KDP creators.',
    url: '/',
    type: 'website',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Mosaci',
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web',
  description: 'Convert images into color-by-number mosaics and export print-ready PDF coloring books.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHeader active="tool" />
      <MosaicInit />

      <main>
        <Hero />
        <FeaturesBento />
        <HowItWorks />
        <InteractiveShowcase />
        <ProductDemo />
        <PricingTeaser />
        <Testimonial />
        <FinalCta />
      </main>

      <MarketingFooter />
    </>
  )
}
