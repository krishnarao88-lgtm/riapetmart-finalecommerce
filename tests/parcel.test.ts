import assert from "node:assert/strict";
import { test } from "node:test";
import { lalamoveVehicle, lineGrams, parcelKg } from "../src/lib/shipping/parcel.ts";

test("declared parcel weight covers cans, bags and the box", () => {
  // 24 × 400g cans: label says 9.6kg, the real carton is ~11.7kg.
  assert.equal(parcelKg(lineGrams(9600, 1, "Wet Food")), 11.9);
  // 15kg bag of dry food.
  assert.equal(parcelKg(lineGrams(15000, 1, "Dry Food")), 16.1);
  // A single pouch still declares the 0.5kg minimum.
  assert.equal(parcelKg(lineGrams(85, 1, "Wet Food")), 0.5);
  // Unknown weight counts as 500g per unit.
  assert.equal(parcelKg(lineGrams(null, 2, "Treats")), 1.4);
});

test("Lalamove vehicle follows Malaysia weight limits", () => {
  assert.equal(lalamoveVehicle(0.5), "MOTORCYCLE");
  assert.equal(lalamoveVehicle(10), "MOTORCYCLE");
  assert.equal(lalamoveVehicle(16.1), "CAR");
  assert.equal(lalamoveVehicle(40.1), null);
});
