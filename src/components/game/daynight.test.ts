import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  darknessAt,
  labelAt,
  lightAtPhase,
  nextPeriodSeconds,
  periodOf,
  phaseAt,
  skipSeconds,
} from "./daynight";

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

  test("the four parts of the day come in order", () => {
    assert.equal(periodOf(0.25), "morning");
    assert.equal(periodOf(0.5), "noon");
    assert.equal(periodOf(0.71), "sunset");
    assert.equal(periodOf(0.92), "night");
    assert.equal(periodOf(0.02), "night");
  });

  test("noon is bright, night is dark, sunset is warm", () => {
    const noon = lightAtPhase(0.5);
    const night = lightAtPhase(0.95);
    const sunset = lightAtPhase(0.7);
    assert.equal(noon.dark, 0);
    assert.ok(night.dark > 0.9);
    assert.ok(sunset.mult[0] > sunset.mult[2], "sunset is redder than it is blue");
    assert.ok(night.mult[2] > night.mult[0], "night is bluer than it is red");
  });

  test("every phase gives a valid colour grade", () => {
    for (let p = 0; p < 1; p += 0.013) {
      const l = lightAtPhase(p);
      for (const v of l.mult) assert.ok(v >= 0 && v <= 255);
      assert.ok(l.add[3] >= 0 && l.add[3] <= 1);
    }
  });

  test("labels name the part of the day", () => {
    assert.match(labelAt(0), /Morning|Noon|Sunset|Night/);
  });

  test("skipping and jumping land within one cycle", () => {
    for (const shift of [0, 100, 250, 400]) {
      const s = skipSeconds(shift);
      const n = nextPeriodSeconds(shift);
      assert.ok(s >= 0 && s < 480);
      assert.ok(n >= 0 && n < 480);
    }
  });
});
