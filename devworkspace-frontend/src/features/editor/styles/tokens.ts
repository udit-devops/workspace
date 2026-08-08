export const lab = {
  // workspace / app shell
  bgDeep: "#0a0a0e",
  bg: "#101015",
  bgRaised: "#16161c",
  bgHover: "#1c1c24",
  bgActive: "#23232d",

  // borders
  border: "#26262e",
  borderStrong: "#34343e",

  // text
  text: "#e6e6ec",
  textMuted: "#9a9aa6",
  textFaint: "#64646e",

  // lab accents (vintage instrument palette)
  amber: "#d4a017",
  amberBright: "#e6b840",
  teal: "#3fb6a8",
  tealBright: "#54d2c2",
  red: "#e0555f",
  green: "#4fd07a",
  blue: "#5a8fe0",

  // editor chrome
  editorBg: "#0c0c12",
  monospace: "'JetBrains Mono', 'Cascadia Code', 'IBM Plex Mono', monospace",
  uiFont: "'Inter', 'Segoe UI', system-ui, sans-serif",
} as const;

export type LabToken = typeof lab;