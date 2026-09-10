import type { RequestHandler } from "express";
import type { AuthRequest } from "../types/common.types.js";
import type { PaymentService } from "../services/payment.service.js";
export class PaymentController {
  constructor(private service: PaymentService) {}
  private handle(
    work: (req: AuthRequest) => Promise<unknown>,
    status = 200,
  ): RequestHandler {
    return async (req, res, next) => {
      try {
        res
          .status(status)
          .json({
            success: true,
            message: "Thao tác thành công",
            data: await work(req as AuthRequest),
          });
      } catch (e) {
        next(e);
      }
    };
  }
  submit = this.handle(
    (req) =>
      this.service.submit(req.user!.userId, req.params.invoiceId!, req.body),
    201,
  );
  mine = this.handle((req) =>
    this.service.list(req.query as never, req.user!.userId),
  );
  own = this.handle((req) =>
    this.service.get(req.params.paymentId!, req.user!.userId),
  );
  cancel = this.handle((req) =>
    this.service.process(req.params.paymentId!, req.user!.userId, "cancel"),
  );
  list = this.handle((req) => this.service.list(req.query as never));
  get = this.handle((req) => this.service.get(req.params.paymentId!));
  confirm = this.handle((req) =>
    this.service.process(req.params.paymentId!, req.user!.userId, "confirm"),
  );
  reject = this.handle((req) =>
    this.service.process(
      req.params.paymentId!,
      req.user!.userId,
      "reject",
      req.body.reason,
    ),
  );
  void = this.handle((req) =>
    this.service.process(
      req.params.paymentId!,
      req.user!.userId,
      "void",
      req.body.reason,
    ),
  );
}
