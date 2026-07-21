// Shared between the /requests server page and its client filter controls —
// must stay outside any "use client" module so the server sees real values.
export const GRADE_TYPE_OPTIONS = [
  { key: "fs", label: "FS", value: "FS" },
  { key: "mis_fs", label: "MIS+FS", value: "MIS+FS" },
  { key: "mis", label: "MIS", value: "MIS" },
  { key: "none", label: "미산출", value: null },
] as const
