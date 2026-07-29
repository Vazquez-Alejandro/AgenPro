"use client";

import { Clock } from "lucide-react";

interface TimeSlotsProps {
  selectedTime: string | null;
  onSelect: (time: string) => void;
  disabledSlots: string[];
  timeSlots: string[];
}

export default function TimeSlots({
  selectedTime,
  onSelect,
  disabledSlots,
  timeSlots,
}: TimeSlotsProps) {
  if (timeSlots.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-medium text-white/70">
            Horarios Disponibles
          </h3>
        </div>
        <p className="text-sm text-white/30 text-center py-4">
          No hay horarios disponibles para este día
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-medium text-white/70">
          Horarios Disponibles
        </h3>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {timeSlots.map((time) => {
          const isDisabled = disabledSlots.includes(time);
          const isSelected = selectedTime === time;

          return (
            <button
              key={time}
              onClick={() => !isDisabled && onSelect(time)}
              disabled={isDisabled}
              className={`
                py-3 px-4 rounded-xl text-sm font-medium transition-all
                ${
                  isSelected
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25 ring-2 ring-amber-400"
                    : ""
                }
                ${
                  !isSelected && !isDisabled
                    ? "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
                    : ""
                }
                ${
                  isDisabled
                    ? "bg-white/[0.02] text-white/15 cursor-not-allowed line-through"
                    : ""
                }
              `}
            >
              {time}
            </button>
          );
        })}
      </div>
    </div>
  );
}
