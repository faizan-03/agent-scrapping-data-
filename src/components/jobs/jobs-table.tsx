"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobRow } from "@/types/jobs";

const scoreTone = (score: number | null) => {
  if (score == null) return "neutral";
  if (score >= 85) return "success";
  if (score >= 70) return "warning";
  return "neutral";
};

export function JobsTable({ jobs }: { jobs: JobRow[] }) {
  const [filter, setFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "score", desc: true }]);

  const columns = useMemo<ColumnDef<JobRow>[]>(
    () => [
      {
        accessorKey: "score",
        header: ({ column }) => (
          <button
            className="inline-flex items-center gap-1 font-semibold"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Score <ArrowUpDown size={14} />
          </button>
        ),
        cell: ({ row }) => (
          <Badge tone={scoreTone(row.original.score)}>
            {row.original.score == null ? "Pending" : `${row.original.score}%`}
          </Badge>
        ),
      },
      {
        accessorKey: "title",
        header: "Role",
        cell: ({ row }) => (
          <div className="min-w-[240px]">
            <div className="font-semibold text-[#17211b]">{row.original.title}</div>
            <div className="text-sm text-[#657069]">{row.original.company}</div>
          </div>
        ),
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => row.original.location ?? "Remote/Unknown",
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => <Badge>{row.original.source}</Badge>,
      },
      {
        accessorKey: "recruiterEmail",
        header: "Recruiter",
        cell: ({ row }) =>
          row.original.recruiterEmail ? (
            <a className="inline-flex items-center gap-1 text-sm font-semibold text-[#176b5b]" href={`mailto:${row.original.recruiterEmail}`}>
              <Mail size={14} />
              Email
            </a>
          ) : (
            <span className="text-[#657069]">Not public</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <a
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dfe4dc] bg-white hover:bg-[#eef4ee]"
            href={row.original.url}
            target="_blank"
            rel="noreferrer"
            title="Open job"
          >
            <ExternalLink size={16} />
          </a>
        ),
      },
    ],
    [],
  );

  // TanStack Table intentionally returns function-heavy objects for table state.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: jobs,
    columns,
    state: { globalFilter: filter, sorting },
    onGlobalFilterChange: setFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg border border-[#dfe4dc] bg-white"
    >
      <div className="flex flex-col gap-3 border-b border-[#dfe4dc] p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter roles, companies, sources"
          className="h-10 w-full rounded-md border border-[#cdd6cd] px-3 text-sm outline-none focus:border-[#176b5b] sm:max-w-sm"
        />
        <a href="/api/export/jobs">
          <Button variant="secondary">Export CSV</Button>
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="bg-[#eef4ee] text-left text-[#46514a]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-semibold">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-[#eef0ec]">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-[#657069]" colSpan={columns.length}>
                  No jobs found yet. Run the morning job after connecting Neon.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}


