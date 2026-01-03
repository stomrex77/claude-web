import { AppSidebar } from "@/components/app-sidebar"
import { DirectoryToolbar } from "@/components/directory-toolbar"
import { DirectoryTree } from "@/components/directory-tree"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { mockFileTree } from "./mock-data"

export default function DirectoryPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <DirectoryToolbar />
        <div className="flex flex-1 flex-col bg-background">
          <DirectoryTree data={mockFileTree} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
