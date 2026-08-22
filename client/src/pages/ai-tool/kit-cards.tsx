import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { downloadNodeAsJpeg, shareNodeAsJpeg, copyText, embedCodeFor } from "./kit-download";

export type KitBrand = {
  name: string;
  phone: string;
  brokerage: string;
  logo: string;
  headshot: string;
  bg: string;
  text: string;
  accent: string;
};

export type KitListing = {
  address: string;
  mls: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  lot?: string;
  description?: string;
};

type CardProps = {
  photo: string;
  extra?: string[];
  listing: KitListing;
  brand: KitBrand;
  onEdit?: () => void;
  downloadName: string;
  ribbon?: string;
  title?: string;
  chrome?: boolean;
  shareUrl?: string;
};

function KitPhoto({ src, className, style }: { src: string; className?: string; style?: CSSProperties }) {
  if (!src) return <div className={className} style={{ ...style, background: "#1a1a1a" }} />;
  return (
    <img
      src={src}
      alt=""
      crossOrigin="anonymous"
      className={className}
      style={style}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

function CardChrome({
  title,
  label,
  onEdit,
  onDownload,
  onShare,
  shareUrl,
  chrome = true,
  children,
}: {
  title?: string;
  label: string;
  onEdit?: () => void;
  onDownload: () => Promise<void> | void;
  onShare?: () => Promise<void> | void;
  shareUrl?: string;
  chrome?: boolean;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState<"dl" | "share" | "url" | "embed" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async (kind: "dl" | "share" | "url" | "embed", fn: () => Promise<void> | void) => {
    setErr(null);
    setBusy(kind);
    try {
      await fn();
      if (kind === "url" || kind === "embed") setErr("Copied");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };
  if (!chrome) return <>{children}</>;
  const embed = shareUrl ? embedCodeFor(shareUrl, title || label, "image") : "";
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#111114",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
      }}
    >
      <div className="overflow-hidden bg-black">{children}</div>
      <div className="px-3.5 py-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[15px] font-semibold mb-0 truncate">{title || label}</p>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#E8A13D] border border-[#E8A13D]/45 rounded-full px-2 py-0.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8A13D]" />
            Ready
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {onEdit ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-[13px] font-semibold text-[#B082F2] hover:text-white bg-transparent border-0 p-0"
            >
              Edit
            </button>
          ) : null}
          {shareUrl ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={(e) => {
                e.stopPropagation();
                void run("url", () => copyText(shareUrl));
              }}
              className="text-[13px] font-semibold text-white/70 hover:text-white bg-transparent border-0 p-0 disabled:opacity-50"
            >
              {busy === "url" ? "…" : "Copy URL"}
            </button>
          ) : null}
          {embed ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={(e) => {
                e.stopPropagation();
                void run("embed", () => copyText(embed));
              }}
              className="text-[13px] font-semibold text-white/70 hover:text-white bg-transparent border-0 p-0 disabled:opacity-50"
            >
              {busy === "embed" ? "…" : "Copy embed"}
            </button>
          ) : null}
          {onShare ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={(e) => {
                e.stopPropagation();
                void run("share", onShare);
              }}
              className="text-[13px] font-semibold text-white/70 hover:text-white bg-transparent border-0 p-0 disabled:opacity-50"
            >
              {busy === "share" ? "…" : "Share"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy !== null}
            onClick={(e) => {
              e.stopPropagation();
              void run("dl", onDownload);
            }}
            className="text-[13px] font-semibold text-white/70 hover:text-white bg-transparent border-0 p-0 disabled:opacity-50"
          >
            {busy === "dl" ? "Saving…" : "Download"}
          </button>
        </div>
        {err ? <p className={`text-xs mt-1.5 mb-0 ${err === "Copied" ? "text-[#B082F2]" : "text-red-400"}`}>{err}</p> : null}
      </div>
    </div>
  );
}

function statsLine(listing: KitListing) {
  return [listing.beds && `${listing.beds} bd`, listing.baths && `${listing.baths} ba`, listing.sqft && `${listing.sqft} sf`]
    .filter(Boolean)
    .join(" · ");
}

