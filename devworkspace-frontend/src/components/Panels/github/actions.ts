import { apiErrorMessage } from "../../../api/api";
import type { PanelCtx } from "./context";

/**
 * Runs a git action with consistent feedback: success toast, error toast with
 * git's own message, then a status refresh either way.
 */
export async function runGitAction(
  ctx: Pick<PanelCtx, "toast" | "refreshStatus" | "bumpRevision">,
  label: string,
  fn: () => Promise<unknown>,
  success?: { title: string; body?: string }
): Promise<boolean> {
  try {
    await fn();
    if (success) ctx.toast("success", success.title, success.body);
    return true;
  } catch (err) {
    ctx.toast("error", `${label} failed`, apiErrorMessage(err, `${label} failed`));
    return false;
  } finally {
    ctx.bumpRevision();
    await ctx.refreshStatus();
  }
}
