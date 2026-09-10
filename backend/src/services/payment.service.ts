import type {
  IPaymentRepository,
  PaymentInput,
  PaymentQuery,
} from "../repositories/interfaces/payment.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import type { ITransactionManager } from "./transaction-manager.js";
import { AppError } from "../errors/AppError.js";
import { mapPayment } from "../mappers/payment.mapper.js";
export class PaymentService {
  constructor(
    private payments: IPaymentRepository,
    private students: IStudentRepository,
    private tx: ITransactionManager,
  ) {}
  private async student(userId: string) {
    const s = await this.students.findByUserId(userId);
    if (!s)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    return s.id;
  }
  async list(q: PaymentQuery, userId?: string) {
    const r = await this.payments.list(
      q,
      userId ? await this.student(userId) : undefined,
    );
    return { ...r, items: r.items.map(mapPayment) };
  }
  async get(id: string, userId?: string) {
    const p = await this.payments.detail(
      id,
      userId ? await this.student(userId) : undefined,
    );
    if (!p)
      throw new AppError(404, "PAYMENT_NOT_FOUND", "Không tìm thấy thanh toán");
    return mapPayment(p);
  }
  async submit(userId: string, invoiceId: string, input: PaymentInput) {
    const studentId = await this.student(userId);
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0)
      throw new AppError(
        400,
        "INVALID_PAYMENT_AMOUNT",
        "Số tiền phải là số nguyên VND lớn hơn 0",
      );
    const p = await this.tx.runInTransaction(async (tx) => {
      const invoice = await this.payments.lockInvoice(invoiceId, tx);
      if (!invoice || invoice.studentId !== studentId)
        throw new AppError(404, "INVOICE_NOT_FOUND", "Không tìm thấy hóa đơn");
      if (
        invoice.status === "CANCELLED" ||
        invoice.billingStatus !== "FINALIZED"
      )
        throw new AppError(
          409,
          "INVOICE_NOT_PAYABLE",
          "Hóa đơn không thể thanh toán",
        );
      if (await this.payments.pending(invoiceId, tx))
        throw new AppError(
          409,
          "PAYMENT_ALREADY_PENDING",
          "Hóa đơn đã có thanh toán chờ xác nhận",
        );
      const remaining =
        invoice.totalAmount -
        (await this.payments.confirmedTotal(invoiceId, tx));
      if (input.amount > remaining)
        throw new AppError(
          409,
          "PAYMENT_EXCEEDS_REMAINING",
          "Số tiền vượt quá số còn lại",
        );
      return this.payments.create(invoiceId, userId, input, tx);
    });
    return this.get(p.id, userId);
  }
  async process(
    id: string,
    actor: string,
    action: "confirm" | "reject" | "void" | "cancel",
    reason?: string,
  ) {
    if (
      (action === "reject" || action === "void") &&
      (!reason?.trim() || reason.trim().length > 1000)
    )
      throw new AppError(
        400,
        "PAYMENT_REASON_REQUIRED",
        "Cần nhập lý do tối đa 1000 ký tự",
      );
    const studentId =
      action === "cancel" ? await this.student(actor) : undefined;
    // Immutable invoice_id lookup only. Lock invoice before locking payment.
    const snapshot = await this.payments.find(id);
    if (!snapshot)
      throw new AppError(404, "PAYMENT_NOT_FOUND", "Không tìm thấy thanh toán");
    await this.tx.runInTransaction(async (tx) => {
      const invoice = await this.payments.lockInvoice(snapshot.invoiceId, tx);
      if (!invoice || (studentId && invoice.studentId !== studentId))
        throw new AppError(
          404,
          "PAYMENT_NOT_FOUND",
          "Không tìm thấy thanh toán",
        );
      const payment = await this.payments.find(id, tx);
      const expected = action === "void" ? "CONFIRMED" : "PENDING";
      if (!payment || payment.status !== expected)
        throw new AppError(
          409,
          "PAYMENT_INVALID_STATUS",
          "Trạng thái thanh toán không cho phép thao tác này",
        );
      if (
        invoice.status === "CANCELLED" ||
        invoice.billingStatus !== "FINALIZED"
      )
        throw new AppError(
          409,
          "INVOICE_NOT_PAYABLE",
          "Hóa đơn không thể thanh toán",
        );
      const paid = await this.payments.confirmedTotal(invoice.id, tx);
      if (action === "confirm" && payment.amount > invoice.totalAmount - paid)
        throw new AppError(
          409,
          "PAYMENT_EXCEEDS_REMAINING",
          "Số tiền vượt quá số còn lại",
        );
      const next = {
        confirm: "CONFIRMED",
        reject: "REJECTED",
        void: "VOIDED",
        cancel: "CANCELLED",
      } as const;
      if (
        !(await this.payments.transition(
          id,
          expected,
          next[action],
          actor,
          reason?.trim(),
          tx,
        ))
      )
        throw new AppError(
          409,
          "PAYMENT_INVALID_STATUS",
          "Thanh toán vừa thay đổi",
        );
      if (action === "confirm" || action === "void") {
        const total = await this.payments.confirmedTotal(invoice.id, tx);
        if (total > invoice.totalAmount)
          throw new AppError(
            409,
            "PAYMENT_EXCEEDS_REMAINING",
            "Tổng thanh toán vượt hóa đơn",
          );
        await this.payments.updateInvoice(
          invoice.id,
          total === 0
            ? "UNPAID"
            : total === invoice.totalAmount
              ? "PAID"
              : "PARTIALLY_PAID",
          tx,
        );
      }
    });
    return this.get(id, action === "cancel" ? actor : undefined);
  }
}
