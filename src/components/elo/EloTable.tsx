import { useState, useMemo } from 'react';
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
import type { EloEntry, EloMap } from '../../types/elo';
import { formatId, formatElo, formatPercent } from '../../lib/format';
import { getCardMeta, type CardColor, type CardRarity } from '../../lib/card-meta';

const RARITY_COLORS: Partial<Record<CardRarity, string>> = {
  Common: 'bg-gray-500 text-gray-100',
  Uncommon: 'bg-blue-600 text-blue-100',
  Rare: 'bg-yellow-600 text-yellow-100',
  Ancient: 'bg-purple-600 text-purple-100',
  Curse: 'bg-red-800 text-red-200',
  Basic: 'bg-gray-700 text-gray-300',
  Status: 'bg-gray-700 text-gray-300',
};

const COLOR_DOTS: Partial<Record<CardColor, string>> = {
  Ironclad: 'bg-red-500',
  Silent: 'bg-green-500',
  Defect: 'bg-blue-400',
  Regent: 'bg-amber-400',
  Necrobinder: 'bg-violet-500',
  Colorless: 'bg-gray-400',
  Curse: 'bg-red-900',
  Event: 'bg-orange-400',
  Status: 'bg-gray-600',
  Token: 'bg-gray-600',
};

interface EloTableProps {
  eloMap: EloMap;
  title: string;
  entityLabel?: string; // "Card" or "Ancient Reward"
  showCardMeta?: boolean; // Show rarity/color columns for cards
  onEntityClick?: (id: string) => void; // Navigate when a name is clicked
  titleExtra?: React.ReactNode; // Extra content rendered to the right of the title
  rarityFilter?: string | null; // Display-only rarity filter
  onRarityFilterChange?: (rarity: string | null) => void;
  colorFilter?: string | null; // Display-only class/color filter
  onColorFilterChange?: (color: string | null) => void;
}

const columnHelper = createColumnHelper<EloEntry & { rank: number }>();

