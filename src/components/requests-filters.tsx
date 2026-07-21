"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GRADE_TYPE_OPTIONS } from "@/lib/request-filters"

export function RequestsFilters({
  errorCodes,
}: {
  errorCodes: { system: "MIS" | "FS"; code: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setParam(key: "grade" | "error", value: string) {
    const params = new URLSearchParams(searchParams)
    if (value === "all") params.delete(key)
    else params.set(key, value)
    params.delete("page")
    router.push(params.size ? `${pathname}?${params}` : pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={searchParams.get("grade") ?? "all"}
        onValueChange={(v) => setParam("grade", v ?? "all")}
      >
        <SelectTrigger className="h-8 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 유형</SelectItem>
          {GRADE_TYPE_OPTIONS.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("error") ?? "all"}
        onValueChange={(v) => setParam("error", v ?? "all")}
      >
        <SelectTrigger className="h-8 max-w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 미산출 사유</SelectItem>
          {errorCodes.map((e) => (
            <SelectItem key={`${e.system}:${e.code}`} value={`${e.system}:${e.code}`}>
              {e.system} · {e.code.length > 24 ? `${e.code.slice(0, 24)}…` : e.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
