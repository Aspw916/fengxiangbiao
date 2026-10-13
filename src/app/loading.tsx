export default function Loading() {
  return (
    <div className="fixed inset-x-0 top-14 bottom-0 flex items-center justify-center" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-fg opacity-40 motion-reduce:animate-none" />
          <span className="relative inline-flex size-3 rounded-full bg-fg" />
        </span>
        <p className="text-sm text-dim">正在观测…</p>
      </div>
    </div>
  );
}
