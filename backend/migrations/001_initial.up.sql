CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_users PRIMARY KEY,
  username text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  avatar_url text,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_users_username_nonempty CHECK (length(username) > 0),
  CONSTRAINT ck_users_password_hash_nonempty CHECK (length(password_hash) > 0),
  CONSTRAINT ck_users_role CHECK (role IN ('STUDENT', 'ADMIN', 'STAFF')),
  CONSTRAINT ck_users_role_nonempty CHECK (length(role) > 0),
  CONSTRAINT ck_users_full_name_nonempty CHECK (length(full_name) > 0),
  CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'LOCKED')),
  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE students (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_students PRIMARY KEY,
  user_id uuid NOT NULL,
  mssv text NOT NULL,
  class_name text,
  faculty text,
  gender text,
  dob timestamptz,
  cccd text,
  permanent_address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_students_mssv_nonempty CHECK (length(mssv) > 0),
  CONSTRAINT ck_students_gender CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  CONSTRAINT uq_students_user_id UNIQUE (user_id),
  CONSTRAINT uq_students_mssv UNIQUE (mssv)
);

CREATE TABLE staff (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_staff PRIMARY KEY,
  user_id uuid NOT NULL,
  position text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_staff_position CHECK (position IN ('MAINTENANCE', 'SECURITY', 'RECEPTIONIST', 'MANAGER')),
  CONSTRAINT ck_staff_position_nonempty CHECK (length(position) > 0),
  CONSTRAINT uq_staff_user_id UNIQUE (user_id)
);

CREATE TABLE buildings (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_buildings PRIMARY KEY,
  name text NOT NULL,
  address text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_buildings_name_nonempty CHECK (length(name) > 0)
);

CREATE TABLE room_types (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_room_types PRIMARY KEY,
  name text NOT NULL,
  capacity integer NOT NULL,
  price_per_month numeric NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_room_types_name_nonempty CHECK (length(name) > 0),
  CONSTRAINT ck_room_types_capacity CHECK (capacity >= 1),
  CONSTRAINT ck_room_types_price_per_month CHECK (price_per_month >= 0 AND price_per_month BETWEEN -9007199254740991 AND 9007199254740991)
);

CREATE TABLE rooms (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_rooms PRIMARY KEY,
  building_id uuid NOT NULL,
  room_type_id uuid NOT NULL,
  room_number text NOT NULL,
  floor integer NOT NULL,
  status text NOT NULL DEFAULT 'AVAILABLE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_rooms_room_number_nonempty CHECK (length(room_number) > 0),
  CONSTRAINT ck_rooms_floor CHECK (floor >= 0),
  CONSTRAINT ck_rooms_status CHECK (status IN ('AVAILABLE', 'FULL', 'MAINTENANCE', 'LOCKED')),
  CONSTRAINT uq_rooms_building_room_number UNIQUE (building_id, room_number)
);

