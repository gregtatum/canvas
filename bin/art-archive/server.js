/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

// @ts-check
const http = require("http");
const formidable = require("formidable");
const { archiveTool, prefix } = require("./archive-tool");

module.exports = { startArtArchiveServer };

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

function startArtArchiveServer({
  port,
  projectName,
  projectPath,
  projectSlug,
  pieceName,
  pieceSlug,
  archivePath,
  archive,
  runBuild,
}) {
  console.log(prefix + "start server");
  const server = http.createServer((req, res) => {
    console.log(prefix + "received request");
    if (req.method === "POST") {
      const form = formidable({ multiples: true });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          respondErr(res, 404, "Error processing form data");
          console.error(prefix, err);
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

        let htmlPath = null;
        if (archive === "html") {
          htmlPath = await runBuild();
          console.log(prefix + "HTML build complete: " + htmlPath);
        }

        try {
          archiveTool({
            projectPath,
            projectSlug,
            archivePath,
            projectName,
            pieceName: configuredPieceName,
            pieceSlug,
            filePath: image.path,
            verbose: false,
            archive,
            htmlPath,
            serveArchivePort: 5678,
          });
        } catch (error) {
          console.error(prefix, error);
          respondErr(res, 401, "Could not archive the art.");
          return;
        }
        res.writeHead(200, {
          "Content-type": "text/json",
          "Access-Control-Allow-Origin": "*",
        });

        res.end(JSON.stringify({ success: "Art archived." }));
      });
    } else {
      respondErr(res, 404, "Only POST is supported.");
    }
  });

  server.listen(port, () => {
    console.log(prefix + `🏃  Server is running at http://localhost:${port}`);
  });
}
