'use client'

import * as React from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, subDays, subMonths, startOfYear } from 'date-fns'
import { DateRange, DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DateRangePickerProps {
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  onApply?: (date: DateRange | undefined) => void
  className?: string
}

type PresetOption = {
  label: string
  getValue: () => DateRange
}

const presetOptions: PresetOption[] = [
  {
    label: 'Today',
    getValue: () => {
      const today = new Date()
      return { from: today, to: today }
    },
  },
  {
    label: 'Last 3 Days',
    getValue: () => {
      const today = new Date()
      return { from: subDays(today, 2), to: today }
    },
  },
  {
    label: 'Last 7 Days',
    getValue: () => {
      const today = new Date()
      return { from: subDays(today, 6), to: today }
    },
  },
  {
    label: 'Last 30 Days',
    getValue: () => {
      const today = new Date()
      return { from: subDays(today, 29), to: today }
    },
  },
  {
    label: 'Last 3 Months',
    getValue: () => {
      const today = new Date()
      return { from: subMonths(today, 3), to: today }
    },
  },
  {
    label: 'Last 6 Months',
    getValue: () => {
      const today = new Date()
      return { from: subMonths(today, 6), to: today }
    },
  },
  {
    label: 'Last 1 Year',
    getValue: () => {
      const today = new Date()
      return { from: startOfYear(today), to: today }
    },
  },
]

export function DateRangePicker({
  date,
  onDateChange,
  onApply,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)
  const [selectedPreset, setSelectedPreset] = React.useState<string>('custom')

  const handlePresetClick = (preset: PresetOption) => {
    const newDate = preset.getValue()
    setTempDate(newDate)
    setSelectedPreset(preset.label)
  }

  const handleClear = () => {
    setTempDate(undefined)
    setSelectedPreset('custom')
  }

  const handleCancel = () => {
    setTempDate(date)
    setIsOpen(false)
  }

  const handleApply = () => {
    if (onDateChange) {
      onDateChange(tempDate)
    }
    if (onApply) {
      onApply(tempDate)
    }
    setIsOpen(false)
  }

  const displayText = React.useMemo(() => {
    if (!date?.from) {
      return 'Pick a date range'
    }
    if (date.to) {
      return `${format(date.from, 'MMM d, yyyy')} - ${format(date.to, 'MMM d, yyyy')}`
    }
    return format(date.from, 'MMM d, yyyy')
  }, [date])

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'h-9 justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[580px] p-0 bg-white shadow-lg" align="start">
          <div className="flex">
            {/* Preset Options Sidebar */}
            <div className="border-r border-gray-200 bg-gray-50 p-2.5 w-[110px] flex-shrink-0">
              <div className="space-y-0.5">
                <div className="text-[9px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Presets</div>
                {presetOptions.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      'w-full text-left px-2 py-1 text-xs rounded transition-colors',
                      selectedPreset === preset.label
                        ? 'bg-white font-medium text-gray-900'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar Section */}
            <div className="p-2.5 flex-1">
              {/* Header with date range display and actions */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <div className="text-xs font-medium text-gray-700">
                  {tempDate?.from ? (
                    <>
                      {format(tempDate.from, 'd MMM yyyy')}
                      {tempDate.to && ` - ${format(tempDate.to, 'd MMM yyyy')}`}
                    </>
                  ) : (
                    <span className="text-gray-400">Select date range</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-7 text-[10px] px-2.5"
                  >
                    Clear filters
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="h-7 text-[10px] px-2.5"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApply}
                    className="h-7 text-[10px] px-2.5"
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {/* Calendar */}
              <DayPicker
                mode="range"
                selected={tempDate}
                onSelect={(range) => {
                  setTempDate(range)
                  setSelectedPreset('custom')
                }}
                numberOfMonths={2}
                className="rdp-custom"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
