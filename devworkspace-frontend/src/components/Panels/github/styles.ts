import type { CSSProperties } from "react";
import { gh } from "./theme";

export const inputStyle: CSSProperties = {
  width: "100%", boxSizing: "border-box", height: 34, padding: "0 11px", borderRadius: 8,
  background: gh.surface, border: `1px solid ${gh.border}`, color: gh.text,
  fontSize: 12.5, outline: "none", fontFamily: gh.font,
};
