export type Role = "admin" | "lead" | "staff" | "employee" | "volunteer";

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
  email?: string | null;
  telephone?: string | null;
  opt_out_email?: number | null;
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
  default_mileage?: number | null;
  // Emergency contact
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  // Household information
  household_size?: number | null;
  household_income_range?: string | null;
  household_composition?: string | null;
  // Delivery preferences
  preferred_delivery_times?: string | null;
  delivery_restrictions?: string | null;
  preferred_driver_id?: string | null;
  seasonal_delivery_pattern?: string | null;
  // Approval workflow
  approval_date?: string | null;
  approved_by_user_id?: string | null;
  approval_expires_on?: string | null;
  last_reapproval_date?: string | null;
  requires_reapproval?: number | null;
};

export type ClientApprovalHistoryRow = {
  id: string;
  client_id: string;
  old_status?: string | null;
  new_status: string;
  changed_by_user_id?: string | null;
  reason?: string | null;
  notes?: string | null;
  created_at: string;
};

export type ClientCommunicationRow = {
  id: string;
  client_id: string;
  communication_type: string;
  direction: string;
  subject?: string | null;
  message?: string | null;
  contacted_by_user_id?: string | null;
  created_at: string;
  notes?: string | null;
};

export type ClientFeedbackRow = {
  id: string;
  client_id: string;
  work_order_id?: string | null;
  feedback_type: string;
  rating?: number | null;
  comments?: string | null;
  responded_to: number;
  responded_by_user_id?: string | null;
  response_notes?: string | null;
  created_at: string;
};

// Client API Input Types
export type CreateClientCommunicationInput = {
  client_id: string;
  communication_type: string;
  direction: string;
  subject?: string | null;
  message?: string | null;
  contacted_by_user_id?: string | null;
  notes?: string | null;
};

export type CreateClientFeedbackInput = {
  client_id: string;
  work_order_id?: string | null;
  feedback_type: string;
  rating?: number | null;
  comments?: string | null;
};

export type RespondToFeedbackInput = {
  id: string;
  response_notes: string;
  responded_by_user_id: string;
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
  work_hours?: number | null;
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
  pickup_delivery_type?: string | null;
  pickup_quantity_cords?: number | null;
  pickup_length?: number | null;
  pickup_width?: number | null;
  pickup_height?: number | null;
  pickup_units?: string | null;
  assignees_json?: string | null;
  created_by_display?: string | null;
  created_at?: string | null;
  paired_order_id?: string | null;
  client_id?: string | null;
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
  entity?: string | null;
  entity_id?: string | null;
  field?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  created_at: string;
};

export type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  category: string;
  vendor?: string | null;
  receipt_path?: string | null;
  expense_date: string;
  work_order_id?: string | null;
  recorded_by_user_id: string;
  notes?: string | null;
  created_at: string;
};

export type DonationRow = {
  id: string;
  donor_name?: string | null;
  donor_contact?: string | null;
  donation_type: string;
  description: string;
  quantity?: number | null;
  unit?: string | null;
  monetary_value?: number | null;
  received_date: string;
  recorded_by_user_id: string;
  notes?: string | null;
  created_at: string;
};

export type TimeEntryRow = {
  id: string;
  user_id: string;
  work_order_id?: string | null;
  activity_type: string;
  hours_worked: number;
  is_volunteer_time: number;
  hourly_rate?: number | null;
  date_worked: string;
  recorded_by_user_id: string;
  notes?: string | null;
  created_at: string;
};

export type BudgetCategoryRow = {
  id: string;
  name: string;
  description?: string | null;
  annual_budget?: number | null;
  category_type: string;
  is_active: number;
};

export type WorkOrderStatusHistoryRow = {
  id: string;
  work_order_id: string;
  old_status?: string | null;
  new_status: string;
  changed_by_user_id?: string | null;
  change_reason?: string | null;
  mileage_recorded?: number | null;
  work_hours_recorded?: number | null;
  changed_at: string;
};