CREATE TABLE room_billing_cursors (
  room_id uuid CONSTRAINT pk_room_billing_cursors PRIMARY KEY,
  latest_finalized_billing_period varchar(7) DEFAULT NULL,
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_room_billing_cursors_latest_finalized_billing_period CHECK (latest_finalized_billing_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

CREATE TABLE beds (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_beds PRIMARY KEY,
  room_id uuid NOT NULL,
  bed_number text NOT NULL,
  status text NOT NULL DEFAULT 'EMPTY',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_beds_bed_number_nonempty CHECK (length(bed_number) > 0),
  CONSTRAINT ck_beds_status CHECK (status IN ('EMPTY', 'OCCUPIED')),
  CONSTRAINT uq_beds_room_bed_number UNIQUE (room_id, bed_number),
  CONSTRAINT uq_beds_id_room UNIQUE (id, room_id)
);

CREATE TABLE equipment_categories (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_equipment_categories PRIMARY KEY,
  name text NOT NULL,
  unit text NOT NULL,
  default_lifespan_months integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_equipment_categories_name_nonempty CHECK (length(name) > 0),
  CONSTRAINT ck_equipment_categories_unit_nonempty CHECK (length(unit) > 0),
  CONSTRAINT ck_equipment_categories_default_lifespan_months CHECK (default_lifespan_months >= 1)
);

CREATE TABLE equipment_items (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_equipment_items PRIMARY KEY,
  category_id uuid NOT NULL,
  room_id uuid NOT NULL,
  serial_number text,
  condition text NOT NULL DEFAULT 'NEW',
  purchase_date timestamptz,
  purchase_price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_equipment_items_condition CHECK (condition IN ('NEW', 'GOOD', 'DAMAGED', 'BROKEN', 'LOST')),
  CONSTRAINT ck_equipment_items_purchase_price CHECK (purchase_price >= 0 AND purchase_price BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT uq_equipment_items_serial_number UNIQUE (serial_number)
);

CREATE TABLE contracts (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_contracts PRIMARY KEY,
  student_id uuid NOT NULL,
  bed_id uuid NOT NULL,
  room_id uuid NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text NOT NULL,
  reject_reason text,
  cancel_reason text,
  approved_by uuid,
  approved_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_contracts_status CHECK (status IN ('PENDING', 'ACTIVE', 'ENDED', 'CANCELLED', 'REJECTED')),
  CONSTRAINT ck_contracts_status_nonempty CHECK (length(status) > 0),
  CONSTRAINT ck_contracts_date_range CHECK (end_date > start_date)
);

CREATE TABLE room_change_requests (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_room_change_requests PRIMARY KEY,
  student_id uuid NOT NULL,
  current_contract_id uuid NOT NULL,
  target_bed_id uuid NOT NULL,
  reason text,
  status text NOT NULL,
  processed_by uuid,
  processed_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_room_change_requests_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  CONSTRAINT ck_room_change_requests_status_nonempty CHECK (length(status) > 0)
);

CREATE TABLE checkout_requests (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_checkout_requests PRIMARY KEY,
  student_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  room_id uuid NOT NULL,
  reason text,
  status text NOT NULL,
  processed_by uuid,
  processed_at timestamptz,
  reject_reason text,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_checkout_requests_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  CONSTRAINT ck_checkout_requests_status_nonempty CHECK (length(status) > 0)
);

CREATE TABLE maintenance_requests (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_maintenance_requests PRIMARY KEY,
  student_id uuid NOT NULL,
  room_id uuid NOT NULL,
  equipment_item_id uuid,
  category text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  assigned_staff_id uuid,
  processing_started_at timestamptz,
  resolved_at timestamptz,
  resolution_note text,
  resolution_method text,
  resolution_reason text,
  resolution_cost numeric,
  damage_cause text,
  damage_cause_detail text,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_maintenance_requests_category CHECK (category IN ('ELECTRICAL', 'PLUMBING', 'FURNITURE', 'APPLIANCE', 'OTHER')),
  CONSTRAINT ck_maintenance_requests_category_nonempty CHECK (length(category) > 0),
  CONSTRAINT ck_maintenance_requests_description_length CHECK (length(description) <= 2000),
  CONSTRAINT ck_maintenance_requests_description_nonempty CHECK (length(description) > 0),
  CONSTRAINT ck_maintenance_requests_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED')),
  CONSTRAINT ck_maintenance_requests_resolution_method CHECK (resolution_method IN ('REPAIR', 'REPLACE')),
  CONSTRAINT ck_maintenance_requests_resolution_reason_length CHECK (length(resolution_reason) <= 2000),
  CONSTRAINT ck_maintenance_requests_resolution_cost CHECK (resolution_cost >= 0 AND resolution_cost BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_maintenance_requests_damage_cause CHECK (damage_cause IN ('WEAR_AND_TEAR', 'STUDENT_CAUSED', 'OTHER')),
  CONSTRAINT ck_maintenance_requests_damage_cause_detail_length CHECK (length(damage_cause_detail) <= 1000)
);

CREATE TABLE notifications (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_notifications PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  target_scope text NOT NULL,
  target_building_id uuid,
  target_student_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_notifications_title_length CHECK (length(title) <= 200),
  CONSTRAINT ck_notifications_title_nonempty CHECK (length(title) > 0),
  CONSTRAINT ck_notifications_content_length CHECK (length(content) <= 2000),
  CONSTRAINT ck_notifications_content_nonempty CHECK (length(content) > 0),
  CONSTRAINT ck_notifications_target_scope CHECK (target_scope IN ('ALL', 'BUILDING', 'SPECIFIC_STUDENT')),
  CONSTRAINT ck_notifications_target_scope_nonempty CHECK (length(target_scope) > 0)
);

CREATE TABLE notification_recipients (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_notification_recipients PRIMARY KEY,
  notification_id uuid NOT NULL,
  student_id uuid NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_recipients_notification_id_student_id UNIQUE (notification_id, student_id)
);

CREATE TABLE room_preferences (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_room_preferences PRIMARY KEY,
  student_id uuid NOT NULL,
  price_preference text,
  wants_hot_water boolean DEFAULT NULL,
  occupancy_preference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_room_preferences_price_preference CHECK (price_preference IN ('LOW', 'MEDIUM', 'ANY')),
  CONSTRAINT ck_room_preferences_occupancy_preference CHECK (occupancy_preference IN ('MORE_EMPTY', 'MORE_OCCUPIED', 'ANY')),
  CONSTRAINT uq_room_preferences_student_id UNIQUE (student_id)
);

CREATE TABLE class_schedules (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_class_schedules PRIMARY KEY,
  student_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_class_schedules_student_id UNIQUE (student_id)
);

CREATE TABLE monthly_billings (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_monthly_billings PRIMARY KEY,
  room_id uuid NOT NULL,
  billing_period varchar(7) NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  draft_electricity_previous numeric NOT NULL,
  draft_electricity_current numeric NOT NULL,
  draft_water_previous numeric NOT NULL,
  draft_water_current numeric NOT NULL,
  building_name_snapshot text,
  room_number_snapshot text,
  electricity_previous numeric,
  electricity_current numeric,
  electricity_usage numeric,
  electricity_unit_price numeric,
  electricity_amount numeric,
  water_previous numeric,
  water_current numeric,
  water_usage numeric,
  water_unit_price numeric,
  water_amount numeric,
  wifi_fee numeric,
  trash_fee numeric,
  shared_service_total numeric,
  total_invoice_amount numeric,
  finalized_by uuid,
  finalized_at timestamptz,
  cancelled_by uuid,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_monthly_billings_billing_period CHECK (billing_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT ck_monthly_billings_billing_period_nonempty CHECK (length(billing_period) > 0),
  CONSTRAINT ck_monthly_billings_status CHECK (status IN ('DRAFT', 'FINALIZED', 'CANCELLED')),
  CONSTRAINT ck_monthly_billings_status_nonempty CHECK (length(status) > 0),
  CONSTRAINT ck_monthly_billings_draft_electricity_previous CHECK (draft_electricity_previous >= 0 AND draft_electricity_previous BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_draft_electricity_current CHECK (draft_electricity_current >= 0 AND draft_electricity_current BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_draft_water_previous CHECK (draft_water_previous >= 0 AND draft_water_previous BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_draft_water_current CHECK (draft_water_current >= 0 AND draft_water_current BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_electricity_previous CHECK (electricity_previous >= 0 AND electricity_previous BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_electricity_current CHECK (electricity_current >= 0 AND electricity_current BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_electricity_usage CHECK (electricity_usage >= 0 AND electricity_usage BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_electricity_unit_price CHECK (electricity_unit_price >= 0 AND electricity_unit_price BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_electricity_amount CHECK (electricity_amount >= 0 AND electricity_amount BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_water_previous CHECK (water_previous >= 0 AND water_previous BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_water_current CHECK (water_current >= 0 AND water_current BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_water_usage CHECK (water_usage >= 0 AND water_usage BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_water_unit_price CHECK (water_unit_price >= 0 AND water_unit_price BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_water_amount CHECK (water_amount >= 0 AND water_amount BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_wifi_fee CHECK (wifi_fee >= 0 AND wifi_fee BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_trash_fee CHECK (trash_fee >= 0 AND trash_fee BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_shared_service_total CHECK (shared_service_total >= 0 AND shared_service_total BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_monthly_billings_total_invoice_amount CHECK (total_invoice_amount >= 0 AND total_invoice_amount BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT uq_monthly_billings_room_period UNIQUE (room_id, billing_period)
);

CREATE TABLE utility_readings (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_utility_readings PRIMARY KEY,
  room_id uuid NOT NULL,
  billing_period varchar(7) NOT NULL,
  electricity_previous numeric NOT NULL,
  electricity_current numeric NOT NULL,
  electricity_usage numeric NOT NULL,
  electricity_unit_price numeric NOT NULL,
  electricity_amount numeric NOT NULL,
  water_previous numeric NOT NULL,
  water_current numeric NOT NULL,
  water_usage numeric NOT NULL,
  water_unit_price numeric NOT NULL,
  water_amount numeric NOT NULL,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  monthly_billing_id uuid NOT NULL,
  CONSTRAINT ck_utility_readings_billing_period CHECK (billing_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT ck_utility_readings_billing_period_nonempty CHECK (length(billing_period) > 0),
  CONSTRAINT ck_utility_readings_electricity_previous CHECK (electricity_previous >= 0 AND electricity_previous BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_utility_readings_electricity_current CHECK (electricity_current >= 0 AND electricity_current BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_utility_readings_electricity_usage CHECK (electricity_usage >= 0 AND electricity_usage BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_utility_readings_electricity_unit_price CHECK (electricity_unit_price >= 0 AND electricity_unit_price BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_utility_readings_electricity_amount CHECK (electricity_amount >= 0 AND electricity_amount BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_utility_readings_water_previous CHECK (water_previous >= 0 AND water_previous BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_utility_readings_water_current CHECK (water_current >= 0 AND water_current BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_utility_readings_water_usage CHECK (water_usage >= 0 AND water_usage BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_utility_readings_water_unit_price CHECK (water_unit_price >= 0 AND water_unit_price BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_utility_readings_water_amount CHECK (water_amount >= 0 AND water_amount BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT uq_utility_readings_room_period UNIQUE (room_id, billing_period),
  CONSTRAINT uq_utility_readings_monthly_billing UNIQUE (monthly_billing_id),
  CONSTRAINT ck_utility_readings_electricity_chain CHECK (electricity_current >= electricity_previous),
  CONSTRAINT ck_utility_readings_water_chain CHECK (water_current >= water_previous)
);

CREATE TABLE invoices (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_invoices PRIMARY KEY,
  monthly_billing_id uuid NOT NULL,
  student_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  billing_period varchar(7) NOT NULL,
  status text NOT NULL,
  building_name_snapshot text NOT NULL,
  room_number_snapshot text NOT NULL,
  student_full_name_snapshot text NOT NULL,
  mssv_snapshot text NOT NULL,
  resident_days integer NOT NULL,
  days_in_month integer NOT NULL,
  room_monthly_price numeric NOT NULL,
  room_fee numeric NOT NULL,
  electricity_share numeric NOT NULL,
  water_share numeric NOT NULL,
  wifi_share numeric NOT NULL,
  trash_share numeric NOT NULL,
  total_amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_invoices_billing_period CHECK (billing_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT ck_invoices_billing_period_nonempty CHECK (length(billing_period) > 0),
  CONSTRAINT ck_invoices_status CHECK (status IN ('UNPAID', 'CANCELLED')),
  CONSTRAINT ck_invoices_status_nonempty CHECK (length(status) > 0),
  CONSTRAINT ck_invoices_building_name_snapshot_nonempty CHECK (length(building_name_snapshot) > 0),
  CONSTRAINT ck_invoices_room_number_snapshot_nonempty CHECK (length(room_number_snapshot) > 0),
  CONSTRAINT ck_invoices_student_full_name_snapshot_nonempty CHECK (length(student_full_name_snapshot) > 0),
  CONSTRAINT ck_invoices_mssv_snapshot_nonempty CHECK (length(mssv_snapshot) > 0),
  CONSTRAINT ck_invoices_resident_days CHECK (resident_days >= 1),
  CONSTRAINT ck_invoices_days_in_month CHECK (days_in_month >= 1),
  CONSTRAINT ck_invoices_room_monthly_price CHECK (room_monthly_price >= 0 AND room_monthly_price BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_invoices_room_fee CHECK (room_fee >= 0 AND room_fee BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_invoices_electricity_share CHECK (electricity_share >= 0 AND electricity_share BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_invoices_water_share CHECK (water_share >= 0 AND water_share BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_invoices_wifi_share CHECK (wifi_share >= 0 AND wifi_share BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_invoices_trash_share CHECK (trash_share >= 0 AND trash_share BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_invoices_total_amount CHECK (total_amount >= 0 AND total_amount BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT uq_invoices_monthly_billing_id_contract_id UNIQUE (monthly_billing_id, contract_id)
);

CREATE TABLE invoice_items (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_invoice_items PRIMARY KEY,
  invoice_id uuid NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  calculation_note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_invoice_items_type CHECK (type IN ('ROOM_FEE', 'ELECTRICITY', 'WATER', 'WIFI', 'TRASH')),
  CONSTRAINT ck_invoice_items_type_nonempty CHECK (length(type) > 0),
  CONSTRAINT ck_invoice_items_description_nonempty CHECK (length(description) > 0),
  CONSTRAINT ck_invoice_items_amount CHECK (amount >= 0 AND amount BETWEEN -9007199254740991 AND 9007199254740991),
  CONSTRAINT ck_invoice_items_calculation_note_nonempty CHECK (length(calculation_note) > 0),
  CONSTRAINT uq_invoice_items_invoice_id_type UNIQUE (invoice_id, type)
);

CREATE TABLE class_schedule_entries (
 id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_class_schedule_entries PRIMARY KEY,
 schedule_id uuid NOT NULL CONSTRAINT fk_class_schedule_entries_schedule REFERENCES class_schedules(id) ON DELETE CASCADE,
 ordinal integer NOT NULL CONSTRAINT ck_class_schedule_entries_ordinal CHECK (ordinal >= 0),
 day_of_week text NOT NULL CONSTRAINT ck_class_schedule_entries_day CHECK (day_of_week IN ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY')),
 start_period integer NOT NULL, end_period integer NOT NULL,
 CONSTRAINT ck_class_schedule_entries_period CHECK (start_period >= 1 AND end_period >= start_period),
 CONSTRAINT uq_class_schedule_entries_order UNIQUE (schedule_id, ordinal)
);

ALTER TABLE students ADD CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE staff ADD CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE rooms ADD CONSTRAINT fk_rooms_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT;

ALTER TABLE rooms ADD CONSTRAINT fk_rooms_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT;

ALTER TABLE room_billing_cursors ADD CONSTRAINT fk_room_billing_cursors_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

ALTER TABLE beds ADD CONSTRAINT fk_beds_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;

ALTER TABLE equipment_items ADD CONSTRAINT fk_equipment_items_category FOREIGN KEY (category_id) REFERENCES equipment_categories(id) ON DELETE RESTRICT;

ALTER TABLE equipment_items ADD CONSTRAINT fk_equipment_items_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;

ALTER TABLE contracts ADD CONSTRAINT fk_contracts_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;

ALTER TABLE contracts ADD CONSTRAINT fk_contracts_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;

ALTER TABLE contracts ADD CONSTRAINT fk_contracts_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE contracts ADD CONSTRAINT fk_contracts_bed_room FOREIGN KEY (bed_id, room_id) REFERENCES beds(id, room_id) ON DELETE RESTRICT;

ALTER TABLE room_change_requests ADD CONSTRAINT fk_room_change_requests_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;

ALTER TABLE room_change_requests ADD CONSTRAINT fk_room_change_requests_current_contract FOREIGN KEY (current_contract_id) REFERENCES contracts(id) ON DELETE RESTRICT;

ALTER TABLE room_change_requests ADD CONSTRAINT fk_room_change_requests_target_bed FOREIGN KEY (target_bed_id) REFERENCES beds(id) ON DELETE RESTRICT;

ALTER TABLE room_change_requests ADD CONSTRAINT fk_room_change_requests_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE checkout_requests ADD CONSTRAINT fk_checkout_requests_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;

ALTER TABLE checkout_requests ADD CONSTRAINT fk_checkout_requests_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT;

ALTER TABLE checkout_requests ADD CONSTRAINT fk_checkout_requests_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;

ALTER TABLE checkout_requests ADD CONSTRAINT fk_checkout_requests_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE maintenance_requests ADD CONSTRAINT fk_maintenance_requests_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;

ALTER TABLE maintenance_requests ADD CONSTRAINT fk_maintenance_requests_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;

ALTER TABLE maintenance_requests ADD CONSTRAINT fk_maintenance_requests_equipment_item FOREIGN KEY (equipment_item_id) REFERENCES equipment_items(id) ON DELETE RESTRICT;

ALTER TABLE maintenance_requests ADD CONSTRAINT fk_maintenance_requests_assigned_staff FOREIGN KEY (assigned_staff_id) REFERENCES staff(id) ON DELETE RESTRICT;

ALTER TABLE notifications ADD CONSTRAINT fk_notifications_target_building FOREIGN KEY (target_building_id) REFERENCES buildings(id) ON DELETE RESTRICT;

ALTER TABLE notifications ADD CONSTRAINT fk_notifications_target_student FOREIGN KEY (target_student_id) REFERENCES students(id) ON DELETE RESTRICT;

ALTER TABLE notifications ADD CONSTRAINT fk_notifications_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE notification_recipients ADD CONSTRAINT fk_notification_recipients_notification FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE;

ALTER TABLE notification_recipients ADD CONSTRAINT fk_notification_recipients_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;

ALTER TABLE room_preferences ADD CONSTRAINT fk_room_preferences_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;

ALTER TABLE class_schedules ADD CONSTRAINT fk_class_schedules_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;

ALTER TABLE monthly_billings ADD CONSTRAINT fk_monthly_billings_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;

ALTER TABLE monthly_billings ADD CONSTRAINT fk_monthly_billings_finalized_by FOREIGN KEY (finalized_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE monthly_billings ADD CONSTRAINT fk_monthly_billings_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE utility_readings ADD CONSTRAINT fk_utility_readings_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;

ALTER TABLE utility_readings ADD CONSTRAINT fk_utility_readings_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE utility_readings ADD CONSTRAINT fk_utility_readings_monthly_billing FOREIGN KEY (monthly_billing_id) REFERENCES monthly_billings(id) ON DELETE RESTRICT;

ALTER TABLE invoices ADD CONSTRAINT fk_invoices_monthly_billing FOREIGN KEY (monthly_billing_id) REFERENCES monthly_billings(id) ON DELETE RESTRICT;

ALTER TABLE invoices ADD CONSTRAINT fk_invoices_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;

ALTER TABLE invoices ADD CONSTRAINT fk_invoices_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT;

ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

CREATE FUNCTION initialize_room_cursor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN INSERT INTO room_billing_cursors(room_id) VALUES (NEW.id); RETURN NEW; END $$;
CREATE TRIGGER initialize_room_cursor AFTER INSERT ON rooms FOR EACH ROW EXECUTE FUNCTION initialize_room_cursor();
INSERT INTO room_billing_cursors(room_id) SELECT id FROM rooms ON CONFLICT DO NOTHING;

