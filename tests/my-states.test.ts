import assert from "node:assert/strict";
import { test } from "node:test";
import { MY_STATES, stateForPostcode } from "../src/lib/my-states.ts";

test("postcode fills in the right state", () => {
  assert.equal(stateForPostcode("48300"), "Selangor"); // Bukit Beruntung
  assert.equal(stateForPostcode("43000"), "Selangor"); // Kajang
  assert.equal(stateForPostcode("50450"), "Kuala Lumpur");
  assert.equal(stateForPostcode("62000"), "Putrajaya");
  assert.equal(stateForPostcode("10050"), "Pulau Pinang");
  assert.equal(stateForPostcode("81300"), "Johor");
  assert.equal(stateForPostcode("88000"), "Sabah");
  assert.equal(stateForPostcode("4830"), null); // incomplete
  assert.equal(stateForPostcode("99999"), null);
});

test("every state it returns is one the checkout dropdown offers", () => {
  for (let p = 1000; p < 99000; p += 1000) {
    const s = stateForPostcode(String(p).padStart(5, "0"));
    if (s) assert.ok(MY_STATES.includes(s), s);
  }
});
