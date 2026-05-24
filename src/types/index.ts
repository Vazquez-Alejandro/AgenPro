export interface Appointment {
  id: string;
  user_id: string;
  date: string;
  time: string;
  service: string;
  notes: string | null;
  status: "confirmed" | "cancelled" | "completed";
  created_at: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}
