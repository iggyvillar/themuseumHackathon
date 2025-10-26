const {
  getTeams,
  getSpaces: getSpacesService,
  getSpaceLists: getSpaceListsService,
  getFolders: getFoldersService,
  getFolderLists: getFolderListsService,
  createTask: createTaskService,
} = require("../services/clickupServices");

/** Show which Workspaces (teams) your token can access */
const getWhoAmI = async (_req, res) => {
  try {
    const data = await getTeams();
    res.json(data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json(e.response?.data || { message: e.message });
  }
};

/** List Spaces in a team (pass ?teamId=... or set CLICKUP_TEAM_ID in .env) */
const getSpaces = async (req, res) => {
  try {
    const teamId = req.params.teamId || process.env.CLICKUP_TEAM_ID;
    if (!teamId) return res.status(400).json({ error: "Provide teamId query or set CLICKUP_TEAM_ID" });
    const data = await getSpacesService(teamId);
    res.json(data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json(e.response?.data || { message: e.message });
  }
};

/** Folderless Lists in a Space */
const getSpaceLists = async (req, res) => {
  try {
    const data = await getSpaceListsService(req.params.spaceId);
    res.json(data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json(e.response?.data || { message: e.message });
  }
};

/** Folders in a Space + Lists in a Folder (for spaces that use folders) */
const getFolders = async (req, res) => {
  try {
    const data = await getFoldersService(req.params.spaceId);
    res.json(data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json(e.response?.data || { message: e.message });
  }
};

/** Lists in a Folder */
const getFolderLists = async (req, res) => {
  try {
    const data = await getFolderListsService(req.params.folderId);
    res.json(data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json(e.response?.data || { message: e.message });
  }
};

/** Create a task */
const createTask = async (req, res) => {
  try {
    const listId = req.params.listId || process.env.CLICKUP_LIST_ID;
    if (!listId) return res.status(400).json({ error: "Provide listId query or set CLICKUP_LIST_ID" });

    const payload = {
      name: req.body.name,
      description: req.body.description,
      assignees: req.body.assignees,
      tags: req.body.tags,
      status: req.body.status,
      due_date: req.body.due_date,
      priority: req.body.priority,
      time_estimate: req.body.time_estimate,
      custom_fields: req.body.custom_fields,
    };

    if (!payload.name || !payload.name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    const task = await createTaskService(listId, payload);
    res.status(201).json(task);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: e.response?.data || { message: e.message } });
  }
};

module.exports = {
  getWhoAmI,
  getSpaces,
  getSpaceLists,
  getFolders,
  getFolderLists,
  createTask,
};
