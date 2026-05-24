export interface Appointment {
  id: string;
  user_id: string;
  date: string;
  time: string;
  service: string;
  service_id: string | null;
  notes: string | null;
  status: "confirmed" | "cancelled" | "completed";
  recurring: boolean;
  recurring_end_date: string | null;
  created_at: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Availability {
  id: string;
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
  slot_duration: number;
}

export interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  is_active: boolean;
}

export interface Profile {
  id: string;
  is_admin: boolean;
}

export const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
