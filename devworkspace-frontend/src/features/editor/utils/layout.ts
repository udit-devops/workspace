import type { LayoutNode, SplitDirection } from "../types";

export function createPaneNode(id: string): LayoutNode {
  return { kind: "pane", id };
}

let paneCounter = 0;

export function nextPaneId(): string {
  paneCounter += 1;
  return `pane-${paneCounter}`;
}

/** Replace the leaf with `id` by a split of `leaf` and a fresh `newId` pane. */
export function splitPane(
  node: LayoutNode,
  paneId: string,
  direction: SplitDirection,
  newPaneId: string
): LayoutNode {
  if (node.kind === "pane") {
    if (node.id !== paneId) return node;
    return {
      kind: "split",
      direction,
      ratio: 0.5,
      left: node,
      right: { kind: "pane", id: newPaneId },
    };
  }
  return {
    ...node,
    left: splitPane(node.left, paneId, direction, newPaneId),
    right: splitPane(node.right, paneId, direction, newPaneId),
  };
}

/** Remove a pane by id; when a split loses a child it collapses into the survivor. */
export function closePane(node: LayoutNode, paneId: string): LayoutNode | null {
  if (node.kind === "pane") {
    if (node.id === paneId) return null;
    return node;
  }

  const left = closePane(node.left, paneId);
  const right = closePane(node.right, paneId);

  if (!left) return right;
  if (!right) return left;
  return { ...node, left, right };
}

/** Collect every pane id in the tree. */
export function collectPaneIds(node: LayoutNode, acc: string[] = []): string[] {
  if (node.kind === "pane") {
    acc.push(node.id);
    return acc;
  }
  collectPaneIds(node.left, acc);
  collectPaneIds(node.right, acc);
  return acc;
}

/** Update the ratio of the split that was clicked (identified by structural walk). */
export function updateSplitRatio(
  node: LayoutNode,
  targetSplit: LayoutNode,
  ratio: number
): LayoutNode {
  if (node === targetSplit && node.kind === "split") {
    return { ...node, ratio };
  }
  if (node.kind === "split") {
    return {
      ...node,
      left: updateSplitRatio(node.left, targetSplit, ratio),
      right: updateSplitRatio(node.right, targetSplit, ratio),
    };
  }
  return node;
}
