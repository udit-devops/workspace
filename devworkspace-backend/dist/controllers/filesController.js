import { fileService } from "../services/fileService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getSandboxRoot } from "../utils/pathGuard.js";
export const getRoot = asyncHandler(async (_req, res) => {
    const root = await getSandboxRoot();
    res.json({ root });
});
export const getDirs = asyncHandler(async (req, res) => {
    const workspace = readWorkspace(req);
    const dirPath = readPath(req);
    const dirs = await fileService.listDirs(workspace, dirPath);
    res.json({ path: dirPath, dirs });
});
export const getTree = asyncHandler(async (req, res) => {
    const workspace = readWorkspace(req);
    const tree = await fileService.getTree(workspace);
    res.json({ workspace, tree });
});
export const readFile = asyncHandler(async (req, res) => {
    const workspace = readWorkspace(req);
    const filePath = readPath(req);
    const file = await fileService.readFile(workspace, filePath);
    res.json({ file });
});
export const writeFile = asyncHandler(async (req, res) => {
    const workspace = readWorkspace(req);
    const filePath = readPath(req);
    const { content } = req.body ?? {};
    if (typeof content !== "string") {
        return res.status(400).json({ message: "content must be a string" });
    }
    const file = await fileService.writeFile(workspace, filePath, content);
    res.json({ file });
});
export const createItem = asyncHandler(async (req, res) => {
    const workspace = readWorkspace(req);
    const { parentPath, name, type } = req.body ?? {};
    if (type !== "file" && type !== "directory") {
        return res.status(400).json({ message: "type must be 'file' or 'directory'" });
    }
    const entry = await fileService.createItem(workspace, readWorkspaceScope(parentPath, req), String(name ?? ""), type);
    res.status(201).json({ entry });
});
export const deleteItem = asyncHandler(async (req, res) => {
    const workspace = readWorkspace(req);
    const filePath = readPath(req);
    const result = await fileService.deleteItem(workspace, filePath);
    res.json({ result });
});
function readWorkspace(req) {
    const workspace = req.query.workspace || req.body?.workspace;
    if (!workspace)
        throw badRequest("workspace is required");
    return workspace;
}
function readPath(req) {
    const filePath = req.query.path || req.body?.path;
    if (!filePath)
        throw badRequest("path is required");
    return filePath;
}
// parentPath may live under either the query workspace or its own body field.
function readWorkspaceScope(parentPath, req) {
    if (typeof parentPath === "string" && parentPath.length > 0)
        return parentPath;
    throw badRequest("parentPath is required");
}
function badRequest(message) {
    const err = new Error(message);
    err.statusCode = 400;
    return err;
}
