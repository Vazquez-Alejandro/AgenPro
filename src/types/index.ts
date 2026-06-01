export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  subscription_status: string;
  turnos_limit: number;
  staff_limit: number;
  created_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string | null;
  role: "owner" | "admin" | "staff";
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  service_id: string | null;
  service: string | null;
  notes: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  payment_status: "unpaid" | "paid" | "refunded";
  payment_method: string | null;
  payment_id: string | null;
  amount_paid: number;
  is_recurring: boolean;
  recurring_end_date: string | null;
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
  created_at: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Availability {
  id: string;
  tenant_id: string | null;
  day_of_week: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
  slot_duration: number;
}

export interface BlockedDate {
  id: string;
  tenant_id: string | null;
  date: string;
  reason: string | null;
}

export interface Service {
  id: string;
  tenant_id: string | null;
  name: string;
  duration: number;
  price: number;
  active: boolean;
}

export interface PlanDefinition {
  name: string;
  max_turnos: number;
  max_staff: number;
  price_monthly_cents: number;
  description: string;
}

export const PLAN_LIMITS: Record<string, { appointments: number; staff: number }> = {
  free: { appointments: 30, staff: 1 },
  inicial: { appointments: 100, staff: 1 },
  profesional: { appointments: 500, staff: 5 },
  premium: { appointments: 999999, staff: 999999 },
};

export const DAY_NAMES = [
  "Domingo", "Lunes", "Martes", "Miércoles",
  "Jueves", "Viernes", "Sábado",
];
