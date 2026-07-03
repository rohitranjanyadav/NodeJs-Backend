const express = require("express");
const {
  closeDatabase,
  fetchDemoRecords,
  initializeDatabase,
} = require("./db");

const PORT = process.env.PORT ?? 8000;
const HOST = "0.0.0.0";

const app = express();
let server;

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await closeDatabase();
  process.exit(0);
}

app.get("/", (req, res) => {
  return res.json({
    status: "Success",
    message: "Hello from express server",
  });
});

app.get("/health", (req, res) => {
  return res.json({
    status: "ok",
  });
});

app.get("/records", async (req, res) => {
  try {
    return res.json({
      status: "ok",
      data: await fetchDemoRecords(),
    });
  } catch (error) {
    console.error("Failed to read demo records", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to read demo records",
    });
  }
});

async function startServer() {
  await initializeDatabase();

  server = app.listen(PORT, HOST, () =>
    console.log(`Server started on PORT: ${PORT}`)
  );

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch(async (error) => {
  console.error(error.message);

  await closeDatabase();

  process.exit(1);
});

