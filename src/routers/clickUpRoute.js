const express = require("express");
const {
  getWhoAmI,
  getSpaces,
  getSpaceLists,
  getFolders,
  getFolderLists,
  createTask,
} = require("../controllers/clickupController");

const router = express.Router();

router.get("/whoami", getWhoAmI);
router.get("/spaces/:teamId", getSpaces);
router.get("/space-lists/:spaceId", getSpaceLists);
router.get("/folders/:spaceId", getFolders);
router.get("/folder-lists/:folderId", getFolderLists);
router.post("/tasks/:listId", createTask);

module.exports = router;
