import ToolFlagsProvider from '@/components/ToolFlagsProvider'
import ToolProjectWorkspace from '@/components/tools/ToolProjectWorkspace'
import ToolsShell from '@/components/tools/ToolsShell'
import Toaster from '@/components/Toaster'

export default function StudioProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToolFlagsProvider>
      <ToolsShell>
        <ToolProjectWorkspace />
      </ToolsShell>
      <Toaster />
    </ToolFlagsProvider>
  )
}
