/** Neutral placeholders only during the first code/data load; chrome stays outside Suspense. */
export function ContentSkeleton({ feed = false }: { feed?: boolean }) {
  return (
    <div aria-hidden="true" className="mx-auto max-w-lg space-y-4 px-4 py-4 motion-safe:animate-pulse">
      {[0, 1].map(index => (
        <div key={index} className="space-y-3">
          <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-muted" /><div className="h-3 w-32 rounded bg-muted" /></div>
          <div className={`${feed ? 'aspect-[4/5]' : 'h-24'} rounded-lg bg-muted`} />
        </div>
      ))}
    </div>
  );
}
export default function NavigationSkeleton() {
  return <main className="min-h-screen bg-background pb-28"><div aria-hidden="true" className="border-b border-border px-4 py-4"><div className="mx-auto flex max-w-lg items-center justify-between"><div className="h-10 w-10 rounded-full bg-muted" /><div className="h-4 w-28 rounded bg-muted" /></div></div><ContentSkeleton /></main>;
}