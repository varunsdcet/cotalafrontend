import { useState } from "react";
import { copyText, downloadPhotoFile, embedCodeFor } from "./kit-download";
import { youtubeIdFrom } from "./listing-photos";
import { kitBtnSm } from "./kit-ui";

type Props = {
  tourId: string;
  fileUrl?: string;
  youtubeUrl?: string;
  poster?: string;
  address?: string;
};

export default function ListingVideo({ tourId, fileUrl, youtubeUrl, poster, address }: Props) {
  const [busy, setBusy] = useState<"dl" | "url" | "embed" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const ytId = youtubeIdFrom(youtubeUrl || fileUrl);
  const playUrl = fileUrl || "";
  const shareUrl = playUrl || youtubeUrl || "";
  const embedSrc = ytId ? `https://www.youtube.com/embed/${ytId}` : "";
  const embedCode = shareUrl ? embedCodeFor(shareUrl, address || "Listing video", "video") : "";

  const run = async (kind: "dl" | "url" | "embed", fn: () => Promise<void>) => {
    setNote(null);
    setBusy(kind);
    try {
      await fn();
      if (kind !== "dl") setNote("Copied");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section id="video" className="scroll-mt-44">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h3 className="text-xl font-semibold mb-0">
          Video <span className="text-sm font-mono text-white/40">{playUrl || ytId ? "1" : "0"}</span>
        </h3>
        <p className="text-white/45 text-sm mb-0">Listing walkthrough · download · embed</p>
      </div>

      {playUrl || ytId ? (
        <div className="rounded-xl overflow-hidden" style={{ background: "#0b0b0c", border: "1px solid #1a1a1a" }}>
          <div className="bg-black aspect-video">
            {playUrl ? (
              <video
                src={playUrl}
                poster={poster}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <iframe
                src={embedSrc}
                title={address || "Listing video"}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            )}
          </div>
          <div className="p-4 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold mr-auto mb-0">{address || "Property video"}</p>
            {playUrl ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  void run("dl", () => downloadPhotoFile(playUrl, `listing_${tourId}_video.mp4`))
                }
                className={kitBtnSm}
              >
                {busy === "dl" ? "Saving…" : "Download"}
              </button>
            ) : null}
            {youtubeUrl ? (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] uppercase tracking-wide border border-white/30 text-white px-3 py-1.5 rounded"
              >
                YouTube
              </a>
            ) : null}
            <button
              type="button"
              disabled={busy !== null || !shareUrl}
              onClick={() => void run("url", () => copyText(shareUrl))}
              className="text-[11px] uppercase tracking-wide border border-white/30 text-white px-3 py-1.5 rounded disabled:opacity-50"
            >
              {busy === "url" ? "…" : "Copy URL"}
            </button>
            <button
              type="button"
              disabled={busy !== null || !embedCode}
              onClick={() => void run("embed", () => copyText(embedCode))}
              className="text-[11px] uppercase tracking-wide border border-white/30 text-white px-3 py-1.5 rounded disabled:opacity-50"
            >
              {busy === "embed" ? "…" : "Copy embed"}
            </button>
            {note ? <span className="text-xs text-white/50">{note}</span> : null}
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-6" style={{ background: "#0b0b0c", border: "1px solid #1a1a1a" }}>
          <p className="text-white/60 mb-1">No walkthrough video on this listing yet.</p>
          <p className="text-white/40 text-sm mb-0">The social explainer reel still builds from this tour’s photos — use Reels below.</p>
        </div>
      )}
    </section>
  );
}
