import { AppError } from "../errors/AppError.js";
type Definition = readonly [number, string, string];
const unique: Readonly<Record<string, Definition>> = {
  uq_student_registry_student_code: [
    409,
    "STUDENT_REGISTRY_CODE_EXISTS",
    "Mã số sinh viên đã có trong danh sách xác minh",
  ],
  uq_student_registry_email: [
    409,
    "STUDENT_REGISTRY_EMAIL_EXISTS",
    "Email đã có trong danh sách xác minh",
  ],
  uq_student_registry_claimed_user: [
    409,
    "STUDENT_REGISTRY_ALREADY_CLAIMED",
    "Tài khoản đã claim một hồ sơ xác minh",
  ],
  uq_payments_pending_invoice: [
    409,
    "PAYMENT_ALREADY_PENDING",
    "Hóa đơn đã có thanh toán chờ xác nhận",
  ],
  uq_users_username: [
    409,
    "USERNAME_ALREADY_EXISTS",
    "Tên đăng nhập đã tồn tại",
  ],
  uq_users_email: [409, "EMAIL_ALREADY_EXISTS", "Email đã tồn tại"],
  uq_students_mssv: [409, "MSSV_ALREADY_EXISTS", "Mã số sinh viên đã tồn tại"],
  uq_students_user_id: [
    409,
    "STUDENT_ALREADY_EXISTS",
    "Tài khoản đã có hồ sơ sinh viên",
  ],
  uq_staff_user_id: [
    409,
    "STAFF_ALREADY_EXISTS",
    "Tài khoản đã có hồ sơ nhân viên",
  ],
  uq_rooms_building_room_number: [
    409,
    "ROOM_NUMBER_ALREADY_EXISTS",
    "Số phòng đã tồn tại trong tòa nhà",
  ],
  uq_beds_room_bed_number: [
    409,
    "BED_NUMBER_ALREADY_EXISTS",
    "Số giường đã tồn tại trong phòng",
  ],
  uq_equipment_items_serial_number: [
    409,
    "EQUIPMENT_SERIAL_ALREADY_EXISTS",
    "Số serial thiết bị đã tồn tại",
  ],
  uq_contracts_open_student: [
    409,
    "STUDENT_ALREADY_HAS_ACTIVE_CONTRACT",
    "Sinh viên đã có hợp đồng chờ duyệt hoặc đang hoạt động",
  ],
  uq_contracts_active_bed: [
    409,
    "BED_NOT_AVAILABLE",
    "Giường không còn khả dụng",
  ],
  uq_room_change_requests_pending_student: [
    409,
    "ROOM_CHANGE_REQUEST_ALREADY_PENDING",
    "Sinh viên đã có yêu cầu chuyển phòng chờ xử lý",
  ],
  uq_checkout_requests_pending_student: [
    409,
    "CHECKOUT_REQUEST_ALREADY_PENDING",
    "Sinh viên đã có yêu cầu trả phòng chờ xử lý",
  ],
  uq_monthly_billings_room_period: [
    409,
    "MONTHLY_BILLING_ALREADY_EXISTS",
    "Phòng đã có kỳ hóa đơn này",
  ],
  uq_utility_readings_room_period: [
    409,
    "UTILITY_READING_ALREADY_EXISTS",
    "Phòng đã có chỉ số trong kỳ này",
  ],
  uq_utility_readings_monthly_billing: [
    409,
    "UTILITY_READING_ALREADY_EXISTS",
    "Kỳ hóa đơn đã có chỉ số chính thức",
  ],
  uq_invoices_monthly_billing_id_contract_id: [
    409,
    "INVOICE_ALREADY_EXISTS",
    "Hợp đồng đã có hóa đơn trong kỳ này",
  ],
  uq_invoice_items_invoice_id_type: [
    409,
    "INVOICE_ITEM_ALREADY_EXISTS",
    "Hóa đơn đã có khoản thu này",
  ],
  uq_notification_recipients_notification_id_student_id: [
    409,
    "NOTIFICATION_RECIPIENT_ALREADY_EXISTS",
    "Sinh viên đã nhận thông báo này",
  ],
  uq_room_preferences_student_id: [
    409,
    "ROOM_PREFERENCE_ALREADY_EXISTS",
    "Sinh viên đã có tùy chọn phòng",
  ],
  uq_class_schedules_student_id: [
    409,
    "CLASS_SCHEDULE_ALREADY_EXISTS",
    "Sinh viên đã có thời khóa biểu",
  ],
};
const foreign: Readonly<Record<string, Definition>> = {
  fk_contracts_bed_room: [
    409,
    "CONTRACT_ROOM_MISMATCH",
    "Giường không thuộc phòng của hợp đồng",
  ],
};
const checks: Readonly<Record<string, Definition>> = {
  ck_contracts_date_range: [
    400,
    "INVALID_DATE_RANGE",
    "Ngày kết thúc phải sau ngày bắt đầu",
  ],
  ck_utility_readings_electricity_chain: [
    400,
    "INVALID_METER_READING",
    "Chỉ số hiện tại không được nhỏ hơn chỉ số trước",
  ],
  ck_utility_readings_water_chain: [
    400,
    "INVALID_METER_READING",
    "Chỉ số hiện tại không được nhỏ hơn chỉ số trước",
  ],
};
export const constraintErrors = {
  "23505": unique,
  "23503": foreign,
  "23514": checks,
} as const;
export function translatePostgresError(error: unknown): AppError | undefined {
  if (error instanceof AppError) return error;
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string"
  )
    return;
  const code = error.code;
  const constraint =
    "constraint" in error && typeof error.constraint === "string"
      ? error.constraint
      : "";
  const catalog = constraintErrors[code as keyof typeof constraintErrors];
  const known =
    catalog && Object.hasOwn(catalog, constraint)
      ? catalog[constraint]
      : undefined;
  if (known) return new AppError(...known);
  switch (code) {
    case "23505":
      return new AppError(409, "VALIDATION_ERROR", "Dữ liệu bị trùng");
    case "23001":
    case "23503":
      return new AppError(
        409,
        "REFERENCE_CONFLICT",
        "Dữ liệu tham chiếu không tồn tại hoặc đang được sử dụng",
      );
    case "23502":
    case "23514":
    case "22003":
    case "22001":
      return new AppError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ");
    case "22P02":
      return new AppError(
        400,
        "VALIDATION_ERROR",
        "Dữ liệu không đúng định dạng",
      );
    case "40001":
    case "40P01":
    case "55P03":
      return new AppError(
        409,
        "CONCURRENT_MODIFICATION",
        "Dữ liệu vừa thay đổi; vui lòng thử lại",
      );
    case "08000":
    case "08001":
    case "08003":
    case "08006":
    case "57P01":
    case "53300":
      return new AppError(
        503,
        "DATABASE_UNAVAILABLE",
        "Cơ sở dữ liệu tạm thời không khả dụng",
      );
    default:
      return undefined;
  }
}
