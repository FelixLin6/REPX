export default function UnityEmbedPlaceholder({ iframeRef }) {
  return (
    <div className="card w-full aspect-video overflow-hidden border border-border bg-black">
      <iframe
        ref={iframeRef}
        title="Unity WebGL"
        src="/unity/index.html"
        className="w-full h-full"
        allow="autoplay; fullscreen"
        loading="lazy"
      />
    </div>
  );
}
