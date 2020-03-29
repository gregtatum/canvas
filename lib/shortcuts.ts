function _click(selector: string): void {
  const el: HTMLElement | null = document.querySelector(selector);
  if (el) el.click();
}

export default function shortcuts(seed: string, restart?: () => void): void {
  console.log(
    [
      "Available shortcuts:",
      "f: enter fullscreen",
      "h: hide the ui",
      "r: reload the ui",
      "s: create a screenshot link",
      "u: save the current seed to the URL",
      "left: previous session",
      "right: next session",
    ].join("\n")
  );
  window.addEventListener(
    "keydown",
    function(event) {
      switch (event.key) {
        case "h":
          document.body.classList.toggle("hide-ui");
          break;
        case "r":
          window.location.reload();
          break;
        case "s": {
          const canvas = document.querySelector("canvas");
          if (!canvas) {
            console.log("Could not find a canvas element to screenshot");
            break;
          }
          let a: HTMLAnchorElement | null = document.querySelector(
            ".download-link"
          );
          if (!a) {
            a = document.createElement("a");
            a.className = "download-link";
            document.body.appendChild(a);
            a.innerHTML = "Download Screenshot";
            a.target = "_blank";
            a.addEventListener("click", () => {
              if (a) {
                a.style.display = "none";
              }
            });
          }
          a.href = canvas.toDataURL();
          a.style.display = "inline-block";
          break;
        }
        case "u":
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
            if (!canvas) {
              throw new Error(
                "Could not find the canvas while entering fullscreen."
              );
            }
            canvas.requestFullscreen ? canvas.requestFullscreen() : null;
          }
          if (restart) {
            restart();
          }
          break;
        case "ArrowLeft":
          _click("#prev");
          break;
        case "ArrowRight":
          _click("#next");
          break;
        default:
        // Do nothing.
      }
    },
    false
  );
}
