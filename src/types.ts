export type Role = "admin" | "lead" | "staff" | "volunteer";

export type UserSession = {
  userId: string;
  name: string;
  username: string;
  role: Role;
  hipaaCertified?: boolean;
  isDriver?: boolean;
  email?: string;
  telephone?: string | null;
};

export type ClientRow = {
  id: string;
  name: string;
  client_title?: string | null;
  email?: string | null;
  telephone?: string | null;
  approval_status: string;
  physical_address_line1: string;
  physical_address_line2?: string | null;
  physical_address_city: string;
  physical_address_state: string;
  physical_address_postal_code: string;
  mailing_address_line1?: string | null;
  mailing_address_line2?: string | null;
  mailing_address_city?: string | null;
  mailing_address_state?: string | null;
  mailing_address_postal_code?: string | null;
  how_did_they_hear_about_us?: string | null;
  referring_agency?: string | null;
  denial_reason?: string | null;
  date_of_onboarding?: string | null;
  gate_combo?: string | null;
  notes?: string | null;
  wood_size_label?: string | null;
  wood_size_other?: string | null;
  directions?: string | null;
  created_at?: string | null;
};

export type ClientConflictRow = {
  id: string;
  name: string;
  physical_address_line1: string;
  physical_address_city: string;
  physical_address_state: string;
};

export type InventoryRow = {
  id: string;
  name: string;
  category?: string | null;
  quantity_on_hand: number;
  unit: string;
  reorder_threshold: number;
  reorder_amount?: number | null;
  notes?: string | null;
  reserved_quantity: number;
};

export type WorkOrderRow = {
  id: string;
  client_name: string;
  status: string;
  scheduled_date?: string | null;
  gate_combo?: string | null;
  notes?: string | null;
  mileage?: number | null;
  town?: string | null;
  telephone?: string | null;
  physical_address_line1?: string | null;
  physical_address_city?: string | null;
  physical_address_state?: string | null;
  physical_address_postal_code?: string | null;
  wood_size_label?: string | null;
  wood_size_other?: string | null;
  delivery_size_label?: string | null;
  delivery_size_cords?: number | null;
  pickup_quantity_cords?: number | null;
  pickup_length?: number | null;
  pickup_width?: number | null;
  pickup_height?: number | null;
  pickup_units?: string | null;
  assignees_json?: string | null;
  created_by_display?: string | null;
};

export type UserRow = {
  id: string;
  name: string;
  email?: string | null;
  telephone?: string | null;
  physical_address_line1?: string | null;
  physical_address_line2?: string | null;
  physical_address_city?: string | null;
  physical_address_state?: string | null;
  physical_address_postal_code?: string | null;
  mailing_address_line1?: string | null;
  mailing_address_line2?: string | null;
  mailing_address_city?: string | null;
  mailing_address_state?: string | null;
  mailing_address_postal_code?: string | null;
  role: Role;
  availability_notes?: string | null;
  availability_schedule?: string | null;
  driver_license_status?: string | null;
  driver_license_number?: string | null;
  driver_license_expires_on?: string | null;
  vehicle?: string | null;
  is_driver?: boolean | null;
  hipaa_certified?: number;
};

export type LoginResponse = {
  user_id: string;
  name: string;
  username: string;
  role: Role;
  email?: string | null;
  telephone?: string | null;
  hipaa_certified: number;
  is_driver: number;
};

export type DeliveryEventRow = {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date?: string | null;
  work_order_id?: string | null;
  color_code?: string | null;
  assigned_user_ids_json?: string | null;
};

export type MotdRow = {
  id: string;
  message: string;
  active_from?: string | null;
  active_to?: string | null;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  event: string;
  role?: string | null;
  actor?: string | null;
  created_at: string;
};
