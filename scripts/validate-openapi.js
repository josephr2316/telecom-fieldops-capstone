/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

async function main() {
  const openapiPath =
    process.argv[2] ||
    path.join(process.cwd(), "apps", "api", "src", "openapi", "openapi.yaml");

  if (!fs.existsSync(openapiPath)) {
    console.error(`[openapi] File not found: ${openapiPath}`);
    process.exit(1);
  }

  const ext = path.extname(openapiPath).toLowerCase();
  if (![".yaml", ".yml", ".json"].includes(ext)) {
    console.error(
      `[openapi] Unsupported file extension: ${ext}. Use .yaml/.yml/.json`,
    );
    process.exit(1);
  }

  // Lazy-load dependencies so this script gives a friendly message if missing.
  let SwaggerParser;
  let yaml;

  let cwdRequire = null;
  try {
    cwdRequire = createRequire(path.join(process.cwd(), "package.json"));
  } catch (e) {
    cwdRequire = null;
  }

  try {
    SwaggerParser = require("@apidevtools/swagger-parser");
  } catch (e) {
    if (cwdRequire) {
      try {
        SwaggerParser = cwdRequire("@apidevtools/swagger-parser");
      } catch (err) {
        console.error(
          "[openapi] Missing dependency: @apidevtools/swagger-parser\n" +
            "Install it in your current package:\n" +
            "  npm i -D @apidevtools/swagger-parser\n",
        );
        process.exit(1);
      }
    } else {
      console.error(
        "[openapi] Missing dependency: @apidevtools/swagger-parser\n" +
          "Install it in your current package:\n" +
          "  npm i -D @apidevtools/swagger-parser\n",
      );
      process.exit(1);
    }
  }

  if (ext !== ".json") {
    try {
      yaml = require("js-yaml");
    } catch (e) {
      if (cwdRequire) {
        try {
          yaml = cwdRequire("js-yaml");
        } catch (err) {
          console.error(
            "[openapi] Missing dependency: js-yaml\n" +
              "Install it in your current package:\n" +
              "  npm i -D js-yaml\n",
          );
          process.exit(1);
        }
      } else {
        console.error(
          "[openapi] Missing dependency: js-yaml\n" +
            "Install it in your current package:\n" +
            "  npm i -D js-yaml\n",
        );
        process.exit(1);
      }
    }
  }

  const raw = fs.readFileSync(openapiPath, "utf8");
  const doc =
    ext === ".json"
      ? JSON.parse(raw)
      : yaml.load(raw, { schema: yaml.DEFAULT_SCHEMA });

  // Basic guards (fast feedback)
  if (!doc.openapi) {
    console.error("[openapi] Missing 'openapi' field (expected OpenAPI 3.x).");
    process.exit(1);
  }
  if (!doc.info || !doc.info.title || !doc.info.version) {
    console.error("[openapi] Missing 'info.title' or 'info.version'.");
    process.exit(1);
  }
  if (!doc.paths || typeof doc.paths !== "object") {
    console.error("[openapi] Missing 'paths'.");
    process.exit(1);
  }

  // Full validation
  try {
    const api = await SwaggerParser.validate(doc);

    const version = api.openapi;
    const title = api.info?.title || "Unknown";
    const v = api.info?.version || "Unknown";
    const pathCount = Object.keys(api.paths || {}).length;

    console.log(
      `[openapi] OK: ${title} (v${v}) | spec=${version} | paths=${pathCount} | file=${openapiPath}`,
    );
    process.exit(0);
  } catch (err) {
    console.error("[openapi] Validation FAILED");
    console.error(err?.message || err);
    process.exit(1);
  }
}

main();
