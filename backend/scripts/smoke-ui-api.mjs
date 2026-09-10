import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 3018;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["dist/server.js"], {
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

async function waitUntilReady() {
  let stderr = "";
  child.stderr.on("data", (data) => (stderr += data.toString()));
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null)
      throw new Error(`Server exited before ready: ${stderr.slice(0, 300)}`);
    try {
      if ((await fetch(`${base}/health`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Server startup timed out");
}

async function api(path, token) {
  const response = await fetch(`${base}/api/v1${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  assert.notEqual(
    body.code,
    "NOT_FOUND",
    `Frontend endpoint is not mounted: GET ${path}`,
  );
  return { response, body };
}

try {
  await waitUntilReady();
  const login = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  assert.equal(login.status, 200, "Configured admin must be able to sign in");
  const token = (await login.json()).data.accessToken;
  const staticPaths = [
    "/auth/me",
    "/admin/dashboard/summary",
    "/admin/students?page=1&limit=5",
    "/admin/buildings",
    "/admin/room-types",
    "/admin/equipment-categories",
    "/admin/equipment?page=1&limit=5",
    "/admin/contracts?page=1&limit=5",
    "/admin/room-change-requests?page=1&limit=5",
    "/admin/checkout-requests?page=1&limit=5",
    "/admin/notifications?page=1&limit=5",
    "/admin/maintenance-staff",
    "/admin/maintenance-requests?page=1&limit=5",
    "/admin/utility-readings?page=1&limit=5",
    "/admin/monthly-billings?page=1&limit=5",
    "/admin/payments?page=1&limit=5",
  ];
  for (const path of staticPaths) {
    const { response } = await api(path, token);
    assert.equal(response.status, 200, `GET ${path} should succeed`);
  }
  const buildings = (await api("/admin/buildings", token)).body.data;
  if (buildings[0]) {
    assert.equal(
      (await api(`/admin/buildings/${buildings[0].id}/overview`, token)).response.status,
      200,
    );
    const rooms = await api(
      `/admin/buildings/${buildings[0].id}/rooms?page=1&limit=5`,
      token,
    );
    assert.equal(rooms.response.status, 200);
    const room = rooms.body.data.items?.[0];
    if (room) {
      assert.equal(
        (await api(`/admin/rooms/${room.id}`, token)).response.status,
        200,
      );
      assert.equal(
        (await api(`/admin/rooms/${room.id}/beds`, token)).response.status,
        200,
      );
      assert.equal(
        (await api(`/admin/rooms/${room.id}/equipment?page=1`, token)).response
          .status,
        200,
      );
    }
    for (const path of [
      `/admin/buildings/${buildings[0].id}`,
      `/admin/buildings/${buildings[0].id}/floors/1/rooms`,
    ]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /<div id="root">/);
    }
  }
  for (const path of [
    "/",
    "/login",
    "/admin",
    "/admin/payments",
    "/admin/billing",
    "/student/invoices",
  ]) {
    const response = await fetch(base + path);
    assert.equal(
      response.status,
      200,
      `Frontend route ${path} must serve the app`,
    );
    assert.match(await response.text(), /<div id="root">/);
  }
  console.log(
    `UI/API smoke passed: ${staticPaths.length + 4} admin API reads and 6 frontend routes`,
  );
} finally {
  child.kill();
}
