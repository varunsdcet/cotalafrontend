import type { KitBrand, KitListing } from "./kit-cards";
import {
  XFADE,
  drawCinematicStill,
  drawDuskWash,
  drawVignette,
  pickMove,
  smoothstep,
} from "./cinematic";
import { loadReelImage, pickRecorderMime } from "./reel";
import { DEFAULT_TRACK_ID, libraryTrackUrl, mixAudioTracks } from "./reel-music";

export const SLIDE_W = 1920;
export const SLIDE_H = 1080;
export const SLIDE_FPS = 30;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function realtorScript(listing: KitListing, brand: KitBrand): string {
  const name = brand.name || "your realtor";
  const parts: string[] = [`Hi, I'm ${name}.`];
  if (listing.address) parts.push(`Take a look at ${listing.address}.`);
  if (listing.price) parts.push(`This home is listed at ${listing.price}.`);
  const facts = [
    listing.beds && `${listing.beds} bedrooms`,
    listing.baths && `${listing.baths} bathrooms`,
    listing.sqft && `${listing.sqft} square feet`,
  ].filter(Boolean);
  if (facts.length) parts.push(`It offers ${facts.join(", ")}.`);
  const desc = (listing.description || "").replace(/\s+/g, " ").trim();
  if (desc) {
    const sentence = desc.split(/(?<=[.!?])\s+/)[0] || desc;
    parts.push(sentence.slice(0, 180));
  }
  parts.push("I'd love to show you through. Reach out and we'll book a tour.");
  return parts.join(" ");
}

export function speechSeconds(script: string) {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(10, words / 2.35);
}

export function mouthAmp(t: number, script: string, duration: number) {
  const words = script.trim().split(/\s+/).filter(Boolean);
  if (!words.length || duration <= 0) return 0;
  const wordDur = duration / words.length;
  const i = clamp(Math.floor(t / wordDur), 0, words.length - 1);
  const local = (t - i * wordDur) / wordDur;
  const word = words[i];
  const voiced = /[aeiouy]/i.test(word);
  if (!voiced) return 0.06 + 0.04 * Math.abs(Math.sin(t * 14));
  return 0.22 + 0.78 * Math.abs(Math.sin(local * Math.PI * (1.6 + (word.length % 4) * 0.35)));
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();
}

