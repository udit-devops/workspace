import { useRef, useMemo } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

const STORAGE_KEY = "devworkspace-excalidraw";

export default function FigmaPanel() {
  const unsubRef = useRef<(() => void) | null>(null);

  const initialData = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Excalidraw expects collaborators as a Map. JSON.stringify turns
      // Maps into empty objects, so we reconstruct them here.
      if (data.appState?.collaborators && !(data.appState.collaborators instanceof Map)) {
        data.appState.collaborators = new Map(Object.entries(data.appState.collaborators));
      }
      if (data.collaborators && !(data.collaborators instanceof Map)) {
        data.collaborators = new Map(Object.entries(data.collaborators));
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  return (
    <>
      <style>{`.excalidraw .SVGLayer{position:absolute!important;width:100%!important;height:100%!important;top:0!important;left:0!important}`}</style>
      <div style={{ flex: 1, position: "relative", overflow: "hidden", height: "100%" }}>
        <Excalidraw
          theme="dark"
          autoFocus
          initialData={initialData}
          excalidrawAPI={(api) => {
            if (!unsubRef.current) {
              unsubRef.current = api.onChange((elements, appState, files) => {
                try {
                  // appState.collaborators is a Map — JSON.stringify would turn
                  // it into {}. Convert to a plain object before serializing.
                  const state = {
                    elements: Array.from(elements),
                    appState: {
                      ...appState,
                      collaborators: Object.fromEntries(
                        appState.collaborators ?? [],
                      ),
                    },
                    files: { ...files },
                    collaborators: Object.fromEntries(
                      appState.collaborators ?? [],
                    ),
                  };
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                } catch {
                  /* quota or serialization error — silently ignore */
                }
              });
            }
          }}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              clearCanvas: false,
              export: false,
              loadScene: false,
              saveToActiveFile: false,
              saveAsImage: false,
              toggleTheme: false,
            },
          }}
        />
      </div>
    </>
  );
}
