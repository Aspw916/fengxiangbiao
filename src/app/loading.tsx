export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 pt-6" aria-busy="true" aria-label="加载中">
      <div className="skeleton mx-auto h-10 w-2/3 rounded-xl" />
      <div className="skeleton mx-auto h-14 w-full max-w-xl rounded-full" />
      <div className="skeleton mt-10 h-48 w-full rounded-3xl" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="skeleton h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}
