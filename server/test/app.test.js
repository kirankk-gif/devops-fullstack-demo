const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");
test("exports an Express application", () => {
  assert.equal(typeof app, "function");
  assert.equal(typeof app.listen, "function");
});
