import ToolFlagsProvider from '@/components/ToolFlagsProvider'
import ToolProjectWorkspace from '@/components/tools/ToolProjectWorkspace'
import ToolsShell from '@/components/tools/ToolsShell'
import Toaster from '@/components/Toaster'
import { Suspense } from 'react'

export default function StudioProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToolFlagsProvider>
      <Suspense fallback={null}>
        <ToolsShell>
          <ToolProjectWorkspace />
        </ToolsShell>
      </Suspense>
      <Toaster />
    </ToolFlagsProvider>
  )
}