export function StoryCard({ photo, listing, brand, onEdit, downloadName, ribbon = "JUST LISTED", title, chrome }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <CardChrome
      title={title}
      chrome={chrome}
      shareUrl={photo}
      label="Story 9:16"
      onEdit={onEdit}
      onDownload={() => downloadNodeAsJpeg(ref.current, downloadName)}
      onShare={() => shareNodeAsJpeg(ref.current, downloadName, listing.address)}
    >
      <div
        ref={ref}
        onClick={onEdit}
        className="relative overflow-hidden cursor-pointer"
        style={{
          width: 180,
          height: 320,
          background: brand.bg,
          color: brand.text,
        }}
      >
        <KitPhoto src={photo} className="absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.12) 45%, transparent 70%)" }}
        />
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          {brand.logo ? (
            <img src={brand.logo} alt="" crossOrigin="anonymous" className="h-7 max-w-[72px] object-contain" />
          ) : (
            <span className="text-[10px] font-semibold tracking-wide" style={{ color: brand.accent }}>
              {ribbon}
            </span>
          )}
          {brand.headshot ? (
            <img
              src={brand.headshot}
              alt=""
              crossOrigin="anonymous"
              className="w-8 h-8 rounded-full object-cover border-2"
              style={{ borderColor: brand.accent }}
            />
          ) : null}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: brand.accent }}>
            {ribbon}
          </p>
          <p className="text-[11px] font-semibold leading-tight mb-1 text-white">{listing.address}</p>
          {listing.price ? <p className="text-sm font-bold mb-0 text-white">{listing.price}</p> : null}
          <p className="text-[10px] text-white/80 mb-0 mt-1">{statsLine(listing)}</p>
        </div>
      </div>
    </CardChrome>
  );
}

export function SquareCard({ photo, listing, brand, onEdit, downloadName, title, chrome }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <CardChrome
      title={title}
      chrome={chrome}
      shareUrl={photo}
      label="Square 1:1"
      onEdit={onEdit}
      onDownload={() => downloadNodeAsJpeg(ref.current, downloadName)}
      onShare={() => shareNodeAsJpeg(ref.current, downloadName, listing.address)}
    >
      <div
        ref={ref}
        onClick={onEdit}
        className="relative overflow-hidden cursor-pointer"
        style={{ width: 220, height: 220, background: brand.bg, color: brand.text }}
      >
        <KitPhoto src={photo} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 p-3" style={{ background: "rgba(0,0,0,0.72)" }}>
          <p className="text-[11px] font-semibold leading-tight mb-0 text-white">{listing.address}</p>
          {listing.price ? <p className="text-xs font-bold mb-0 mt-1" style={{ color: brand.accent }}>{listing.price}</p> : null}
        </div>
      </div>
    </CardChrome>
  );
}

export function LandscapeCard({ photo, extra = [], listing, brand, onEdit, downloadName, title, chrome }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const side = extra[0];
  return (
    <CardChrome
      title={title}
      chrome={chrome}
      shareUrl={photo}
      label="Landscape 16:9"
      onEdit={onEdit}
      onDownload={() => downloadNodeAsJpeg(ref.current, downloadName)}
      onShare={() => shareNodeAsJpeg(ref.current, downloadName, listing.address)}
    >
      <div
        ref={ref}
        onClick={onEdit}
        className="relative overflow-hidden cursor-pointer flex"
        style={{ width: 320, height: 180, background: brand.bg, color: brand.text }}
      >
        <KitPhoto src={photo} className="h-full object-cover" style={{ width: side ? "62%" : "100%" }} />
        {side ? <KitPhoto src={side} className="h-full object-cover" style={{ width: "38%" }} /> : null}
        <div
          className="absolute inset-x-0 bottom-0 px-3 py-2 flex items-end justify-between gap-2"
          style={{ background: "rgba(0,0,0,0.65)" }}
        >
          <div>
            <p className="text-[11px] font-semibold leading-tight mb-0 text-white">{listing.address}</p>
            {listing.price ? <p className="text-xs font-bold mb-0 text-white">{listing.price}</p> : null}
          </div>
          <span className="text-[10px] font-medium" style={{ color: brand.accent }}>
            {brand.name || "Cotala"}
          </span>
        </div>
      </div>
    </CardChrome>
  );
}

