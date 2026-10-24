import { useEffect, useRef, useState } from 'react';
import { Activity, CalendarDays, FileText, Pill, Search, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFamilies } from '../../hooks/useFamily.js';
import { searchAcrossFamiSalud } from '../../../features/search/services/globalSearchService.js';

const ICONS = {
  member: UserRound,
  appointment: CalendarDays,
  medication: Pill,
  document: FileText,
  history: Activity,
};

function ResultList({ results, loading, query, error, onSelect, onClose }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div>
          <p className="text-xs font-extrabold text-slate-900 dark:text-white">Resultados de búsqueda</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Citas, medicamentos, historia clínica y documentos</p>
        </div>
        <button type="button" className="icon-button size-8!" onClick={onClose} aria-label="Cerrar búsqueda"><X size={15} /></button>
      </div>
      <div className="max-h-[min(60vh,480px)] overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2" role="status" aria-live="polite">
            {[0, 1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />)}
            <p className="pt-2 text-center text-xs text-slate-500">Buscando en tus espacios…</p>
          </div>
        ) : error ? (
          <p role="alert" className="p-5 text-xs text-rose-600 dark:text-rose-300">{error}</p>
        ) : results.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Search size={22} className="mx-auto text-slate-300" />
            <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-200">No encontramos coincidencias</p>
            <p className="mt-1 text-[11px] text-slate-500">Prueba con otro nombre, medicamento o palabra clave.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {results.map((item) => {
              const Icon = ICONS[item.type] || Search;
              return (
                <button key={item.id} type="button" onClick={() => onSelect(item)} className="group flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:hover:bg-slate-900">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"><Icon size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{item.title}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{item.typeLabel}</span>
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-slate-500 dark:text-slate-400">{item.detail}</span>
                  </span>
                  <span className="mt-2 text-slate-300 transition group-hover:text-brand-600">→</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-800">
        {query.length < 2 ? 'Escribe al menos 2 caracteres.' : `${results.length} resultado(s) · Solo se muestran datos a los que tienes acceso.`}
      </div>
    </div>
  );
}

export default function GlobalSearch() {
  const { families, selectFamily } = useFamilies();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mobileOpen) inputRef.current?.focus();
  }, [mobileOpen]);

  async function submitSearch(event) {
    event?.preventDefault();
    const value = query.trim();
    setOpen(true);
    setError('');
    setResults([]);
    if (value.length < 2) return;
    setLoading(true);
    try {
      setResults(await searchAcrossFamiSalud(value, families));
    } catch (requestError) {
      setError(requestError?.message || 'No fue posible completar la búsqueda.');
    } finally {
      setLoading(false);
    }
  }

  function selectResult(item) {
    if (item.familyId) selectFamily(item.familyId);
    setOpen(false);
    setMobileOpen(false);
    setQuery('');
    setResults([]);
    navigate(item.path);
  }

  const resultList = (
    <ResultList
      results={results}
      loading={loading}
      query={query.trim()}
      error={error}
      onSelect={selectResult}
      onClose={() => { setOpen(false); setMobileOpen(false); }}
    />
  );

  return (
    <>
      <div className="relative hidden w-64 xl:block">
        <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus-within:border-brand-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-50 dark:border-slate-800 dark:bg-slate-900 dark:focus-within:border-brand-800 dark:focus-within:bg-slate-900">
          <Search size={17} className="shrink-0 text-slate-400" />
          <input ref={inputRef} aria-label="Buscar en FamiSalud" placeholder="Buscar en FamiSalud" className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100" value={query} onChange={(event) => { setQuery(event.target.value); setOpen(false); }} onFocus={() => { if (results.length) setOpen(true); }} />
          <button type="submit" aria-label="Ejecutar búsqueda" className="text-slate-400 transition hover:text-brand-700"><Search size={14} /></button>
        </form>
        {open && <div className="absolute right-0 top-[calc(100%+10px)] z-70 w-[min(520px,calc(100vw-2rem))]">{resultList}</div>}
      </div>
      <button type="button" className="icon-button xl:hidden" aria-label="Buscar en FamiSalud" onClick={() => { setMobileOpen(true); setOpen(true); }}><Search size={19} /></button>
      {mobileOpen && (
        <div className="fixed inset-0 z-90 bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" role="presentation">
          <section className="mx-auto mt-3 max-w-2xl space-y-3 sm:mt-12" role="dialog" aria-modal="true" aria-label="Buscar en FamiSalud">
            <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input ref={inputRef} aria-label="Buscar en FamiSalud" value={query} onChange={(event) => { setQuery(event.target.value); setOpen(false); }} placeholder="Buscar en FamiSalud…" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none dark:text-white" />
              <button type="submit" className="primary-button min-h-9 px-3 py-2">Buscar</button>
              <button type="button" className="icon-button size-9!" aria-label="Cerrar búsqueda" onClick={() => { setMobileOpen(false); setOpen(false); }}><X size={16} /></button>
            </form>
            {open && resultList}
          </section>
        </div>
      )}
    </>
  );
}
