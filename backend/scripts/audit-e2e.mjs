import "dotenv/config";

const base = "http://localhost:3000/api/v1";
const results = [];

async function request(method, path, body, token) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, ...payload };
}

function check(name, response, expectedStatus, predicate = () => true) {
  const pass = response.status === expectedStatus && predicate(response.data, response);
  results.push({ name, result: pass ? "PASS" : "FAIL", expectedStatus, actualStatus: response.status, code: response.code });
  if (!pass) throw new Error(`${name}: expected ${expectedStatus}, got ${response.status} ${response.code ?? ""}`);
  return response.data;
}

async function register(label) {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const response = await request("POST", "/auth/register", {
    username: `audit${label}${suffix}`.slice(0, 20),
    password: "Audit@123",
    fullName: `Audit Student ${label}`,
    mssv: `AUD${label}${suffix}`,
    email: `audit.${label}.${suffix}@example.com`,
    role: "ADMIN",
  });
  return check(`Register student ${label} and strip injected role`, response, 201, (data) => data.user.role === "STUDENT");
}

async function main() {
  const adminLogin = check(
    "Admin login",
    await request("POST", "/auth/login", { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }),
    200,
  );
  const adminToken = adminLogin.accessToken;
  const first = await register("A"), second = await register("B"), outsider = await register("C");
  const firstToken = first.accessToken, secondToken = second.accessToken, outsiderToken = outsider.accessToken;

  check("Student cannot access admin endpoint", await request("GET", "/admin/contracts", undefined, firstToken), 403);
  check("Access token rejected as refresh token", await request("POST", "/auth/refresh-token", { refreshToken: first.accessToken }), 401);
  check("Refresh token works", await request("POST", "/auth/refresh-token", { refreshToken: first.refreshToken }), 200);
  check("Student /me", await request("GET", "/auth/me", undefined, firstToken), 200);

  const buildings = check("Browse buildings", await request("GET", "/student/buildings", undefined, firstToken), 200, (data) => data.length >= 2);
  const roomsA = check("Browse rooms", await request("GET", `/student/buildings/${buildings[0].id}/rooms`, undefined, firstToken), 200, (data) => data.length === 5);
  const room1 = check("Room detail", await request("GET", `/student/rooms/${roomsA[0].id}`, undefined, firstToken), 200);
  const room2 = check("Second room detail", await request("GET", `/student/rooms/${roomsA[1].id}`, undefined, firstToken), 200);
  const bed1 = room1.beds.find((bed) => bed.status === "EMPTY");
  const targetBed = room2.beds.find((bed) => bed.status === "EMPTY");

  const pending1 = check("Student registers bed with server-owned dates", await request("POST", "/student/contracts", { bedId: bed1.id, startDate: "2000-01-01", endDate: "2099-01-01" }, firstToken), 201, (data) => new Date(data.startDate).getFullYear() !== 2000);
  check("Reject second contract while pending", await request("POST", "/student/contracts", { bedId: targetBed.id }, firstToken), 409, (_data, response) => response.code === "STUDENT_ALREADY_HAS_ACTIVE_CONTRACT");
  const pending2 = check("Allow competing pending contract on same bed", await request("POST", "/student/contracts", { bedId: bed1.id }, secondToken), 201);

  const list = check("Admin contract list enriched DTO", await request("GET", "/admin/contracts", undefined, adminToken), 200, (data) => data.items.some((item) => item.id === pending1.id && item.student?.fullName && item.room?.roomNumber && item.bed?.bedNumber));
  void list;
  check("Approve first pending contract", await request("PATCH", `/admin/contracts/${pending1.id}/approve`, {}, adminToken), 200, (data) => data.status === "ACTIVE");
  check("Competing approval loses race", await request("PATCH", `/admin/contracts/${pending2.id}/approve`, {}, adminToken), 409, (_data, response) => response.code === "BED_NOT_AVAILABLE");
  check("Reject second contract while active", await request("POST", "/student/contracts", { bedId: targetBed.id }, firstToken), 409);
  const active = check("Student sees active contract", await request("GET", "/student/contracts/me/active", undefined, firstToken), 200, (data) => data?.status === "ACTIVE");

  check("Maintenance blocked without active contract", await request("POST", "/student/maintenance-requests", { category: "OTHER", description: "No active" }, outsiderToken), 409, (_data, response) => response.code === "NO_ACTIVE_CONTRACT");
  const ownEquipment = check("Load equipment in current room", await request("GET", "/student/rooms/me/equipment", undefined, firstToken), 200, (data) => data.items.length > 0);
  const otherEquipment = check("Admin loads equipment in another room", await request("GET", `/admin/rooms/${room2.id}/equipment`, undefined, adminToken), 200, (data) => data.items.length > 0);
  check("Reject equipment outside student's room", await request("POST", "/student/maintenance-requests", { category: "ELECTRICAL", description: "Wrong room", equipmentItemId: otherEquipment.items[0].id }, firstToken), 409, (_data, response) => response.code === "EQUIPMENT_NOT_IN_ROOM");
  const maintenance = check("Create maintenance request", await request("POST", "/student/maintenance-requests", { category: "ELECTRICAL", description: "Audit maintenance", equipmentItemId: ownEquipment.items[0].id }, firstToken), 201);
  check("Resolve maintenance directly", await request("PATCH", `/admin/maintenance-requests/${maintenance.id}/resolve`, { resolutionNote: "Audit resolved" }, adminToken), 200, (data) => data.status === "RESOLVED");

  const profile = check("Load student profile", await request("GET", "/student/profile", undefined, firstToken), 200);
  const notification = check("Admin sends specific notification", await request("POST", "/admin/notifications", { title: "Audit notice", content: "Audit content", targetScope: "SPECIFIC_STUDENT", targetStudentId: profile.id }, adminToken), 201, (data) => data.recipientCount === 1);
  void notification;
  check("Unread count increments", await request("GET", "/student/notifications/unread-count", undefined, firstToken), 200, (data) => data.count >= 1);
  const notices = check("Student notification list", await request("GET", "/student/notifications/me", undefined, firstToken), 200, (data) => data.items.some((item) => item.title === "Audit notice"));
  const notice = notices.items.find((item) => item.title === "Audit notice");
  check("Mark notification read", await request("PATCH", `/student/notifications/${notice.notificationId}/read`, {}, firstToken), 200, (data) => data.isRead === true);
  check("Mark read is idempotent", await request("PATCH", `/student/notifications/${notice.notificationId}/read`, {}, firstToken), 200, (data) => data.isRead === true);
  const outsiderProfile = check("Load outsider profile", await request("GET", "/student/profile", undefined, outsiderToken), 200);
  check("Send notification to outsider", await request("POST", "/admin/notifications", { title: "Private audit", content: "Private", targetScope: "SPECIFIC_STUDENT", targetStudentId: outsiderProfile.id }, adminToken), 201);
  const outsiderNotices = check("Outsider receives own notification", await request("GET", "/student/notifications/me", undefined, outsiderToken), 200);
  const privateNotice = outsiderNotices.items.find((item) => item.title === "Private audit");
  check("Student cannot read another recipient notification", await request("GET", `/student/notifications/${privateNotice.notificationId}`, undefined, firstToken), 404);

  check("Room change rejects current bed", await request("POST", "/student/room-change-requests", { targetBedId: active.bedId }, firstToken), 400, (_data, response) => response.code === "SAME_BED");
  const change = check("Create room change request", await request("POST", "/student/room-change-requests", { targetBedId: targetBed.id, reason: "Audit move" }, firstToken), 201);
  check("Approve room change", await request("PATCH", `/admin/room-change-requests/${change.id}/approve`, {}, adminToken), 200, (data) => data.status === "APPROVED");
  check("New contract preserves old end date", await request("GET", "/student/contracts/me/active", undefined, firstToken), 200, (data) => data.bedId === targetBed.id && new Date(data.endDate).getTime() === new Date(active.endDate).getTime());

  check("Admin create contract rejects one-sided date", await request("POST", "/admin/contracts", { studentId: outsiderProfile.id, bedId: room1.beds[1].id, startDate: new Date().toISOString() }, adminToken), 400);
  const buildingB = buildings.find((item) => item.name === "Tòa B");
  check("Building notification rejects no recipients", await request("POST", "/admin/notifications", { title: "Empty building", content: "No active residents", targetScope: "BUILDING", targetBuildingId: buildingB.id }, adminToken), 409, (_data, response) => response.code === "NOTIFICATION_HAS_NO_RECIPIENTS");

  console.log(JSON.stringify({ summary: { pass: results.filter((item) => item.result === "PASS").length, fail: results.filter((item) => item.result === "FAIL").length }, results }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message, results }, null, 2));
  process.exitCode = 1;
});
