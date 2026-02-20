import { useRef, useEffect } from "react";

export default function UnityEmbedPlaceholder() {
  const containerRef = useRef(null);

  useEffect(() => {
    // TODO: Insert Unity WebGL embed here (canvas/iframe/scripts)
    // Example: createUnityInstance(containerRef.current, unityConfig);
  }, []);

  return (
    <div
      ref={containerRef}
      className="card w-full aspect-video flex items-center justify-center text-text-secondary text-sm"
    >
      Animation placeholder (Unity WebGL embed)
    </div>
  );
}
