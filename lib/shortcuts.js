const Keycode = require("keycode");

function _click(selector) {
  const el = document.querySelector(selector);
  if (el) el.click();
}

module.exports = function shortcuts(seed) {
  window.addEventListener(
    "keydown",
    function(event) {
      switch (Keycode(event)) {
        case "h":
          document.body.classList.toggle("hide-ui");
          break;
        case "r":
          window.location.reload();
          break;
        case "s":
          history.pushState(
            null,
            document.title,
            window.location.pathname + "#" + seed
          );
          break;
        case "f":
          if (document.fullscreenElement) {
            document.exitFullscreen ? document.exitFullscreen() : null;
          } else {
            const canvas = document.querySelector("canvas");
            canvas.requestFullscreen ? canvas.requestFullscreen() : null;
          }
          break;
        case "left":
          _click("#prev");
          break;
        case "right":
          _click("#next");
          break;
        default:
        // Do nothing.
      }
    },
    false
  );
};
