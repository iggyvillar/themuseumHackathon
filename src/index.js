// index.js
require("dotenv").config(); // load .env BEFORE requiring clickup.js
const express = require("express");
const {
  getTeams,
  getSpaces,
  getSpaceLists,
  getFolders,
  getFolderLists,
  createTask
} = require("./clickup");

const app = express();
app.use(express.json());

/** Health */
app.get("/", (_req, res) => res.send("ClickUp API bridge is alive ✅"));

/** Show which Workspaces (teams) your token can access */
app.get("/clickup/whoami", async (_req, res) => {
  try {
    const data = await getTeams();
    res.json(data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json(e.response?.data || { message: e.message });
  }
});

/** List Spaces in a team (pass ?teamId=... or set CLICKUP_TEAM_ID in .env) */
app.get("/clickup/spaces", async (req, res) => {
  try {
    const teamId = req.query.teamId || process.env.CLICKUP_TEAM_ID;
    if (!teamId) return res.status(400).json({ error: "Provide teamId query or set CLICKUP_TEAM_ID" });
    const data = await getSpaces(teamId);
    res.json(data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json(e.response?.data || { message: e.message });
  }
});

/** Folderless Lists in a Space */
app.get("/clickup/space/:spaceId/lists", async (req, res) => {
  try {
    const data = await getSpaceLists(req.params.spaceId);
    res.json(data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json(e.response?.data || { message: e.message });
  }
});

/** Folders in a Space + Lists in a Folder (for spaces that use folders) */
app.get("/clickup/space/:spaceId/folders", async (req, res) => {
  try {
    const data = await getFolders(req.params.spaceId);
    res.json(data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json(e.response?.data || { message: e.message });
  }
});

app.get("/clickup/folder/:folderId/lists", async (req, res) => {
  try {
    const data = await getFolderLists(req.params.folderId);
    res.json(data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json(e.response?.data || { message: e.message });
  }
});

/**
 * Create a task
 * - Uses CLICKUP_LIST_ID by default
 * - You can override with ?listId=... in the request
 * Body supports any fields ClickUp accepts; minimally send { "name": "..." }
 */
app.post("/tasks", async (req, res) => {
  try {
    const listId = req.query.listId || process.env.CLICKUP_LIST_ID;
    if (!listId) return res.status(400).json({ error: "Provide listId query or set CLICKUP_LIST_ID" });

    // Common gotcha: status must exist in that List; omit if unsure.
    const payload = {
      name: req.body.name,
      description: req.body.description,
      assignees: req.body.assignees,
      tags: req.body.tags,
      status: req.body.status,
      due_date: req.body.due_date,
      priority: req.body.priority,
      time_estimate: req.body.time_estimate,
      custom_fields: req.body.custom_fields
    };

    if (!payload.name || !payload.name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    const task = await createTask(listId, payload);
    res.status(201).json(task);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: e.response?.data || { message: e.message } });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running → http://localhost:${PORT}`));
