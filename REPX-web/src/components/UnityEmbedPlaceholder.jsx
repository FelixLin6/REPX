import { useRef } from "react";

export default function UnityEmbedPlaceholder({ iframeRef }) {
  const localRef = useRef(null);
  const ref = iframeRef || localRef;

  return (
    <div className="card w-full aspect-video overflow-hidden border border-border bg-black">
      <iframe
        ref={ref}
        title="Unity WebGL"
        src="/unity/index.html"
        className="w-full h-full"
        allow="autoplay; fullscreen"
        loading="lazy"
      />
    </div>
  );
}