export function EloTable({
  eloMap,
  title,
  titleExtra,
  entityLabel = 'Option',
  showCardMeta = false,
  onEntityClick,
  rarityFilter,
  onRarityFilterChange,
  colorFilter,
  onColorFilterChange,
}: EloTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'rating', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const data = useMemo(() => {
    let entries = [...eloMap.values()].sort((a, b) => b.rating - a.rating);
    if (rarityFilter) {
      entries = entries.filter((e) => getCardMeta(e.id)?.rarity === rarityFilter);
    }
    if (colorFilter) {
      entries = entries.filter((e) => getCardMeta(e.id)?.color === colorFilter);
    }
    return entries.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [eloMap, rarityFilter, colorFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('rank', {
        header: '#',
        cell: (info) => <span className="text-gray-500">{info.getValue()}</span>,
        size: 50,
      }),
      columnHelper.accessor('id', {
        header: entityLabel,
        cell: (info) => {
          const id = info.getValue();
          const isSkip = id.startsWith('SKIP_');
          const isSacrifice = id === 'SACRIFICE';
          const baseClass = isSkip
            ? 'text-yellow-400 italic'
            : isSacrifice
              ? 'text-purple-400 italic'
              : 'text-gray-200';
          if (onEntityClick && !isSkip && !isSacrifice) {
            return (
              <button
                className={`${baseClass} hover:underline cursor-pointer text-left`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEntityClick(id);
                }}
              >
                {formatId(id)}
              </button>
            );
          }
          return <span className={baseClass}>{formatId(id)}</span>;
        },
      }),
      ...(showCardMeta
        ? [
            columnHelper.display({
              id: 'color',
              header: 'Class',
              cell: (info) => {
                const meta = getCardMeta(info.row.original.id);
                if (!meta) return null;
                const dotClass = COLOR_DOTS[meta.color] ?? 'bg-gray-600';
                return (
                  <span className="flex items-center gap-1.5">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotClass}`} />
                    <span className="text-gray-400 text-xs">{meta.color}</span>
                  </span>
                );
              },
            }),
            columnHelper.display({
              id: 'rarity',
              header: 'Rarity',
              cell: (info) => {
                const meta = getCardMeta(info.row.original.id);
                if (!meta) return null;
                const badgeClass = RARITY_COLORS[meta.rarity] ?? 'bg-gray-700 text-gray-300';
                return (
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${badgeClass}`}
                  >
                    {meta.rarity}
                  </span>
                );
              },
            }),
          ]
        : []),
      columnHelper.accessor('rating', {
        header: 'Elo',
        cell: (info) => {
          const rating = info.getValue();
          const color =
            rating >= 1600 ? 'text-green-400' : rating >= 1400 ? 'text-gray-200' : 'text-red-400';
          return <span className={`font-mono font-bold ${color}`}>{formatElo(rating)}</span>;
        },
      }),
      columnHelper.accessor('timesSeen', {
        header: 'Seen',
        cell: (info) => <span className="text-gray-400">{info.getValue()}</span>,
      }),
      columnHelper.accessor('timesPicked', {
        header: 'Picked',
        cell: (info) => <span className="text-gray-400">{info.getValue()}</span>,
      }),
      columnHelper.accessor('pickRate', {
        header: 'Pick Rate',
        cell: (info) => <span className="text-gray-300">{formatPercent(info.getValue())}</span>,
      }),
      columnHelper.accessor('matches', {
        header: 'Run W',
        cell: (info) => (
          <span className="text-green-500/70 text-sm">{info.row.original.runWins}</span>
        ),
        sortingFn: (a, b) => a.original.runWins - b.original.runWins,
      }),
      columnHelper.accessor('wins', {
        header: 'Run L',
        cell: (info) => (
          <span className="text-red-500/70 text-sm">{info.row.original.runLosses}</span>
        ),
        sortingFn: (a, b) => a.original.runLosses - b.original.runLosses,
      }),
      columnHelper.accessor('losses', {
        header: 'Win Rate',
        cell: (info) => (
          <span className="text-gray-300">{formatPercent(info.row.original.runWinRate)}</span>
        ),
        sortingFn: (a, b) => a.original.runWinRate - b.original.runWinRate,
      }),
    ],
    [entityLabel, showCardMeta, onEntityClick],
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
      pagination: { pageSize: 50 },
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      return formatId(row.original.id).toLowerCase().includes(search);
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
          {titleExtra}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(rarityFilter || colorFilter || globalFilter) && (
            <button
              onClick={() => {
                onRarityFilterChange?.(null);
                onColorFilterChange?.(null);
                setGlobalFilter('');
              }}
              className="px-2 py-1.5 rounded text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
              title="Reset filters"
            >
              ✕ Reset
            </button>
          )}
          {onRarityFilterChange && (
            <select
              value={rarityFilter ?? ''}
              onChange={(e) => onRarityFilterChange(e.target.value || null)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-300 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Rarities</option>
              <option value="Common">Common</option>
              <option value="Uncommon">Uncommon</option>
              <option value="Rare">Rare</option>
            </select>
          )}
          {onColorFilterChange && (
            <select
              value={colorFilter ?? ''}
              onChange={(e) => onColorFilterChange(e.target.value || null)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-300 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Classes</option>
              <option value="Ironclad">Ironclad</option>
              <option value="Silent">Silent</option>
              <option value="Regent">Regent</option>
              <option value="Necrobinder">Necrobinder</option>
              <option value="Defect">Defect</option>
              <option value="Colorless">Colorless</option>
            </select>
          )}
          <input
            type="text"
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:border-purple-500 focus:outline-none"
          />
          <span className="text-xs text-gray-500">{data.length} entries</span>
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
              <tr key={row.id} className="hover:bg-gray-900/50 transition-colors">
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