export function PostcardFront({
  photos,
  listing,
  brand,
  onEditSlot,
  downloadName,
  title,
  chrome,
}: {
  photos: string[];
  listing: KitListing;
  brand: KitBrand;
  onEditSlot?: (slot: number) => void;
  downloadName: string;
  title?: string;
  chrome?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hero = photos[0] || "";
  const thumbs = photos.slice(1, 4);
  return (
    <CardChrome
      title={title}
      chrome={chrome}
      shareUrl={hero}
      label={'Postcard 8.5" × 5.5" · Front'}
      onEdit={onEditSlot ? () => onEditSlot(0) : undefined}
      onDownload={() => downloadNodeAsJpeg(ref.current, downloadName)}
      onShare={() => shareNodeAsJpeg(ref.current, downloadName, listing.address)}
    >
      <div
        ref={ref}
        className="relative overflow-hidden"
        style={{ width: 340, height: 220, background: "#111", color: "#fff" }}
      >
        <div className="flex h-full">
          <div
            role="button"
            tabIndex={0}
            className="relative h-full cursor-pointer"
            style={{ width: "62%" }}
            onClick={() => onEditSlot?.(0)}
            onKeyDown={(e) => e.key === "Enter" && onEditSlot?.(0)}
          >
            {hero ? (
              <KitPhoto src={hero} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            )}
          </div>
          <div className="flex flex-col flex-1" style={{ background: brand.bg, color: brand.text }}>
            {[0, 1, 2].map((i) => {
              const src = thumbs[i] || "";
              return (
                <div
                  key={`pc-thumb-${i}`}
                  role="button"
                  tabIndex={0}
                  className="relative flex-1 overflow-hidden cursor-pointer"
                  onClick={() => onEditSlot?.(i + 1)}
                  onKeyDown={(e) => e.key === "Enter" && onEditSlot?.(i + 1)}
                >
                  {src ? (
                    <KitPhoto src={src} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none px-3 py-2"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82), transparent)" }}
        >
          <p className="text-[12px] font-semibold mb-0 leading-tight text-white">{listing.address}</p>
          {listing.price ? <p className="text-sm font-bold mb-0" style={{ color: brand.accent }}>{listing.price}</p> : null}
        </div>
      </div>
    </CardChrome>
  );
}

export function PostcardBack({
  listing,
  brand,
  downloadName,
  title,
  chrome,
}: {
  listing: KitListing;
  brand: KitBrand;
  downloadName: string;
  title?: string;
  chrome?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <CardChrome
      title={title}
      chrome={chrome}
      label={'Postcard 8.5" × 5.5" · Back'}
      onDownload={() => downloadNodeAsJpeg(ref.current, downloadName)}
      onShare={() => shareNodeAsJpeg(ref.current, downloadName, listing.address)}
    >
      <div
        ref={ref}
        className="flex"
        style={{ width: 340, height: 220, background: "#f4f1ea", color: "#111" }}
      >
        <div className="flex-1 p-4 flex flex-col justify-between" style={{ borderRight: "1px dashed #bbb" }}>
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: brand.accent }}>
              Just listed
            </p>
            <p className="text-sm font-semibold leading-tight mb-2">{listing.address}</p>
            <p className="text-xs mb-0">
              {[listing.beds && `${listing.beds} bed`, listing.baths && `${listing.baths} bath`, listing.sqft && `${listing.sqft} sqft`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {listing.mls ? <p className="text-[10px] text-black/50 mb-0 mt-2">MLS® {listing.mls}</p> : null}
          </div>
          {listing.price ? <p className="text-lg font-bold mb-0">{listing.price}</p> : null}
        </div>
        <div className="w-[42%] p-4 flex flex-col items-center justify-center text-center gap-2">
          {brand.headshot ? (
            <img src={brand.headshot} alt="" crossOrigin="anonymous" className="w-14 h-14 rounded-full object-cover" />
          ) : null}
          <p className="text-sm font-semibold mb-0">{brand.name}</p>
          {brand.brokerage ? <p className="text-[10px] text-black/60 mb-0">{brand.brokerage}</p> : null}
          {brand.phone ? <p className="text-xs mb-0">{brand.phone}</p> : null}
          {brand.logo ? (
            <img src={brand.logo} alt="" crossOrigin="anonymous" className="h-8 max-w-[90px] object-contain mt-1" />
          ) : null}
        </div>
      </div>
    </CardChrome>
  );
}

export function PinterestCard({ photo, extra = [], listing, brand, onEdit, downloadName, title, chrome }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const stack = [photo, extra[0], extra[1]].filter(Boolean);
  return (
    <CardChrome
      title={title}
      chrome={chrome}
      shareUrl={photo}
      label="Pinterest 1000×1500"
      onEdit={onEdit}
      onDownload={() => downloadNodeAsJpeg(ref.current, downloadName)}
      onShare={() => shareNodeAsJpeg(ref.current, downloadName, listing.address)}
    >
      <div
        ref={ref}
        onClick={onEdit}
        className="relative overflow-hidden cursor-pointer"
        style={{ width: 200, height: 300, background: brand.bg, color: brand.text }}
      >
        {stack.length > 1 ? (
          <div className="flex flex-col h-full">
            <KitPhoto src={stack[0]} className="w-full object-cover" style={{ height: "58%" }} />
            <div className="flex flex-1">
              {stack.slice(1, 3).map((src, i) => (
                <KitPhoto key={`pin-${i}`} src={src} className="h-full object-cover flex-1" />
              ))}
            </div>
          </div>
        ) : (
          <KitPhoto src={photo} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-x-0 bottom-0 p-3" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88), transparent)" }}>
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: brand.accent }}>
            Just listed
          </p>
          <p className="text-[12px] font-semibold leading-tight mb-0 text-white">{listing.address}</p>
          {listing.price ? <p className="text-sm font-bold mb-0 text-white">{listing.price}</p> : null}
        </div>
      </div>
    </CardChrome>
  );
}

export function FlyerCard({
  photo,
  extra = [],
  listing,
  brand,
  onEdit,
  downloadName,
  ribbon = "JUST LISTED",
  title,
  chrome,
}: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <CardChrome
      title={title}
      chrome={chrome}
      shareUrl={photo}
      label={'Flyer 8.5" × 11"'}
      onEdit={onEdit}
      onDownload={() => downloadNodeAsJpeg(ref.current, downloadName)}
      onShare={() => shareNodeAsJpeg(ref.current, downloadName, listing.address)}
    >
      <div
        ref={ref}
        onClick={onEdit}
        className="relative overflow-hidden cursor-pointer flex flex-col"
        style={{ width: 220, height: 286, background: "#111", color: "#fff" }}
      >
        <div className="px-3 py-2 flex items-center justify-between" style={{ background: brand.bg, color: brand.text }}>
          <span className="text-[10px] font-semibold tracking-widest" style={{ color: brand.accent }}>
            {ribbon}
          </span>
          {brand.logo ? (
            <img src={brand.logo} alt="" crossOrigin="anonymous" className="h-5 max-w-[70px] object-contain" />
          ) : null}
        </div>
        <KitPhoto src={photo} className="w-full object-cover" style={{ height: 128 }} />
        {extra[0] ? (
          <div className="flex" style={{ height: 44 }}>
            {extra.slice(0, 3).map((src, i) => (
              <KitPhoto key={`fly-${i}`} src={src} className="h-full object-cover flex-1" />
            ))}
          </div>
        ) : null}
        <div className="flex-1 px-3 py-2 flex flex-col justify-between" style={{ background: "#0b0b0b" }}>
          <div>
            <p className="text-[11px] font-semibold leading-tight mb-1">{listing.address}</p>
            {listing.price ? <p className="text-sm font-bold mb-1" style={{ color: brand.accent }}>{listing.price}</p> : null}
            <p className="text-[10px] text-white/70 mb-0">{statsLine(listing)}</p>
            {listing.mls ? <p className="text-[9px] text-white/40 mb-0 mt-1">MLS® {listing.mls}</p> : null}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {brand.headshot ? (
              <img src={brand.headshot} alt="" crossOrigin="anonymous" className="w-8 h-8 rounded-full object-cover" />
            ) : null}
            <div>
              <p className="text-[10px] font-semibold mb-0">{brand.name}</p>
              {brand.phone ? <p className="text-[9px] text-white/60 mb-0">{brand.phone}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </CardChrome>
  );
}

export function BrochureCard({
  photos,
  listing,
  brand,
  onEdit,
  downloadName,
  title,
  chrome,
}: {
  photos: string[];
  listing: KitListing;
  brand: KitBrand;
  onEdit?: () => void;
  downloadName: string;
  title?: string;
  chrome?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <CardChrome
      title={title}
      chrome={chrome}
      shareUrl={photos[0]}
      label="Brochure · bi-fold"
      onEdit={onEdit}
      onDownload={() => downloadNodeAsJpeg(ref.current, downloadName)}
      onShare={() => shareNodeAsJpeg(ref.current, downloadName, listing.address)}
    >
      <div
        ref={ref}
        onClick={onEdit}
        className="relative overflow-hidden cursor-pointer flex"
        style={{ width: 340, height: 220, background: brand.bg, color: brand.text }}
      >
        <div className="relative" style={{ width: "52%" }}>
          <KitPhoto src={photos[0] || ""} className="w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 p-2" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
            <p className="text-[11px] font-semibold mb-0 text-white leading-tight">{listing.address}</p>
            {listing.price ? <p className="text-xs font-bold mb-0 text-white">{listing.price}</p> : null}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex flex-1">
            <KitPhoto src={photos[1] || photos[0] || ""} className="w-1/2 h-full object-cover" />
            <KitPhoto src={photos[2] || photos[0] || ""} className="w-1/2 h-full object-cover" />
          </div>
          <div className="p-2" style={{ background: brand.bg }}>
            <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: brand.accent }}>
              Just listed
            </p>
            <p className="text-[10px] mb-0 text-white/80">{statsLine(listing)}</p>
            <p className="text-[10px] font-semibold mb-0 mt-1">{brand.name}</p>
          </div>
        </div>
      </div>
    </CardChrome>
  );
}

export function EmailBannerCard({ photo, listing, brand, onEdit, downloadName, title, chrome }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <CardChrome
      title={title}
      chrome={chrome}
      shareUrl={photo}
      label="Email banner 16:9"
      onEdit={onEdit}
      onDownload={() => downloadNodeAsJpeg(ref.current, downloadName)}
      onShare={() => shareNodeAsJpeg(ref.current, downloadName, listing.address)}
    >
      <div
        ref={ref}
        onClick={onEdit}
        className="relative overflow-hidden cursor-pointer"
        style={{ width: 360, height: 120, background: brand.bg, color: brand.text }}
      >
        <KitPhoto src={photo} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.2) 70%)" }} />
        <div className="absolute inset-0 p-3 flex flex-col justify-center">
          <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: brand.accent }}>
            Just listed
          </p>
          <p className="text-[12px] font-semibold leading-tight mb-0 text-white max-w-[70%]">{listing.address}</p>
          {listing.price ? <p className="text-sm font-bold mb-0 text-white">{listing.price}</p> : null}
        </div>
      </div>
    </CardChrome>
  );
}

export function PhotoPicker({
  photos,
  selected,
  title = "Replace with a listing photo",
  onPick,
  onClose,
}: {
  photos: string[];
  selected?: string;
  title?: string;
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");
  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.72)" }} onClick={onClose}>
      <div
        className="rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
        style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <h3 className="text-white text-base mb-0">{title}</h3>
          <button type="button" className="text-white/60 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {photos.length === 0 ? (
            <p className="text-white/50">No listing photos available to pick.</p>
          ) : (
            <>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter #…"
                className="mb-3 w-full rounded px-3 py-2 text-sm text-white"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)" }}
              />
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {photos.map((url, idx) => {
                  const n = String(idx + 1);
                  if (filter && !n.includes(filter.trim())) return null;
                  const isOn = selected === url;
                  return (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      className="relative border-0 p-0 rounded overflow-hidden aspect-square"
                      style={{ outline: isOn ? "2px solid #B082F2" : "none" }}
                      onClick={() => onPick(url)}
                    >
                      <img src={url} alt={`#${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 text-[10px] text-white px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.7)" }}>
                        #{idx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
