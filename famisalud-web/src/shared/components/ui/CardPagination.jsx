import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const defaultItemKey = (item) => item?.id;

/** Paginación reutilizable para cuadrículas y listados de tarjetas. */
export default function CardPagination({
  items = [],
  renderItem,
  pageSize = 6,
  className = "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
  itemKey = defaultItemKey,
  resetKey = "",
  targetItemId = "",
  label = "registros",
  showSummary = true,
}) {
  const [page, setPage] = useState(1);
  const normalizedPageSize = Math.max(1, Number(pageSize) || 6);
  const pageCount = Math.max(1, Math.ceil(items.length / normalizedPageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!targetItemId) return;
    const targetIndex = items.findIndex(
      (item) => String(itemKey(item)) === String(targetItemId),
    );
    if (targetIndex >= 0) {
      setPage(Math.floor(targetIndex / normalizedPageSize) + 1);
    }
  }, [targetItemId, items, itemKey, normalizedPageSize]);

  const visibleItems = useMemo(() => {
    const start = (page - 1) * normalizedPageSize;
    return items.slice(start, start + normalizedPageSize);
  }, [items, page, normalizedPageSize]);

  if (!items.length) return null;

  const firstItem = (page - 1) * normalizedPageSize + 1;
  const lastItem = Math.min(page * normalizedPageSize, items.length);
  const pageButtons = pageCount <= 5
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : [...new Set([1, page - 1, page, page + 1, pageCount])]
        .filter((number) => number >= 1 && number <= pageCount)
        .sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <div className={className}>
        {visibleItems.map((item, index) => (
          <Fragment key={itemKey(item) ?? `${page}-${index}`}>
            {renderItem(item, (page - 1) * normalizedPageSize + index)}
          </Fragment>
        ))}
      </div>

      {items.length > normalizedPageSize && (
        <nav
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between"
          aria-label={`Paginación de ${label}`}
        >
          {showSummary && (
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400" aria-live="polite">
              Mostrando <span className="font-bold text-slate-700 dark:text-slate-200">{firstItem}–{lastItem}</span> de {items.length} {label}
            </p>
          )}
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              className="icon-button size-9 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            {pageButtons.map((number, index) => {
              const previous = pageButtons[index - 1];
              return (
                <Fragment key={number}>
                  {previous && number - previous > 1 && (
                    <span className="px-1 text-xs text-slate-400" aria-hidden="true">…</span>
                  )}
                  <button
                    type="button"
                    className={`min-w-9 rounded-xl px-2.5 py-2 text-xs font-bold transition ${number === page ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                    onClick={() => setPage(number)}
                    aria-current={number === page ? "page" : undefined}
                    aria-label={`Página ${number}`}
                  >
                    {number}
                  </button>
                </Fragment>
              );
            })}
            <button
              type="button"
              className="icon-button size-9 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page === pageCount}
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
