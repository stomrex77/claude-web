"use client"

import * as React from "react"
import {
  IconChevronRight,
  IconFolder,
  IconGitBranch,
  IconMessage,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
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

export const schema = z.object({
  id: z.number(),
  title: z.string(),
  directory: z.string(),
  branch: z.string(),
  messages: z.number(),
})

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
        <IconFolder className="size-4" />
        <span className="text-sm">{row.original.directory}</span>
      </div>
    ),
  },
  {
    accessorKey: "branch",
    header: "Branch",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-muted-foreground">
        <IconGitBranch className="size-4" />
        <span className="text-sm">{row.original.branch}</span>
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
    id: "actions",
    cell: () => (
      <div className="flex items-center justify-end">
        <IconChevronRight className="size-4 text-muted-foreground" />
      </div>
    ),
  },
]

export function DataTable({
  data: initialData,
  onRowClick,
}: {
  data: z.infer<typeof schema>[]
  onRowClick?: (conversation: z.infer<typeof schema>) => void
}) {
  const [data] = React.useState(() => initialData)
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
      </div>
    </div>
  )
}
