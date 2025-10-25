// clickup.js
const axios = require("axios");

/** ---- TOKEN GUARDS (personal token path) ---- */
const rawToken = (process.env.CLICKUP_TOKEN || "").trim();
if (!rawToken) {
  throw new Error("Missing CLICKUP_TOKEN env var (expected a personal token starting with pk_)");
}
if (/^Bearer\s/i.test(rawToken)) {
  throw new Error(
    "Remove 'Bearer ' — with a personal token you must send the token as-is (pk_XXXX) in the Authorization header."
  );
}

/** ---- Axios instance ---- */
const api = axios.create({
  baseURL: "https://api.clickup.com/api/v2",
  headers: {
    Authorization: rawToken,           // EXACTLY pk_...
    "Content-Type": "application/json"
  },
  timeout: 15000
});

/** ---- Thin wrappers over ClickUp REST ---- */
async function getTeams() {
  const { data } = await api.get("/team");
  return data; // { teams: [...] }
}

async function getSpaces(teamId) {
  const { data } = await api.get(`/team/${teamId}/space`);
  return data; // { spaces: [...] }
}

async function getSpaceLists(spaceId) {
  const { data } = await api.get(`/space/${spaceId}/list`);
  return data; // { lists: [...] }
}

async function getFolders(spaceId) {
  const { data } = await api.get(`/space/${spaceId}/folder`);
  return data; // { folders: [...] }
}

async function getFolderLists(folderId) {
  const { data } = await api.get(`/folder/${folderId}/list`);
  return data; // { lists: [...] }
}

/**
 * Create a task in a List.
 * @param {string} listId ClickUp List ID
 * @param {object} payload Minimal: { name }, optional: description, assignees, tags, status, due_date(ms), priority(1..4), time_estimate(ms), custom_fields
 */
async function createTask(listId, payload) {
  const { data } = await api.post(`/list/${listId}/task`, payload);
  return data; // task object
}

module.exports = {
  getTeams,
  getSpaces,
  getSpaceLists,
  getFolders,
  getFolderLists,
  createTask
};
