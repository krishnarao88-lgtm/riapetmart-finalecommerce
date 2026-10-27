import assert from "node:assert/strict";
import { test } from "node:test";
import { lalamoveVehicle, lineGrams, lineVolumetricGrams, parcelKg } from "../src/lib/shipping/parcel.ts";

test("bulky light boxes declare the volumetric weight", () => {
  // 40×30×30cm litter box at 2kg: volumetric 7.2kg beats the packed 2.4kg.
  const vol = lineVolumetricGrams(400, 300, 300, 1);
  assert.equal(vol, 7200);
  assert.equal(parcelKg(lineGrams(2000, 1, "Litter"), vol), 7.2);
  // Heavy small box: packed weight still wins.
  assert.equal(parcelKg(lineGrams(15000, 1, "Dry Food"), lineVolumetricGrams(300, 200, 100, 1)), 16.1);
  // Any missing size means no volumetric weight.
  assert.equal(lineVolumetricGrams(400, null, 300, 2), 0);
  assert.equal(lineVolumetricGrams(100, 100, 100, 3), 600);
});

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
