const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Task = require("./models/Task");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (_req, res) => res.json({
  status: "ok",
  database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  timestamp: new Date().toISOString()
}));

app.get("/api/tasks", async (_req, res, next) => {
  try { res.json(await Task.find().sort({ createdAt: -1 }).lean()); }
  catch (err) { next(err); }
});

app.post("/api/tasks", async (req, res, next) => {
  try {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title || title.length > 160) return res.status(400).json({ error: "Title must be between 1 and 160 characters." });
    res.status(201).json(await Task.create({ title }));
  } catch (err) { next(err); }
});

app.patch("/api/tasks/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid task ID." });
    const updates = {};
    if (typeof req.body.title === "string") {
      const title = req.body.title.trim();
      if (!title || title.length > 160) return res.status(400).json({ error: "Title must be between 1 and 160 characters." });
      updates.title = title;
    }
    if (typeof req.body.completed === "boolean") updates.completed = req.body.completed;
    if (!Object.keys(updates).length) return res.status(400).json({ error: "Provide title or completed to update." });
    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ error: "Task not found." });
    res.json(task);
  } catch (err) { next(err); }
});

app.delete("/api/tasks/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid task ID." });
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found." });
    res.status(204).end();
  } catch (err) { next(err); }
});

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(err.name === "ValidationError" ? 400 : 500).json({ error: err.name === "ValidationError" ? err.message : "Internal server error." });
});
module.exports = app;
