import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  notificationPresentationBindings,
  subscribeNotificationPresentation,
} from "../modules/js/NotificationPresentation.js";

const bindings = notificationPresentationBindings();
const testDir = path.dirname(fileURLToPath(import.meta.url));
const gameSource = fs.readFileSync(
  path.join(testDir, "..", "modules", "js", "Game.js"),
  "utf8"
);
assert.equal(bindings.length, 125, "Every server notification must have one presentation binding.");
assert.equal(new Set(bindings.map(([name]) => name)).size, bindings.length, "Notification names must be unique.");
assert.deepEqual(
  bindings.find(([name]) => name === "faithWarStart"),
  ["faithWarStart", "notif_faithWarStart"],
  "Named notifications use their matching handler."
);
assert.deepEqual(
  bindings.find(([name]) => name === "surrenderAsked"),
  ["surrenderAsked", "notif_genericLogOnly"],
  "Log-only notifications share the no-op presentation handler."
);

const calls = [];
const target = {};
const count = subscribeNotificationPresentation(
  (name, actualTarget, handler) => calls.push([name, actualTarget, handler]),
  target
);
assert.equal(count, bindings.length);
assert.equal(calls.length, bindings.length);
assert.equal(calls[0][1], target, "The subscription adapter receives the game target.");
for (const [name, handler] of bindings) {
  assert.match(
    gameSource,
    new RegExp("\\n\\s*" + handler + ":\\s*function\\s*\\("),
    `${name} must reference an existing ${handler} method.`
  );
}

console.log("Notification presentation tests passed.");
