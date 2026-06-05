export default function LoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center min-h-[60vh] gap-3"
    >
      <div
        className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 animate-spin"
        aria-hidden="true"
      />
      <p className="text-sm text-gray-500 dark:text-gray-400">Carregando…</p>
    </div>
  )
}
