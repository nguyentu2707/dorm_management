import test from "node:test";
import assert from "node:assert/strict";
import { assertPlacementAllowed, isGenderCompatible } from "../dist/services/building-placement.js";

test("building gender policy supports restricted and mixed buildings", () => {
  assert.equal(isGenderCompatible("MALE", "MALE"), true);
  assert.equal(isGenderCompatible("FEMALE", "MALE"), false);
  assert.equal(isGenderCompatible("OTHER", "MIXED"), true);
  assert.equal(isGenderCompatible(undefined, "MIXED"), false);
});

test("placement requires an active compatible building", () => {
  assert.throws(
    () => assertPlacementAllowed({ gender: "FEMALE" }, { status: "ACTIVE", allowedGender: "MALE" }),
    (error) => error.code === "BUILDING_GENDER_NOT_ALLOWED",
  );
  assert.throws(
    () => assertPlacementAllowed({ gender: "MALE" }, { status: "MAINTENANCE", allowedGender: "MALE" }),
    (error) => error.code === "BUILDING_NOT_ACTIVE",
  );
});
