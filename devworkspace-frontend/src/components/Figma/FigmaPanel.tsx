import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

export default function FigmaPanel() {
  return (
    <div className="excalidraw-container" style={{
      flex: 1,
      position: "relative",
    }}>
      <Excalidraw
        theme="dark"
        autoFocus
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
  );
}
