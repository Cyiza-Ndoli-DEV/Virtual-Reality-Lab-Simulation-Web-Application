'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function TeacherMarkField({
  id,
  label,
  value,
  max,
  disabled,
  hint,
  onChange,
}: {
  id: string
  label: string
  value: string
  max: number
  disabled?: boolean
  hint?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <Label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min={0}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-28 bg-white"
        />
        <span className="text-sm text-slate-500">/ {max}</span>
      </div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
