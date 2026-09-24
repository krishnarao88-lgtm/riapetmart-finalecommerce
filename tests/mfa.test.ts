import assert from "node:assert/strict";
import { test } from "node:test";
import { isTotpCode, mfaStepRequired, safeAdminPath, verifiedTotp } from "../src/lib/mfa.ts";

const totp = (status: string) => ({ id: status, factor_type: "totp", status });

test("mfaStepRequired only when a verified factor exists and the session isn't aal2", () => {
  assert.equal(mfaStepRequired("aal1", [totp("verified")]), true);
  assert.equal(mfaStepRequired(null, [totp("verified")]), true);
  assert.equal(mfaStepRequired(undefined, [totp("verified")]), true);
  assert.equal(mfaStepRequired("aal2", [totp("verified")]), false);
  assert.equal(mfaStepRequired("aal1", [totp("unverified")]), false);
  assert.equal(mfaStepRequired("aal1", []), false);
  assert.equal(mfaStepRequired("aal1", undefined), false);
});

test("verifiedTotp ignores unverified and non-TOTP factors", () => {
  assert.equal(verifiedTotp([totp("unverified"), { id: "p", factor_type: "phone", status: "verified" }]), undefined);
  assert.equal(verifiedTotp([totp("unverified"), totp("verified")])?.id, "verified");
  assert.equal(verifiedTotp(undefined), undefined);
});

test("isTotpCode accepts exactly six ASCII digits", () => {
  assert.equal(isTotpCode("012345"), true);
  for (const bad of ["", "12345", "1234567", "12a456", " 123456", "１２３４５６"]) assert.equal(isTotpCode(bad), false, bad);
});

test("safeAdminPath keeps same-origin /admin paths only", () => {
  assert.equal(safeAdminPath("/admin"), "/admin");
  assert.equal(safeAdminPath("/admin/orders?status=paid"), "/admin/orders?status=paid");
  for (const bad of [
    null,
    undefined,
    "",
    "/",
    "/account",
    "/administrator",
    "admin/orders",
    "//evil.example/admin",
    "/\\evil.example/admin",
    "https://evil.example/admin",
    "javascript:alert(1)//admin",
    "/admin/../account",
  ]) {
    assert.equal(safeAdminPath(bad), "/admin", String(bad));
  }
});
