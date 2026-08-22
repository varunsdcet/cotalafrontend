import type { KitBrand, KitListing } from "./kit-cards";
import {
  type CameraMove,
  type ReelLook,
  type ReelOrientation,
  PORTRAIT,
  XFADE,
  clamp,
  coverDraw,
  drawCinematicStill,
  drawDuskWash,
  drawVignette,
  lerp,
  pickMove,
  reelSize,
  roundRectPath,
  smoothstep,
  wrapText,
} from "./cinematic";

export type { ReelLook, ReelOrientation };
export { reelSize };

export const REEL_W = PORTRAIT.w;
export const REEL_H = PORTRAIT.h;
export const REEL_FPS = 30;
export const REEL_MAX_PHOTOS = 12;

export type BeatKind = "photo" | "collage" | "grid" | "contact";

export type PlannedBeat = {
  kind: BeatKind;
  urls: string[];
  caption: string;
  seconds: number;
  intro?: boolean;
  index: number;
  move?: CameraMove;
};

export type LoadedBeat = Omit<PlannedBeat, "urls"> & { images: HTMLImageElement[] };

export type ReelAssets = {
  headshot: HTMLImageElement | null;
  logo: HTMLImageElement | null;
};

export type ReelStyle = {
  look: ReelLook;
  orientation: ReelOrientation;
  captions: boolean;
};

const DEFAULT_STYLE: ReelStyle = {
  look: "cinematic",
  orientation: "portrait",
  captions: true,
};

function listingFacts(listing?: KitListing): string[] {
  return [
    listing?.price,
    [listing?.beds && `${listing.beds} bedrooms`, listing?.baths && `${listing.baths} bathrooms`].filter(Boolean).join(" · "),
    listing?.sqft && `${listing.sqft} sqft`,
    listing?.address,
    listing?.mls && `MLS® ${listing.mls}`,
  ].filter((item): item is string => Boolean(item && String(item).trim()));
}

export function planBeats(photos: string[], listing?: KitListing, look: ReelLook = "cinematic"): PlannedBeat[] {
  const urls = photos.filter(Boolean).slice(0, REEL_MAX_PHOTOS);
  const facts = listingFacts(listing);
  if (look === "montage") return planMontage(urls, facts);
  const beats: PlannedBeat[] = urls.map((url, i) => ({
    kind: "photo",
    urls: [url],
    caption: i === 0 || i === 3 || i === 6 ? facts[Math.max(0, i === 0 ? 0 : (i / 3) | 0) % Math.max(facts.length, 1)] || "" : "",
    seconds: i === 0 ? 5.4 : 4.8,
    intro: i === 0,
    index: i,
    move: pickMove(i),
  }));
  beats.push({ kind: "contact", urls: [], caption: "", seconds: 3.6, index: beats.length });
  return beats;
}

function planMontage(urls: string[], facts: string[]): PlannedBeat[] {
  const beats: PlannedBeat[] = [];
  let i = 0;
  let cycle = 0;
  let fact = 0;
  while (i < urls.length) {
    const left = urls.length - i;
    const slot = cycle % 4;
    if (i === 0) {
      beats.push({ kind: "photo", urls: [urls[0]], caption: "", seconds: 4, intro: true, index: 0, move: pickMove(0) });
      i += 1;
    } else if (slot === 2 && left >= 3) {
      beats.push({ kind: "collage", urls: urls.slice(i, i + 3), caption: "", seconds: 3.2, index: beats.length });
      i += 3;
    } else if (slot === 3 && left >= 4) {
      beats.push({ kind: "grid", urls: urls.slice(i, i + 4), caption: "", seconds: 3.2, index: beats.length });
      i += 4;
    } else {
      beats.push({
        kind: "photo",
        urls: [urls[i]],
        caption: facts[fact % Math.max(facts.length, 1)] || "",
        seconds: 2.8,
        index: beats.length,
        move: pickMove(beats.length),
      });
      fact += 1;
      i += 1;
    }
    cycle += 1;
  }
  beats.push({ kind: "contact", urls: [], caption: "", seconds: 4, index: beats.length });
  return beats;
}

