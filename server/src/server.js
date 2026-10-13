require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "127.0.0.1";

async function start() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing. Set it in server/.env.");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB connected");
  app.listen(PORT, HOST, () => console.log(`Task Board API listening on http://${HOST}:${PORT}`));
}
start().catch(err => { console.error("Failed to start API:", err.message); process.exit(1); });
