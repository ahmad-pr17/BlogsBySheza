import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DAY_NIGHT_ENABLED, darknessAt, labelAt, phaseAt, skipSeconds } from "./daynight";

describe("day and night", () => {
  test("the phase is always between 0 and 1", () => {
    for (const shift of [0, 123, -999, 1e6]) {
      const p = phaseAt(shift);
      assert.ok(p >= 0 && p < 1, `phase ${p}`);
    }
  });

  test("darkness stays between 0 and 1", () => {
    for (let shift = 0; shift < 480; shift += 7) {
      const d = darknessAt(shift);
      assert.ok(d >= 0 && d <= 1, `darkness ${d}`);
    }
  });

  test("while the cycle is switched off it is always day", () => {
    if (DAY_NIGHT_ENABLED) return; // only meaningful while switched off
    for (let shift = 0; shift < 480; shift += 13) {
      assert.equal(darknessAt(shift), 0);
      assert.equal(labelAt(shift), "☀️ Day");
    }
  });

  test("skipping lands within one cycle", () => {
    const s = skipSeconds(0);
    assert.ok(s >= 0 && s < 480);
  });
});
