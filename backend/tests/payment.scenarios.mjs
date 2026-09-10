import assert from "node:assert/strict";
import { PaymentService } from "../dist/services/payment.service.js";
import { PostgresPaymentRepository } from "../dist/repositories/implementations/payment.repository.js";
import { translatePostgresError } from "../dist/database/postgres-errors.js";
export async function paymentScenarios(
  t,
  { pool, r, tx, room, resident, draft, billing, admin, student, app, tokens },
) {
  const repo = new PostgresPaymentRepository(),
    service = new PaymentService(repo, r.students, tx);
  const code = (c) => (e) => e.code === c;
  const input = (amount) => ({
    amount,
    method: "BANK_TRANSFER",
    referenceCode: "TEST-REFERENCE",
  });
  async function fixture() {
    const target = await room();
    const a = await resident(target);
    const b = await draft(target, "2026-08");
    const done = await billing().finalize(b.id, admin.id);
    return { a, b, invoice: done.invoices[0] };
  }
  const read = (id) => r.invoices.findByMonthlyBilling(id);
  await t.test(
    "payment full/partial/void lifecycle and derived aggregates",
    async () => {
      const { a, b, invoice: i } = await fixture();
      const p = await service.submit(a.user.id, i.id, input(400000));
      assert.equal(p.status, "PENDING");
      assert.equal(p.invoice.paidAmount, 0);
      assert.equal(p.invoice.remainingAmount, i.totalAmount);
      let inv = (await read(b.id))[0];
      assert.equal(inv.status, "UNPAID");
      assert.equal(inv.pendingAmount, 400000);
      await assert.rejects(
        () => service.submit(a.user.id, i.id, input(1)),
        code("PAYMENT_ALREADY_PENDING"),
      );
      const first = await service.process(p.id, admin.id, "confirm");
      assert.equal(first.invoice.status, "PARTIALLY_PAID");
      assert.equal(first.invoice.paidAmount, 400000);
      const second = await service.submit(
        a.user.id,
        i.id,
        input(i.totalAmount - 400000),
      );
      const paid = await service.process(second.id, admin.id, "confirm");
      assert.equal(paid.invoice.status, "PAID");
      assert.equal(paid.invoice.remainingAmount, 0);
      await assert.rejects(
        () => service.submit(a.user.id, i.id, input(1)),
        code("PAYMENT_EXCEEDS_REMAINING"),
      );
      await assert.rejects(
        () => service.process(second.id, a.user.id, "cancel"),
        code("PAYMENT_INVALID_STATUS"),
      );
      const voided = await service.process(
        second.id,
        admin.id,
        "void",
        "Recorded incorrectly",
      );
      assert.equal(voided.status, "VOIDED");
      assert.equal(voided.invoice.status, "PARTIALLY_PAID");
      assert.equal(voided.invoice.paidAmount, 400000);
      assert.equal(voided.amount, i.totalAmount - 400000);
      assert.equal(voided.processedBy.id, admin.id);
      assert.equal(voided.voidedBy.id, admin.id);
      await assert.rejects(
        () => service.process(second.id, admin.id, "confirm"),
        code("PAYMENT_INVALID_STATUS"),
      );
      await assert.rejects(
        () => service.process(second.id, admin.id, "void", "again"),
        code("PAYMENT_INVALID_STATUS"),
      );
      await service.process(p.id, admin.id, "void", "Correction");
      assert.equal((await read(b.id))[0].status, "UNPAID");
    },
  );
  await t.test(
    "payment validation, exact SQLSTATE, reject/cancel and ownership",
    async () => {
      const { a, invoice: i } = await fixture(),
        other = await student();
      await assert.rejects(
        () => service.submit(a.user.id, i.id, input(i.totalAmount + 1)),
        code("PAYMENT_EXCEEDS_REMAINING"),
      );
      for (const amount of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])
        await assert.rejects(
          () => service.submit(a.user.id, i.id, input(amount)),
          code("INVALID_PAYMENT_AMOUNT"),
        );
      await assert.rejects(
        () => service.submit(other.user.id, i.id, input(1)),
        code("INVOICE_NOT_FOUND"),
      );
      const p = await service.submit(a.user.id, i.id, input(100));
      await assert.rejects(
        () => service.get(p.id, other.user.id),
        code("PAYMENT_NOT_FOUND"),
      );
      await assert.rejects(
        () => service.process(p.id, other.user.id, "cancel"),
        code("PAYMENT_NOT_FOUND"),
      );
      await assert.rejects(
        () =>
          pool.query(
            "INSERT INTO payments(invoice_id,submitted_by,amount) VALUES ($1,$2,1)",
            [i.id, a.user.id],
          ),
        (e) =>
          e.code === "23505" &&
          e.constraint === "uq_payments_pending_invoice" &&
          translatePostgresError(e).code === "PAYMENT_ALREADY_PENDING",
      );
      await assert.rejects(
        () =>
          pool.query(
            "INSERT INTO payments(invoice_id,submitted_by,amount) VALUES ($1,$2,0)",
            [i.id, a.user.id],
          ),
        (e) => e.code === "23514" && e.constraint === "ck_payments_amount",
      );
      await assert.rejects(
        () => service.process(p.id, admin.id, "reject", "  "),
        code("PAYMENT_REASON_REQUIRED"),
      );
      await service.process(p.id, admin.id, "reject", "Transfer not found");
      const replacement = await service.submit(a.user.id, i.id, input(100));
      await service.process(replacement.id, a.user.id, "cancel");
      assert.equal(
        (await service.get(replacement.id, a.user.id)).status,
        "CANCELLED",
      );
      assert.equal((await service.get(p.id)).invoice.paidAmount, 0);
      await assert.rejects(
        () => pool.query("DELETE FROM invoices WHERE id=$1", [i.id]),
        (e) =>
          ["23503", "23001"].includes(e.code) &&
          translatePostgresError(e).code === "REFERENCE_CONFLICT",
      );
    },
  );
  await t.test(
    "concurrent submissions and same-payment confirmations have exactly one winner",
    async () => {
      const { a, invoice: i } = await fixture();
      const submitted = await Promise.allSettled([
        service.submit(a.user.id, i.id, input(i.totalAmount)),
        service.submit(a.user.id, i.id, input(i.totalAmount)),
      ]);
      assert.equal(submitted.filter((x) => x.status === "fulfilled").length, 1);
      assert.equal(
        submitted.find((x) => x.status === "rejected").reason.code,
        "PAYMENT_ALREADY_PENDING",
      );
      const p = submitted.find((x) => x.status === "fulfilled").value;
      const confirmed = await Promise.allSettled([
        service.process(p.id, admin.id, "confirm"),
        service.process(p.id, admin.id, "confirm"),
      ]);
      assert.equal(confirmed.filter((x) => x.status === "fulfilled").length, 1);
      assert.equal((await service.get(p.id)).invoice.paidAmount, i.totalAmount);
    },
  );
  await t.test(
    "confirmation rechecks balance and rolls back payment when invoice update fails",
    async () => {
      const { a, invoice: i } = await fixture();
      const p = await service.submit(a.user.id, i.id, input(400000));
      // Stale-balance repository fault is isolated; production's single-pending index stays enabled.
      const stale = new Proxy(repo, {
        get(o, k) {
          return k === "confirmedTotal"
            ? async () => i.totalAmount - 300000
            : typeof o[k] === "function"
              ? o[k].bind(o)
              : o[k];
        },
      });
      await assert.rejects(
        () =>
          new PaymentService(stale, r.students, tx).process(
            p.id,
            admin.id,
            "confirm",
          ),
        code("PAYMENT_EXCEEDS_REMAINING"),
      );
      const broken = new Proxy(repo, {
        get(o, k) {
          return k === "updateInvoice"
            ? async () => {
                throw new Error("invoice update failure");
              }
            : typeof o[k] === "function"
              ? o[k].bind(o)
              : o[k];
        },
      });
      await assert.rejects(
        () =>
          new PaymentService(broken, r.students, tx).process(
            p.id,
            admin.id,
            "confirm",
          ),
        /invoice update failure/,
      );
      const after = await service.get(p.id);
      assert.equal(after.status, "PENDING");
      assert.equal(after.invoice.paidAmount, 0);
      assert.equal(after.invoice.status, "UNPAID");
    },
  );
  await t.test(
    "billing cancellation blocks confirmed money and cancels only pending submissions",
    async () => {
      const { a, b, invoice: i } = await fixture();
      const p = await service.submit(a.user.id, i.id, input(100));
      await service.process(p.id, admin.id, "confirm");
      await assert.rejects(
        () => billing().cancel(b.id, admin.id, "Cancel"),
        code("BILLING_HAS_CONFIRMED_PAYMENTS"),
      );
      assert.equal((await r.billings.findById(b.id)).status, "FINALIZED");
      assert.equal((await service.get(p.id)).status, "CONFIRMED");
      await service.process(p.id, admin.id, "void", "Correction");
      const pending = await service.submit(a.user.id, i.id, input(100));
      await billing().cancel(b.id, admin.id, "Cancel");
      assert.equal((await service.get(pending.id)).status, "CANCELLED");
      assert.equal((await service.get(p.id)).status, "VOIDED");
      assert.equal((await read(b.id))[0].status, "CANCELLED");
      await assert.rejects(
        () => service.submit(a.user.id, i.id, input(1)),
        code("INVOICE_NOT_PAYABLE"),
      );
    },
  );
  await t.test(
    "payment confirmation vs billing cancellation race preserves money and parent state",
    async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const { a, b, invoice: i } = await fixture();
        const p = await service.submit(a.user.id, i.id, input(i.totalAmount));
        const work = [
          () => service.process(p.id, admin.id, "confirm"),
          () => billing().cancel(b.id, admin.id, "Concurrent cancel"),
        ];
        if (attempt % 2) work.reverse();
        const outcomes = await Promise.allSettled(work.map((f) => f()));
        assert.equal(
          outcomes.filter((x) => x.status === "fulfilled").length,
          1,
        );
        const payment = await service.get(p.id),
          parent = await r.billings.findById(b.id);
        if (payment.status === "CONFIRMED") {
          assert.equal(parent.status, "FINALIZED");
          assert.equal(payment.invoice.status, "PAID");
        } else {
          assert.equal(payment.status, "CANCELLED");
          assert.equal(parent.status, "CANCELLED");
          assert.equal(payment.invoice.paidAmount, 0);
          assert.equal(payment.invoice.status, "CANCELLED");
        }
      }
    },
  );
  await t.test(
    "payment HTTP authorization, strict input, DTO and admin operations",
    async () => {
      const { a, invoice: i } = await fixture(),
        other = await student();
      const server = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));
      try {
        const base = `http://127.0.0.1:${server.address().port}/api/v1`;
        const request = (method, path, user, body) =>
          fetch(base + path, {
            method,
            headers: {
              authorization:
                "Bearer " +
                tokens.generateAccessToken({
                  userId: user.id,
                  role: user.role,
                }),
              "content-type": "application/json",
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
          });
        let res = await request(
          "POST",
          `/student/invoices/${i.id}/payments`,
          a.user,
          { ...input(100), studentId: a.student.id },
        );
        assert.equal(res.status, 422);
        res = await request(
          "POST",
          `/student/invoices/${i.id}/payments`,
          other.user,
          input(100),
        );
        assert.equal(res.status, 404);
        res = await request(
          "POST",
          `/student/invoices/${i.id}/payments`,
          a.user,
          input(100),
        );
        assert.equal(res.status, 201);
        const p = (await res.json()).data;
        res = await request("GET", `/student/payments/${p.id}`, other.user);
        assert.equal(res.status, 404);
        res = await request(
          "PATCH",
          `/admin/payments/${p.id}/confirm`,
          a.user,
          {},
        );
        assert.equal(res.status, 403);
        res = await request("GET", "/admin/payments?status=PENDING", admin);
        assert.equal(res.status, 200);
        assert.ok((await res.json()).data.items.some((x) => x.id === p.id));
        res = await request(
          "PATCH",
          `/admin/payments/${p.id}/confirm`,
          admin,
          {},
        );
        assert.equal(res.status, 200);
        res = await request("PATCH", `/admin/payments/${p.id}/void`, admin, {
          reason: "Correction",
        });
        assert.equal(res.status, 200);
        res = await request("GET", `/student/invoices/${i.id}`, a.user);
        const inv = (await res.json()).data;
        assert.equal(inv.paidAmount, 0);
        assert.equal(inv.remainingAmount, i.totalAmount);
        const before = (await pool.query("SELECT count(*) FROM payments"))
          .rows[0].count;
        const { migrate } = await import("../scripts/migrate.mjs");
        // Roll back newer unrelated migrations first, then verify that the
        // payment migration itself refuses to destroy financial history.
        while (
          (
            await pool.query(
              "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1",
            )
          ).rows[0]?.version !== "003_payments"
        )
          await migrate(pool, "down");
        try {
          await assert.rejects(
            () => migrate(pool, "down"),
            /Cannot roll back payments while financial history exists/,
          );
        } finally {
          await migrate(pool);
        }
        assert.equal(
          (await pool.query("SELECT count(*) FROM payments")).rows[0].count,
          before,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}