function drawTalkingHead(
  ctx: CanvasRenderingContext2D,
  headshot: HTMLImageElement | null,
  brand: KitBrand,
  w: number,
  h: number,
  amp: number,
  t: number,
) {
  const r = Math.round(h * 0.13);
  const cx = w - r - Math.round(w * 0.04);
  const cy = r + Math.round(h * 0.06);
  const pulse = 1 + amp * 0.012;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.translate(-cx, -cy);

  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,255,255,${0.18 + amp * 0.25})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  if (headshot) {
    const iw = headshot.naturalWidth || headshot.width;
    const ih = headshot.naturalHeight || headshot.height;
    const scale = Math.max((r * 2) / iw, (r * 2) / ih);
    ctx.drawImage(headshot, cx - (iw * scale) / 2, cy - (ih * scale) / 2, iw * scale, ih * scale);
  } else {
    ctx.fillStyle = brand.bg || "#1B3050";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#fff";
    ctx.font = `600 ${Math.round(r * 0.7)}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const initials = (brand.name || "R")
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    ctx.fillText(initials, cx, cy);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = Math.max(4, r * 0.07);
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  const label = brand.name || "Realtor";
  ctx.font = `600 ${Math.round(h * 0.022)}px Helvetica, Arial, sans-serif`;
  const tw = ctx.measureText(label).width;
  const lx = cx - tw / 2 - 10;
  const ly = cy + r + 10;
  fillRoundRect(ctx, lx, ly, tw + 20, 28, 14);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, ly + 14);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  void t;
}

function drawLogoChip(ctx: CanvasRenderingContext2D, brand: KitBrand, logo: HTMLImageElement | null, w: number, h: number) {
  const pad = Math.round(Math.min(w, h) * 0.04);
  const chipH = Math.round(Math.min(w, h) * 0.055);
  ctx.fillStyle = brand.bg || "#1B3050";
  if (logo) {
    const lw = logo.naturalWidth || logo.width;
    const lh = logo.naturalHeight || logo.height;
    if (!lw || !lh) return;
    const dw = (lw / lh) * chipH;
    fillRoundRect(ctx, pad, pad, dw + pad * 0.7, chipH + pad * 0.45, 10);
    ctx.drawImage(logo, pad + pad * 0.35, pad + pad * 0.22, dw, chipH);
    return;
  }
  const line = (brand.brokerage || brand.name || "Cotala").slice(0, 28);
  ctx.font = `600 ${Math.round(chipH * 0.48)}px Helvetica, Arial, sans-serif`;
  const tw = ctx.measureText(line).width;
  fillRoundRect(ctx, pad, pad, tw + pad * 0.9, chipH + pad * 0.2, 10);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(line, pad + pad * 0.45, pad + (chipH + pad * 0.2) / 2);
  ctx.textBaseline = "alphabetic";
}

export function drawSlideshowFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  images: HTMLImageElement[],
  listing: KitListing,
  brand: KitBrand,
  headshot: HTMLImageElement | null,
  script: string,
  duration: number,
  w = SLIDE_W,
  h = SLIDE_H,
  logo: HTMLImageElement | null = null,
) {
  ctx.fillStyle = "#0b0c0e";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const photoDur = images.length ? (duration - 2.4) / images.length : duration;
  const photoT = Math.min(t, Math.max(duration - 2.41, 0));
  const idx = images.length ? clamp(Math.floor(photoT / photoDur), 0, images.length - 1) : 0;
  const localSec = images.length ? photoT - idx * photoDur : 0;
  const local = images.length && photoDur ? localSec / photoDur : 0;
  const drawSlide = (image: HTMLImageElement, i: number, progress: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    drawCinematicStill(ctx, image, w, h, progress, pickMove(i));
    ctx.restore();
  };
  const img = images[idx];
  const prev = idx > 0 ? images[idx - 1] : null;
  if (prev && localSec < XFADE) {
    const a = smoothstep(localSec / XFADE);
    drawSlide(prev, idx - 1, 1, 1 - a);
    if (img) drawSlide(img, idx, local, a);
  } else if (img) {
    drawSlide(img, idx, local, 1);
  }
  drawVignette(ctx, w, h, 0.16);
  drawDuskWash(ctx, w, h, 0.32);

  ctx.fillStyle = "#fff";
  ctx.font = `500 ${Math.round(h * 0.034)}px Space Grotesk, Helvetica, sans-serif`;
  ctx.fillText(listing.address || "Just listed", w * 0.05, h * 0.86);
  if (listing.price) {
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.font = `400 ${Math.round(h * 0.028)}px Instrument Sans, Helvetica, sans-serif`;
    ctx.fillText(listing.price, w * 0.05, h * 0.92);
  }

  const words = script.trim().split(/\s+/).filter(Boolean);
  if (words.length && t < duration - 0.4) {
    const i = clamp(Math.floor((t / Math.max(duration - 2.4, 1)) * words.length), 0, words.length - 1);
    const caption = words.slice(Math.max(0, i - 5), i + 1).join(" ");
    ctx.font = `400 ${Math.round(h * 0.022)}px Instrument Sans, Helvetica, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(caption, w * 0.05, h * 0.78);
  }

  const talking = t < duration - 2.2;
  drawLogoChip(ctx, brand, logo, w, h);
  drawTalkingHead(ctx, headshot, brand, w, h, talking ? mouthAmp(t, script, duration - 2.2) : 0.05, t);

  if (t < 0.7) {
    ctx.fillStyle = `rgba(8,10,12,${1 - smoothstep(t / 0.7)})`;
    ctx.fillRect(0, 0, w, h);
  }

  if (t >= duration - 2.4) {
    const fade = clamp((t - (duration - 2.4)) / 0.45, 0, 1);
    ctx.fillStyle = brand.bg || "#1B3050";
    ctx.globalAlpha = 0.92 * fade;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = fade;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = `600 ${Math.round(h * 0.055)}px Helvetica, Arial, sans-serif`;
    ctx.fillText(brand.name || "Your realtor", w / 2, h * 0.44);
    ctx.fillStyle = brand.accent || "#B082F2";
    ctx.font = `600 ${Math.round(h * 0.036)}px Helvetica, Arial, sans-serif`;
    ctx.fillText(brand.phone || "Book a tour", w / 2, h * 0.52);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = `500 ${Math.round(h * 0.028)}px Helvetica, Arial, sans-serif`;
    ctx.fillText(listing.address || "I'd love to show you through.", w / 2, h * 0.6);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }
}

