globalThis.window = {};
globalThis._ = (text) => text;
globalThis.importDojoLibs = async () => [
  {},
  (_name, _base, members) => {
    function DeclaredGame() {}
    DeclaredGame.prototype = members;
    return DeclaredGame;
  },
  class GameGui {},
  class Counter {},
  class Stock {},
];

await import("../modules/js/Game.js");
console.log("Game module load test passed.");
