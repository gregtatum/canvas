/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

// @ts-check
const http = require("http");
const formidable = require("formidable");
const { archiveTool } = require("./archive-tool");

module.exports = { startServer };

/**
 * @param {http.ServerResponse} res
 * @param {number} status
 * @param {string} error
 */
function respondErr(res, status, error) {
  res.writeHead(status, {
    "Content-type": "text/json",
    "Access-Control-Allow-Origin": "*",
  });

  res.end(JSON.stringify({ error }));
}

console.log("bin/art-archive/server.js");

function startServer({
  port,
  projectName,
  projectPath,
  projectSlug,
  pieceName,
  pieceSlug,
  archivePath,
}) {
  console.log("start server");
  const server = http.createServer((req, res) => {
    console.log("request");
    if (req.method === "POST") {
      const form = formidable({ multiples: true });

      form.parse(req, (err, fields, files) => {
        console.log("Form", { err, fields, files });
        if (err) {
          respondErr(res, 404, "Error processing form data");
          console.error("[art-archive]", err);
          return;
        }

        let configuredPieceName = pieceName;
        if (fields.pieceName && typeof fields.pieceName === "string") {
          configuredPieceName = fields.pieceName;
        }
        const { image } = files;
        if (!image || Array.isArray(image)) {
          respondErr(
            res,
            401,
            "The image did not exist or there were multiple images."
          );
          return;
        }

        archiveTool({
          projectPath,
          projectSlug,
          archivePath,
          projectName,
          pieceName: configuredPieceName,
          pieceSlug,
          filePath: image.path,
          verbose: true,
        });
        res.writeHead(200, {
          "Content-type": "text/json",
          "Access-Control-Allow-Origin": "*",
        });

        res.end(JSON.stringify({ success: "Posted a response." }));
      });
    } else {
      respondErr(res, 404, "Only POST is supported.");
    }
  });

  server.listen(port, () => {
    console.log(
      `[art-archive] 🏃  Server is running at http://localhost:${port}`
    );
  });
}
