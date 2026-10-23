export default function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[45vh] items-center justify-center px-6 py-12"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="size-9 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-400" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Cargando sección...
        </p>
      </div>
    </div>
  );
}
