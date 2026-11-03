import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  cleanMessage,
  cleanName,
  cleanRemoteMessage,
  cleanRemoteName,
  messageProblem,
  nameProblem,
  MAX_MESSAGE,
  MAX_NAME,
} from "./names";

describe("names", () => {
  test("cleanName keeps letters and digits, strips markup, and limits length", () => {
    assert.equal(cleanName("  Poppy <b>x</b>  "), "Poppy bxb");
    assert.equal(cleanName("a".repeat(40)).length, MAX_NAME);
    assert.equal(cleanName("Ünï  cödé   name"), "Ünï cödé name");
  });

  test("an empty name is fine (a random one is used)", () => {
    assert.equal(nameProblem(""), null);
  });

  test("names must be at least 2 characters", () => {
    assert.match(nameProblem("a") ?? "", /at least 2/);
  });

  test("nobody can take the owner's or superadmin's names", () => {
    for (const n of ["Sheza", "sheza123", "Admin", "Super Admin", "Fox", "the fox", "Moderator", "Owner"]) {
      assert.ok(nameProblem(n), `${n} should be refused`);
    }
  });

  test("foxy names that are not exactly Fox are allowed", () => {
    assert.equal(nameProblem("Foxy"), null);
    assert.equal(nameProblem("Sunny Day"), null);
  });

  test("profanity is refused, even with leetspeak and stretched letters", () => {
    for (const n of ["fuck", "f u c k", "fuuuck", "sh1t", "B1tch"]) {
      assert.ok(nameProblem(cleanName(n)), `${n} should be refused`);
    }
  });

  test("names from other players fall back to Visitor", () => {
    assert.equal(cleanRemoteName("Poppy"), "Poppy");
    assert.equal(cleanRemoteName("Admin"), "Visitor");
    assert.equal(cleanRemoteName(42), "42");
    assert.equal(cleanRemoteName(undefined), "Visitor");
  });
});

describe("chat messages", () => {
  test("cleanMessage trims, strips angle brackets and control characters, and limits length", () => {
    assert.equal(cleanMessage("  hi <script>  there \u0007 "), "hi script there");
    assert.equal(cleanMessage("x".repeat(200)).length, MAX_MESSAGE);
  });

  test("normal messages pass", () => {
    assert.equal(messageProblem("Hello friends, lovely day for a walk!"), null);
    assert.equal(messageProblem("I read the document today"), null); // contains "cum" letters, must not be flagged
  });

  test("empty messages are refused", () => {
    assert.ok(messageProblem(""));
  });

  test("links are refused", () => {
    for (const m of ["see www.spam.com", "go to https://example.org", "visit example.io now"]) {
      assert.match(messageProblem(m) ?? "", /Links/);
    }
  });

  test("profanity is refused", () => {
    assert.match(messageProblem("what a f u c k") ?? "", /friendly/);
  });

  test("messages from other players are dropped when they break the rules", () => {
    assert.equal(cleanRemoteMessage("Good morning!"), "Good morning!");
    assert.equal(cleanRemoteMessage("check www.x.com"), null);
    assert.equal(cleanRemoteMessage("fuck"), null);
    assert.equal(cleanRemoteMessage(123), null);
  });
});
