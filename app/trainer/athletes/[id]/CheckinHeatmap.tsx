'use client'

interface Props {
  checkinDates: string[]
}

export default function CheckinHeatmap({ checkinDates }: Props) {
  const days = new Set(checkinDates.map((d) => d.split('T')[0]))

  // Build last 30 days array
  const cells: { date: string; hasCheckin: boolean; label: string }[] = []
  const today = new Date()

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    cells.push({
      date: dateStr,
      hasCheckin: days.has(dateStr),
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    })
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {cells.map((cell) => (
          <div
            key={cell.date}
            title={`${cell.label}${cell.hasCheckin ? ' — ✓ checked in' : ''}`}
            className={`h-7 w-7 rounded-sm border transition-colors ${
              cell.hasCheckin
                ? 'bg-blue-500 border-blue-600'
                : 'bg-gray-100 border-gray-200'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-gray-100 border border-gray-200" />
          No training
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-blue-500 border border-blue-600" />
          Trained
        </div>
      </div>
    </div>
  )
}
