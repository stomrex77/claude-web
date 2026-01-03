"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { TerminalView } from "@/components/terminal-view"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function TerminalPage() {
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
        <SiteHeader title="Terminal" />
        <div className="flex flex-1 flex-col">
          <TerminalView className="flex-1" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
