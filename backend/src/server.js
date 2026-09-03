import "dotenv/config";
import { createApp } from "./app.js";
import { migrate, waitForDatabase } from "./db/migrate.js";

const port = Number(process.env.PORT || 4000);

async function start() {
  await waitForDatabase();
  await migrate();
  const app = createApp();
  app.listen(port, () => {
    console.log(`THE FRAGRANCE UNIVERSE API running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
