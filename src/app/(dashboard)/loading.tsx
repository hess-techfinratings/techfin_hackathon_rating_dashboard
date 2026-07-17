import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Skeleton className="h-4 w-32" />
      </div>
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[380px] rounded-xl" />
        <Skeleton className="h-[220px] rounded-xl" />
      </main>
    </>
  )
}
