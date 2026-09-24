import assert from "node:assert/strict";
import { test } from "node:test";
import { newOAuthState, stateMatches } from "../src/lib/oauth-state.ts";

test("stateMatches accepts only the exact state from the cookie", () => {
  const state = newOAuthState();
  assert.equal(stateMatches(state, state), true);
  assert.equal(stateMatches(state, newOAuthState()), false);
  assert.equal(stateMatches(state, state.slice(1)), false);
  assert.equal(stateMatches(undefined, state), false);
  assert.equal(stateMatches(state, null), false);
  assert.equal(stateMatches("", ""), false);
});
