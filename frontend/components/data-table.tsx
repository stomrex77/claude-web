"use client"

import * as React from "react"
import {
  IconChevronRight,
  IconChevronLeft,
  IconFolder,
  IconMessage,
  IconCoins,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { z } from "zod"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { type PaginationInfo } from "@/lib/api"

export const schema = z.object({
  id: z.string(),
  title: z.string(),
  directory: z.string(),
  messages: z.number(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
})

function formatTokens(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    accessorKey: "title",
    header: "Conversation",
    cell: ({ row }) => (
      <div className="max-w-[300px]">
        <p className="font-medium truncate">{row.original.title}</p>
      </div>
    ),
  },
  {
    accessorKey: "directory",
    header: "Directory",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-muted-foreground">
        <IconFolder className="size-4 shrink-0" />
        <span
          className="text-sm max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ direction: "rtl", textAlign: "left" }}
        >
          {row.original.directory}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "messages",
    header: "Messages",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-muted-foreground">
        <IconMessage className="size-4" />
        <span className="text-sm">{row.original.messages}</span>
      </div>
    ),
  },
  {
    accessorKey: "tokens",
    header: "Tokens",
    cell: ({ row }) => {
      const input = row.original.inputTokens || 0
      const output = row.original.outputTokens || 0
      const total = input + output
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <IconCoins className="size-4" />
          <span className="text-sm tabular-nums">{formatTokens(total)}</span>
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: () => (
      <div className="flex items-center justify-end">
        <IconChevronRight className="size-4 text-muted-foreground" />
      </div>
    ),
  },
]

export function DataTable({
  data,
  pagination,
  onRowClick,
  onNextPage,
  onPrevPage,
}: {
  data: z.infer<typeof schema>[]
  pagination?: PaginationInfo | null
  onRowClick?: (conversation: z.infer<typeof schema>) => void
  onNextPage?: () => void
  onPrevPage?: () => void
}) {
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Past Conversations</h2>
          <p className="text-sm text-muted-foreground">Your recent sessions</p>
        </div>
      </div>
      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-none hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan} className="text-muted-foreground text-xs font-medium">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer border-border/50 hover:bg-muted/30"
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No conversations yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevPage}
                disabled={!pagination.hasPrev}
              >
                <IconChevronLeft className="size-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onNextPage}
                disabled={!pagination.hasNext}
              >
                Next
                <IconChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
