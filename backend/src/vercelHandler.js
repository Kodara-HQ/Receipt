import { createApp } from "./app.js";
import { migrate, waitForDatabase } from "./db/migrate.js";
import { ensureUploadsDir } from "./middleware/upload.js";

const app = createApp();

let ready;

function ensureDatabase() {
  if (!ready) {
    ready = waitForDatabase(8, 400).then(() => migrate());
  }
  return ready;
}

export default async function handler(req, res) {
  try {
    ensureUploadsDir();
    await ensureDatabase();
  } catch (error) {
    console.error(error);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error:
          error.message ||
          "The API could not start. Set DATABASE_URL and JWT_SECRET in Vercel environment variables.",
      })
    );
    return;
  }

  return app(req, res);
}
