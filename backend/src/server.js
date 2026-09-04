import "dotenv/config";
import { createApp } from "./app.js";
import { migrate, waitForDatabase } from "./db/migrate.js";

const port = Number(process.env.PORT || 4000);
const app = createApp();

async function start() {
  await waitForDatabase();
  await migrate();
  app.listen(port, () => {
    console.log(`THE FRAGRANCE UNIVERSE API running on http://localhost:${port}`);
  });
}

// Vercel imports this file as a serverless handler. Do not listen or exit there.
if (!process.env.VERCEL) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export default app;