export function reelDuration(beats: { seconds: number }[]) {
  return beats.reduce((s, b) => s + b.seconds, 0);
}

export function formatDuration(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export async function loadReelImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("img"));
      img.src = obj;
    });
  } catch {
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }
}

export async function loadBeatsAndAssets(
  photos: string[],
  brand: KitBrand,
  listing?: KitListing,
  look: ReelLook = "cinematic",
): Promise<{ beats: LoadedBeat[]; assets: ReelAssets }> {
  const planned = planBeats(photos, listing, look);
  const uniq = [...new Set(planned.flatMap((b) => b.urls))];
  const loaded = new Map<string, HTMLImageElement>();
  await Promise.all(
    uniq.map(async (url) => {
      const img = await loadReelImage(url);
      if (img) loaded.set(url, img);
    }),
  );
  const beats: LoadedBeat[] = planned
    .map((b) => ({ ...b, images: b.urls.map((u) => loaded.get(u)).filter(Boolean) as HTMLImageElement[] }))
    .filter((b) => b.kind === "contact" || b.images.length > 0);
  const [headshot, logo] = await Promise.all([
    brand.headshot ? loadReelImage(brand.headshot) : Promise.resolve(null),
    brand.logo ? loadReelImage(brand.logo) : Promise.resolve(null),
  ]);
  return { beats, assets: { headshot, logo } };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "•";
}

function displayFont(look: ReelLook) {
  return look === "luxury" ? "Playfair Display, Georgia, serif" : "Space Grotesk, Helvetica, Arial, sans-serif";
}

function drawCircleImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  cx: number,
  cy: number,
  r: number,
  fallback: string,
  initialsText: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max((r * 2) / iw, (r * 2) / ih);
    ctx.drawImage(img, cx - (iw * scale) / 2, cy - (ih * scale) / 2, iw * scale, ih * scale);
  } else {
    ctx.fillStyle = fallback;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#fff";
    ctx.font = `600 ${Math.round(r * 0.7)}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initialsText, cx, cy);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = Math.max(3, r * 0.05);
  ctx.stroke();
}

function drawPhotoBeat(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  beat: LoadedBeat,
  local: number,
  listing: KitListing,
  brand: KitBrand,
  style: ReelStyle,
) {
  const img = beat.images[0];
  if (!img) return;
  drawCinematicStill(ctx, img, w, h, local / beat.seconds, beat.move || pickMove(beat.index));
  drawDuskWash(ctx, w, h, 0.3);

  if (!style.captions) return;
  const font = displayFont(style.look);
  const u = Math.min(w, h);
  const pad = Math.round(u * 0.055);
  const fadeIn = smoothstep(clamp((local - 0.85) / 0.7, 0, 1));
  const fadeOut = local > beat.seconds - 0.7 ? clamp((beat.seconds - local) / 0.7, 0, 1) : 1;

  if (beat.intro) {
    ctx.save();
    ctx.globalAlpha = fadeIn * fadeOut;
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = `600 ${Math.round(u * 0.022)}px ${font}`;
    ctx.fillText("JUST LISTED", pad, h * 0.8);
    ctx.fillStyle = "#fff";
    ctx.font = `500 ${Math.round(u * 0.042)}px ${font}`;
    let y = h * 0.845;
    wrapText(ctx, listing.address || "Private listing", w * 0.78, 2).forEach((line) => {
      ctx.fillText(line, pad, y);
      y += Math.round(u * 0.048);
    });
    if (listing.price) {
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.font = `400 ${Math.round(u * 0.028)}px Instrument Sans, Helvetica, sans-serif`;
      ctx.fillText(listing.price, pad, y + 6);
    }
    ctx.restore();
    return;
  }

  if (!beat.caption) return;
  ctx.save();
  ctx.globalAlpha = fadeIn * fadeOut * 0.94;
  ctx.fillStyle = "#fff";
  ctx.font = `500 ${Math.round(u * 0.032)}px ${font}`;
  ctx.fillText(beat.caption, pad, h * 0.9);
  ctx.restore();
}

function drawCollage(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  beat: LoadedBeat,
  local: number,
  brand: KitBrand,
) {
  ctx.fillStyle = brand.bg || "#101214";
  ctx.fillRect(0, 0, w, h);
  const gap = Math.round(w * 0.018);
  const pics = beat.images.slice(0, 3);
  const zoom = (i: number) => lerp(1.04, 1.12 + i * 0.01, local / beat.seconds);
  if (pics.length >= 3) {
    const topH = (h - gap * 3) * 0.58;
    coverDraw(ctx, pics[0], gap, gap, w - gap * 2, topH, zoom(0));
    const botY = gap * 2 + topH;
    const botH = h - botY - gap;
    const cellW = (w - gap * 3) / 2;
    coverDraw(ctx, pics[1], gap, botY, cellW, botH, zoom(1));
    coverDraw(ctx, pics[2], gap * 2 + cellW, botY, cellW, botH, zoom(2));
  }
  drawVignette(ctx, w, h, 0.28);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  beat: LoadedBeat,
  local: number,
  brand: KitBrand,
) {
  ctx.fillStyle = brand.bg || "#101214";
  ctx.fillRect(0, 0, w, h);
  const gap = Math.round(w * 0.016);
  const cellW = (w - gap * 3) / 2;
  const cellH = (h - gap * 3) / 2;
  beat.images.slice(0, 4).forEach((img, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    coverDraw(ctx, img, gap + col * (cellW + gap), gap + row * (cellH + gap), cellW, cellH, lerp(1.04, 1.1, local / beat.seconds));
  });
  drawVignette(ctx, w, h, 0.28);
}

function drawContact(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  local: number,
  listing: KitListing,
  brand: KitBrand,
  assets: ReelAssets,
  look: ReelLook,
) {
  const cinematic = look !== "montage";
  ctx.fillStyle = cinematic ? brand.bg || "#12141A" : "#ffffff";
  ctx.fillRect(0, 0, w, h);
  if (cinematic) drawVignette(ctx, w, h, 0.35);
  const fade = smoothstep(clamp(local / 0.4, 0, 1));
  ctx.save();
  ctx.globalAlpha = fade;
  const cx = w / 2;
  const u = Math.min(w, h);
  let y = h * (cinematic ? 0.22 : 0.18);
  const r = u * 0.13;
  drawCircleImage(ctx, assets.headshot, cx, y + r, r, brand.accent || "#B082F2", initials(brand.name));
  y += r * 2 + Math.round(h * 0.04);
  ctx.textAlign = "center";
  const ink = cinematic ? "#fff" : "#16181A";
  const muted = cinematic ? "rgba(255,255,255,0.7)" : "#5A5F66";
  ctx.fillStyle = ink;
  ctx.font = `600 ${Math.round(u * 0.048)}px ${displayFont(look)}`;
  ctx.fillText(brand.name || "Your realtor", cx, y);
  y += Math.round(u * 0.055);
  if (brand.phone) {
    ctx.fillStyle = brand.accent || "#B082F2";
    ctx.font = `600 ${Math.round(u * 0.032)}px Helvetica, Arial, sans-serif`;
    ctx.fillText(brand.phone, cx, y);
    y += Math.round(u * 0.045);
  }
  if (brand.brokerage) {
    ctx.fillStyle = muted;
    ctx.font = `500 ${Math.round(u * 0.024)}px Helvetica, Arial, sans-serif`;
    ctx.fillText(brand.brokerage, cx, y);
    y += Math.round(u * 0.05);
  }
  ctx.fillStyle = cinematic ? "rgba(255,255,255,0.18)" : "#E7E9EC";
  ctx.fillRect(w * 0.36, y, w * 0.28, 1.5);
  y += Math.round(u * 0.05);
  ctx.fillStyle = ink;
  ctx.font = `600 ${Math.round(u * 0.028)}px ${displayFont(look)}`;
  wrapText(ctx, [listing.address, listing.price].filter(Boolean).join("  ·  "), w * 0.78, 3).forEach((row) => {
    ctx.fillText(row, cx, y);
    y += Math.round(u * 0.038);
  });
  ctx.restore();
  ctx.textAlign = "left";
}

function drawChrome(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  hideAfter: number,
  brand: KitBrand,
  assets: ReelAssets,
  look: ReelLook,
) {
  const visible =
    t < 0.35 ? t / 0.35 : t > hideAfter - 0.3 ? clamp((hideAfter - t) / 0.3, 0, 1) : 1;
  if (visible <= 0) return;
  ctx.save();
  ctx.globalAlpha = visible;
  const pad = Math.round(Math.min(w, h) * 0.04);
  const chipH = Math.round(Math.min(w, h) * 0.048);
  ctx.fillStyle = "rgba(8,10,12,0.28)";
  if (assets.logo) {
    const lw = assets.logo.naturalWidth || assets.logo.width;
    const lh = assets.logo.naturalHeight || assets.logo.height;
    const dw = lh ? (lw / lh) * chipH : chipH * 2.2;
    roundRectPath(ctx, pad, pad, dw + pad * 0.7, chipH + pad * 0.45, 10);
    ctx.fill();
    ctx.drawImage(assets.logo, pad + pad * 0.32, pad + pad * 0.22, dw, chipH);
  } else {
    const mark = (brand.brokerage || brand.name || "COTALA").slice(0, 18).toUpperCase();
    ctx.font = `600 ${Math.round(chipH * 0.48)}px Helvetica, Arial, sans-serif`;
    const tw = ctx.measureText(mark).width;
    roundRectPath(ctx, pad, pad, tw + pad * 0.9, chipH + pad * 0.25, 10);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(mark, pad + pad * 0.42, pad + (chipH + pad * 0.25) / 2);
    ctx.textBaseline = "alphabetic";
  }
  if (look !== "cinematic") {
    drawCircleImage(
      ctx,
      assets.headshot,
      w - pad - 44,
      pad + 44,
      44,
      brand.accent || "#B082F2",
      initials(brand.name),
    );
  }
  ctx.restore();
}

function drawBeat(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  beat: LoadedBeat,
  local: number,
  listing: KitListing,
  brand: KitBrand,
  assets: ReelAssets,
  style: ReelStyle,
) {
  if (beat.kind === "contact") drawContact(ctx, w, h, local, listing, brand, assets, style.look);
  else if (beat.kind === "collage") drawCollage(ctx, w, h, beat, local, brand);
  else if (beat.kind === "grid") drawGrid(ctx, w, h, beat, local, brand);
  else drawPhotoBeat(ctx, w, h, beat, local, listing, brand, style);
}

function beatAt(beats: LoadedBeat[], t: number) {
  let cursor = t;
  for (let i = 0; i < beats.length; i++) {
    if (cursor < beats[i].seconds) return { beat: beats[i], local: cursor, index: i };
    cursor -= beats[i].seconds;
  }
  const last = beats[beats.length - 1];
  return { beat: last, local: last?.seconds ?? 0, index: beats.length - 1 };
}

export function drawReelScene(
  ctx: CanvasRenderingContext2D,
  t: number,
  beats: LoadedBeat[],
  listing: KitListing,
  brand: KitBrand,
  assets: ReelAssets,
  w = REEL_W,
  h = REEL_H,
  style: ReelStyle = DEFAULT_STYLE,
) {
  ctx.fillStyle = "#0b0c0e";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (!beats.length) return;
  const total = reelDuration(beats);
  const time = clamp(t, 0, Math.max(total - 0.001, 0));
  const cur = beatAt(beats, time);
  if (!cur.beat) return;

  const prev = cur.index > 0 ? beats[cur.index - 1] : null;
  if (prev && cur.local < XFADE && cur.beat.kind !== "contact") {
    const a = smoothstep(cur.local / XFADE);
    ctx.save();
    ctx.globalAlpha = 1 - a;
    drawBeat(ctx, w, h, prev, Math.max(prev.seconds - XFADE + cur.local, 0), listing, brand, assets, style);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = a;
    drawBeat(ctx, w, h, cur.beat, cur.local, listing, brand, assets, style);
    ctx.restore();
  } else {
    drawBeat(ctx, w, h, cur.beat, cur.local, listing, brand, assets, style);
  }

  const contactSec = beats[beats.length - 1]?.kind === "contact" ? beats[beats.length - 1].seconds : 0;
  drawChrome(ctx, w, h, time, total - contactSec, brand, assets, style.look);
  if (time < 0.85) {
    ctx.fillStyle = `rgba(8,10,12,${1 - smoothstep(time / 0.85)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

export function pickRecorderMime(): string {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) || "";
}

export async function recordListingReel(opts: {
  photos: string[];
  listing: KitListing;
  brand: KitBrand;
  audioUrl?: string | null;
  voiceUrl?: string | null;
  look?: ReelLook;
  orientation?: ReelOrientation;
  captions?: boolean;
  onProgress?: (pct: number) => void;
}): Promise<Blob> {
  const look = opts.look || "cinematic";
  const orientation = opts.orientation || "portrait";
  const style: ReelStyle = {
    look,
    orientation,
    captions: opts.captions !== false,
  };
  const { w, h } = reelSize(orientation);
  const { beats, assets } = await loadBeatsAndAssets(opts.photos, opts.brand, opts.listing, look);
  if (!beats.some((b) => b.kind !== "contact")) throw new Error("No photos to render");
  const mime = pickRecorderMime();
  if (!mime) throw new Error("This browser cannot record video. Use Chrome.");

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.style.cssText = "position:fixed;left:-9999px;top:0;pointer-events:none";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    throw new Error("Canvas unavailable");
  }

  const canvasStream = canvas.captureStream(REEL_FPS);
  let stream: MediaStream = canvasStream;
  let stopAudio: (() => void) | null = null;
  const audioTracks: Array<{ url: string; volume: number; loop?: boolean }> = [];
  if (opts.audioUrl) audioTracks.push({ url: opts.audioUrl, volume: opts.voiceUrl ? 0.14 : 0.55, loop: true });
  if (opts.voiceUrl) audioTracks.push({ url: opts.voiceUrl, volume: 1, loop: false });
  if (audioTracks.length) {
    try {
      const { mixAudioTracks } = await import("./reel-music");
      const mixed = await mixAudioTracks(canvasStream, audioTracks);
      stream = mixed.stream;
      stopAudio = mixed.stop;
    } catch {
      stream = canvasStream;
    }
  }

  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 14_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const total = reelDuration(beats);
  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Recording failed"));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  try {
    recorder.start(200);
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const t = (performance.now() - started) / 1000;
        opts.onProgress?.(Math.min(99, Math.round((t / total) * 100)));
        drawReelScene(ctx, Math.min(t, total - 0.001), beats, opts.listing, opts.brand, assets, w, h, style);
        if (t >= total) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await new Promise((r) => setTimeout(r, 180));
    recorder.stop();
    opts.onProgress?.(100);
    return await done;
  } finally {
    stopAudio?.();
    canvasStream.getTracks().forEach((tr) => tr.stop());
    stream.getTracks().forEach((tr) => tr.stop());
    canvas.remove();
  }
}
