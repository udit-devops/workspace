import type { Request, Response } from "express";
import { notionService } from "../services/notionService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const connect = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const state = notionService.createState(req.user.id);
  res.redirect(notionService.getOAuthUrl(state));
});

export const callback = asyncHandler(async (req: Request, res: Response) => {
  const { code, error, state } = req.query;

  if (error) {
    return res.send(closePopupScript({ success: false, error: "User denied access" }));
  }

  if (!code || !state) {
    return res.send(closePopupScript({ success: false, error: "Missing code or state" }));
  }

  const userId = notionService.consumeState(state as string);
  if (!userId) {
    return res.send(closePopupScript({ success: false, error: "Invalid or expired state" }));
  }

  try {
    const tokenData = await notionService.exchangeCode(code as string);
    await notionService.saveIntegration(userId, tokenData);
    res.send(closePopupScript({ success: true, workspaceName: tokenData.workspaceName }));
  } catch (err: any) {
    res.send(closePopupScript({ success: false, error: err.message }));
  }
});

export const status = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const integration = await notionService.getIntegration(req.user.id);
  if (!integration) {
    return res.json({ connected: false });
  }
  return res.json({
    connected: true,
    workspaceName: integration.workspaceName,
    workspaceId: integration.workspaceId,
  });
});

export const pages = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const integration = await notionService.getIntegration(req.user.id);
  if (!integration) {
    return res.status(400).json({ message: "Notion not connected" });
  }

  const pages = await notionService.searchPages(integration.accessToken);
  res.json({ pages });
});

export const pageContent = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const { pageId } = req.params;
  const integration = await notionService.getIntegration(req.user.id);
  if (!integration) {
    return res.status(400).json({ message: "Notion not connected" });
  }

  const page = await notionService.getPageBlocks(integration.accessToken, pageId as string);
  res.json({ page });
});

export const updateBlock = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const { blockId } = req.params;
  const { text, type } = req.body;
  const integration = await notionService.getIntegration(req.user.id);
  if (!integration) {
    return res.status(400).json({ message: "Notion not connected" });
  }

  await notionService.updateBlock(integration.accessToken, blockId as string, text, type);
  res.json({ success: true });
});

export const addBlocks = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const { pageId } = req.params;
  const { blocks } = req.body;
  const integration = await notionService.getIntegration(req.user.id);
  if (!integration) {
    return res.status(400).json({ message: "Notion not connected" });
  }

  const result = await notionService.appendBlocks(integration.accessToken, pageId as string, blocks);
  const newBlocks = (result.results || []).map((b: any) => ({
    id: b.id,
    type: b.type,
    text: "",
  }));
  res.json({ blocks: newBlocks });
});

export const removeBlock = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const { blockId } = req.params;
  const integration = await notionService.getIntegration(req.user.id);
  if (!integration) {
    return res.status(400).json({ message: "Notion not connected" });
  }

  await notionService.deleteBlock(integration.accessToken, blockId as string);
  res.json({ success: true });
});

export const createPage = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const { parentPageId, title } = req.body;
  const integration = await notionService.getIntegration(req.user.id);
  if (!integration) {
    return res.status(400).json({ message: "Notion not connected" });
  }

  const page = await notionService.createPage(integration.accessToken, parentPageId, title);
  res.json({ page });
});

export const disconnect = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  await notionService.disconnect(req.user.id);
  res.json({ message: "Disconnected" });
});

function closePopupScript(data: Record<string, unknown>) {
  return `<!DOCTYPE html><html><body><script>
    window.opener.postMessage(${JSON.stringify(data)}, "${process.env.CLIENT_URL || "http://localhost:5173"}");
    window.close();
  </script></body></html>`;
}
