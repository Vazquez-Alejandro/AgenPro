"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarProps {
  selected: Date | null;
  onSelect: (date: Date) => void;
  minDate?: Date;
}

export default function Calendar({
  selected,
  onSelect,
  minDate = new Date(),
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-white">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-white/40 py-2"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const isDisabled = isBefore(
            startOfDay(d),
            startOfDay(minDate)
          );
          const isSelected = selected && isSameDay(d, selected);
          const isCurrentMonth = isSameMonth(d, currentMonth);
          const today = isToday(d);

          return (
            <button
              key={d.toISOString()}
              onClick={() => !isDisabled && isCurrentMonth && onSelect(d)}
              disabled={isDisabled || !isCurrentMonth}
              className={`
                relative w-full aspect-square rounded-xl text-sm font-medium transition-all
                ${!isCurrentMonth ? "text-white/10" : ""}
                ${isDisabled ? "text-white/10 cursor-not-allowed" : ""}
                ${isSelected ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-105" : ""}
                ${!isSelected && isCurrentMonth && !isDisabled ? "text-white/70 hover:bg-white/10 hover:text-white" : ""}
                ${today && !isSelected && isCurrentMonth ? "ring-1 ring-emerald-500/50" : ""}
              `}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
