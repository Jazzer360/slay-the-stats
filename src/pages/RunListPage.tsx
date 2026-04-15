import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useSearchParams } from 'react-router';
import { useFilteredRuns } from '../hooks/useFilteredRuns';
import { useProfileNav } from '../hooks/useProfileNav';
import { summarizeRun, type RunSummary } from '../lib/stats';
import { formatId, formatDate, formatDuration } from '../lib/format';
import type { ParsedRun } from '../types/run';

function runHasPickedCard(run: ParsedRun, cardId: string): boolean {
  const isUpgraded = cardId.endsWith('+');
  const baseId = isUpgraded ? cardId.slice(0, -1) : cardId;

  for (const act of run.data.map_point_history) {
    for (const point of act) {
      const stats = point.player_stats?.[0];
      if (!stats) continue;
      if (stats.card_choices) {
        for (const c of stats.card_choices) {
          if (!c.was_picked) continue;
          const upgraded = c.card.current_upgrade_level && c.card.current_upgrade_level > 0;
          if (c.card.id === baseId && !!upgraded === isUpgraded) return true;
        }
      }
    }
  }
  return false;
}

function runHasPickedAncient(run: ParsedRun, ancientKey: string): boolean {
  for (const act of run.data.map_point_history) {
    for (const point of act) {
      const stats = point.player_stats?.[0];
      if (!stats?.ancient_choice) continue;
      for (const a of stats.ancient_choice) {
        if (a.was_chosen && a.TextKey === ancientKey) return true;
      }
    }
  }
  return false;
}

const columnHelper = createColumnHelper<RunSummary>();

export function RunListPage() {
  const filteredRuns = useFilteredRuns();
  const { toRunDetail } = useProfileNav();
  const [searchParams, setSearchParams] = useSearchParams();
  const cardFilter = searchParams.get('card');
  const ancientFilter = searchParams.get('ancient');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'startTime', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const displayRuns = useMemo(() => {
    let runs = filteredRuns;
    if (cardFilter) runs = runs.filter((r) => runHasPickedCard(r, cardFilter));
    if (ancientFilter) runs = runs.filter((r) => runHasPickedAncient(r, ancientFilter));
    return runs;
  }, [filteredRuns, cardFilter, ancientFilter]);

  const data = useMemo(() => displayRuns.map(summarizeRun), [displayRuns]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('startTime', {
        header: 'Date',
        cell: (info) => (
          <span className="text-gray-300 text-sm whitespace-nowrap">
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('character', {
        header: 'Character',
        cell: (info) => <span className="text-gray-200">{formatId(info.getValue())}</span>,
      }),
      columnHelper.accessor('ascension', {
        header: 'Asc',
        cell: (info) => <span className="text-gray-400">{info.getValue()}</span>,
        size: 60,
      }),
      columnHelper.accessor('win', {
        header: 'Result',
        cell: (info) => {
          const row = info.row.original;
          if (row.wasAbandoned) return <span className="text-gray-500">Abandoned</span>;
          return info.getValue() ? (
            <span className="text-green-400 font-medium">Victory</span>
          ) : (
            <span className="text-red-400">Defeat</span>
          );
        },
      }),
      columnHelper.accessor('floorsReached', {
        header: 'Floors',
        cell: (info) => <span className="text-gray-400">{info.getValue()}</span>,
        size: 70,
      }),
      columnHelper.accessor('deckSize', {
        header: 'Deck',
        cell: (info) => <span className="text-gray-400">{info.getValue()}</span>,
        size: 60,
      }),
      columnHelper.accessor('relicCount', {
        header: 'Relics',
        cell: (info) => <span className="text-gray-400">{info.getValue()}</span>,
        size: 70,
      }),
      columnHelper.accessor('killedBy', {
        header: 'Killed By',
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="text-red-400/70 text-sm">{formatId(val)}</span>
          ) : (
            <span className="text-gray-700">—</span>
          );
        },
      }),
      columnHelper.accessor('runTime', {
        header: 'Time',
        cell: (info) => (
          <span className="text-gray-500 text-sm">{formatDuration(info.getValue())}</span>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const r = row.original;
      return (
        formatId(r.character).toLowerCase().includes(search) ||
        formatId(r.killedBy).toLowerCase().includes(search) ||
        r.fileName.toLowerCase().includes(search)
      );
    },
  });

  if (filteredRuns.length === 0) {
    return (
      <div className="text-center text-gray-500 py-20">
        <p>
          No runs loaded.{' '}
          <Link to="/import" className="text-purple-400 hover:text-purple-300">
            Import your runs
          </Link>{' '}
          to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      {(cardFilter || ancientFilter) && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
          <span className="text-sm text-gray-400">
            Showing runs with{' '}
            {cardFilter && (
              <span className="text-green-400 font-medium">{formatId(cardFilter)}</span>
            )}
            {ancientFilter && (
              <span className="text-purple-400 font-medium">{formatId(ancientFilter)}</span>
            )}
          </span>
          <button
            onClick={() => setSearchParams({})}
            className="ml-auto px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200"
          >
            Clear filter
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-100">Run History</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{data.length} runs</span>
          <input
            type="text"
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-300"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' ↑',
                        desc: ' ↓',
                      }[header.column.getIsSorted() as string] ?? ''}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-gray-900/50 transition-colors cursor-pointer"
                onClick={() => toRunDetail(row.original.fileName)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 rounded text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 rounded text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