export async function fetchRealtorVoiceUrl(script: string): Promise<string | null> {
  const text = script.slice(0, 520);
  const voices = ["Amy", "Salli", "Joanna", "Brian"];
  for (const voice of voices) {
    try {
      const res = await fetch(
        `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`,
      );
      if (!res.ok) continue;
      const blob = await res.blob();
      if (blob.size < 800) continue;
      return URL.createObjectURL(blob);
    } catch {
      /* try next voice */
    }
  }
  return null;
}

export function speakRealtor(script: string, onEnd?: () => void): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) return () => undefined;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(script);
  utter.rate = 0.96;
  utter.pitch = 1.02;
  utter.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => /en-US|en-GB/i.test(v.lang) && /female|samantha|victoria|zira|google us/i.test(v.name)) ||
    voices.find((v) => /en/i.test(v.lang)) ||
    null;
  if (preferred) utter.voice = preferred;
  utter.onend = () => onEnd?.();
  window.speechSynthesis.speak(utter);
  return () => {
    window.speechSynthesis.cancel();
  };
}

export async function recordSlideshow(opts: {
  photos: string[];
  listing: KitListing;
  brand: KitBrand;
  script: string;
  voiceUrl?: string | null;
  music?: boolean;
  onProgress?: (pct: number) => void;
}): Promise<Blob> {
  const images = (await Promise.all(opts.photos.slice(0, 12).map((u) => loadReelImage(u)))).filter(Boolean) as HTMLImageElement[];
  if (!images.length) throw new Error("No photos to render");
  const [headshot, logo] = await Promise.all([
    opts.brand.headshot ? loadReelImage(opts.brand.headshot) : Promise.resolve(null),
    opts.brand.logo ? loadReelImage(opts.brand.logo) : Promise.resolve(null),
  ]);
  const duration = Math.max(speechSeconds(opts.script) + 2.4, images.length * 3.8 + 2.4);
  const mime = pickRecorderMime();
  if (!mime) throw new Error("This browser cannot record video. Use Chrome.");

  const canvas = document.createElement("canvas");
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  canvas.style.cssText = "position:fixed;left:-9999px;top:0;pointer-events:none";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    throw new Error("Canvas unavailable");
  }

  const canvasStream = canvas.captureStream(SLIDE_FPS);
  const audioTracks: Array<{ url: string; volume: number; loop?: boolean }> = [];
  if (opts.music) audioTracks.push({ url: libraryTrackUrl(DEFAULT_TRACK_ID), volume: opts.voiceUrl ? 0.12 : 0.45, loop: true });
  if (opts.voiceUrl) audioTracks.push({ url: opts.voiceUrl, volume: 1, loop: false });
  let stream: MediaStream = canvasStream;
  let stopAudio: (() => void) | null = null;
  if (audioTracks.length) {
    try {
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
        opts.onProgress?.(Math.min(99, Math.round((t / duration) * 100)));
        drawSlideshowFrame(ctx, Math.min(t, duration - 0.001), images, opts.listing, opts.brand, headshot, opts.script, duration, SLIDE_W, SLIDE_H, logo);
        if (t >= duration) {
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
