"use client"

import { CalendarRange, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import type { DateRange as DayPickerRange } from "react-day-picker"
import { ko } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

function toDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function toYmd(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

function shift(ymd: string, days: number): string {
  const d = toDate(ymd)
  d.setDate(d.getDate() + days)
  return toYmd(d)
}

export function DateRangeFilter({ min, max }: { min: string; max: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<DayPickerRange | undefined>()

  function apply(nextFrom: string | null, nextTo: string | null) {
    const params = new URLSearchParams(searchParams)
    if (nextFrom) params.set("from", nextFrom)
    else params.delete("from")
    if (nextTo) params.set("to", nextTo)
    else params.delete("to")
    params.delete("page")
    router.push(params.size ? `${pathname}?${params}` : pathname)
    setOpen(false)
    setPending(undefined)
  }

  const presets = [
    { label: "전체", from: null, to: null },
    { label: "최근 4주", from: shift(max, -27), to: max },
    { label: "최근 12주", from: shift(max, -83), to: max },
  ]
  const filtered = Boolean(from || to)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) setPending(undefined)
        }}
      >
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" className="gap-2 font-normal tabular-nums" />
          }
        >
          <CalendarRange className="size-4" />
          {filtered ? `${from ?? min} ~ ${to ?? max}` : "전체 기간"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            locale={ko}
            defaultMonth={toDate(shift(to ?? max, -31))}
            startMonth={toDate(min)}
            endMonth={toDate(max)}
            disabled={{ before: toDate(min), after: toDate(max) }}
            selected={pending ?? { from: from ? toDate(from) : undefined, to: to ? toDate(to) : undefined }}
            onSelect={(range) => {
              setPending(range)
              if (range?.from && range.to) apply(toYmd(range.from), toYmd(range.to))
            }}
          />
        </PopoverContent>
      </Popover>

      {presets.map((p) => {
        const active = from === p.from && to === p.to
        return (
          <Button
            key={p.label}
            variant={active ? "secondary" : "ghost"}
            size="sm"
            className="text-xs"
            onClick={() => apply(p.from, p.to)}
          >
            {p.label}
          </Button>
        )
      })}

      {filtered && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs text-muted-foreground"
          onClick={() => apply(null, null)}
        >
          <X className="size-3" /> 초기화
        </Button>
      )}
    </div>
  )
}
