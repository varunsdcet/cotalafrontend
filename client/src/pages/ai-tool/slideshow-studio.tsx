import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Pause, Play } from "lucide-react";
import { saveAs } from "file-saver";
import type { KitBrand, KitListing } from "./kit-cards";
import { formatDuration, loadReelImage } from "./reel";
import { DEFAULT_TRACK_ID, libraryTrackUrl } from "./reel-music";
import KitLoader from "./kit-loader";
import { kitBtn } from "./kit-ui";
import { stopSpeechSynthesis, usePauseWhenHidden } from "./studio-playback";
import {
  SLIDE_H,
  SLIDE_W,
  drawSlideshowFrame,
  fetchRealtorVoiceUrl,
  realtorScript,
  recordSlideshow,
  speakRealtor,
  speechSeconds,
} from "./slideshow";

type Props = {
  photos: string[];
  listing: KitListing;
  brand: KitBrand;
  fileName: string;
  active?: boolean;
};

export default function SlideshowStudio({ photos, listing, brand, fileName, active = true }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clockRef = useRef(0);
  const playingRef = useRef(false);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const stopSpeakRef = useRef<(() => void) | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const headshotRef = useRef<HTMLImageElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  const [script, setScript] = useState(() => realtorScript(listing, brand));
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [making, setMaking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const musicSrc = useMemo(() => libraryTrackUrl(DEFAULT_TRACK_ID), []);
  const duration = useMemo(
    () => Math.max(speechSeconds(script) + 2.4, Math.min(photos.length, 12) * 3.8 + 2.4),
    [script, photos.length],
  );

  const pauseAll = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    cancelAnimationFrame(rafRef.current);
    stopSpeakRef.current?.();
    stopSpeakRef.current = null;
    voiceAudioRef.current?.pause();
    voiceAudioRef.current = null;
    stopSpeechSynthesis();
    musicRef.current?.pause();
  }, []);

  usePauseWhenHidden(sectionRef, pauseAll);

  useEffect(() => {
    if (!active) pauseAll();
  }, [active, pauseAll]);

  const paint = (t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawSlideshowFrame(ctx, t, imagesRef.current, listing, brand, headshotRef.current, script, duration, SLIDE_W, SLIDE_H, logoRef.current);
  };

  useEffect(() => {
    setScript(realtorScript(listing, brand));
  }, [listing.address, listing.price, listing.beds, listing.baths, listing.sqft, listing.description, brand.name]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    const run = async () => {
      const imgs = (await Promise.all(photos.slice(0, 12).map((u) => loadReelImage(u)))).filter(Boolean) as HTMLImageElement[];
      const [head, logo] = await Promise.all([
        brand.headshot ? loadReelImage(brand.headshot) : Promise.resolve(null),
        brand.logo ? loadReelImage(brand.logo) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      imagesRef.current = imgs;
      headshotRef.current = head;
      logoRef.current = logo;
      setReady(true);
      paint(0);
    };
    void run();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      pauseAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, brand.headshot, brand.logo]);

  useEffect(() => {
    let cancelled = false;
    setVoiceReady(false);
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    setVoiceUrl(null);
    const run = async () => {
      const url = await fetchRealtorVoiceUrl(script);
      if (cancelled) return;
      setVoiceUrl(url);
      setVoiceReady(true);
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script]);

  useEffect(() => {
    return () => {
      if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    };
  }, [voiceUrl]);

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;
    audio.volume = voiceUrl ? 0.12 : 0.45;
    if (playing && musicOn) {
      try {
        const len = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 36;
        audio.currentTime = clockRef.current % len;
      } catch {
        /* duration unknown */
      }
      void audio.play().catch(() => null);
    } else {
      audio.pause();
    }
  }, [playing, musicOn, voiceUrl]);

  useEffect(() => {
    return () => pauseAll();
  }, [pauseAll]);

  useEffect(() => {
    const loop = (now: number) => {
      if (!playingRef.current) return;
      const dt = lastRef.current ? (now - lastRef.current) / 1000 : 0;
      lastRef.current = now;
      clockRef.current += dt;
      if (clockRef.current >= duration) {
        clockRef.current = duration;
        playingRef.current = false;
        setPlaying(false);
        setTime(duration);
        paint(duration - 0.001);
        stopSpeakRef.current?.();
        return;
      }
      setTime(clockRef.current);
      paint(clockRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    if (playing) {
      lastRef.current = 0;
      playingRef.current = true;
      rafRef.current = requestAnimationFrame(loop);
    } else {
      playingRef.current = false;
      cancelAnimationFrame(rafRef.current);
      stopSpeakRef.current?.();
    }
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration, script, listing, brand]);

  const seek = (next: number) => {
    const t = Math.max(0, Math.min(duration, next));
    clockRef.current = t;
    setTime(t);
    paint(t);
  };

  const toggle = () => {
    if (!ready || making) return;
    if (clockRef.current >= duration - 0.05) {
      clockRef.current = 0;
      setTime(0);
    }
    setPlaying((p) => {
      const next = !p;
      if (next) {
        stopSpeakRef.current?.();
        if (voiceUrl) {
          const a = new Audio(voiceUrl);
          voiceAudioRef.current = a;
          a.currentTime = clockRef.current;
          void a.play().catch(() => {
            stopSpeakRef.current = speakRealtor(script);
          });
          stopSpeakRef.current = () => {
            a.pause();
            voiceAudioRef.current = null;
          };
        } else {
          stopSpeakRef.current = speakRealtor(script);
        }
      } else {
        stopSpeakRef.current?.();
      }
      return next;
    });
  };

  const make = async () => {
    setError(null);
    setMaking(true);
    pauseAll();
    setProgress(0);
    try {
      const blob = await recordSlideshow({
        photos,
        listing,
        brand,
        script,
        voiceUrl,
        music: musicOn,
        onProgress: setProgress,
      });
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      saveAs(blob, `${fileName}.${ext}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not render slideshow");
    } finally {
      setMaking(false);
    }
  };

  return (
    <section id="slideshows" ref={sectionRef} className="scroll-mt-44">
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#E8A13D] border border-[#E8A13D]/40 rounded-full px-2.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8A13D]" />
            Ready
          </span>
          <span className="text-white/45 text-xs font-mono">16:9 · 1080p · cinematic + AI voice</span>
        </div>
        <h3 className="text-2xl font-semibold mb-1">Slideshow</h3>
        <p className="text-white/60 mb-0 text-sm max-w-xl">
          Listing photos with cinematic camera motion and your headshot as a talking realtor.
        </p>
      </div>

      {error ? <p className="text-red-400 text-sm mb-3">{error}</p> : null}

      {!brand.headshot ? (
        <p className="text-amber-300/80 text-sm mb-3">Add a realtor headshot in Profile so the talking photo is you.</p>
      ) : null}

      {photos.length === 0 ? (
        <p className="text-white/50">No photos on this listing to build a slideshow.</p>
      ) : (
        <div className="flex flex-wrap gap-8 items-start">
          <div className="relative" style={{ width: 560, maxWidth: "100%" }}>
            <div className="relative bg-black overflow-hidden rounded-xl" style={{ aspectRatio: "16 / 9", border: "1px solid rgba(255,255,255,0.12)" }}>
              <canvas ref={canvasRef} width={SLIDE_W} height={SLIDE_H} className="w-full h-full" />
              <button
                type="button"
                onClick={toggle}
                className="absolute inset-0 flex items-center justify-center"
                aria-label={playing ? "Pause" : "Play"}
              >
                {!playing ? (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white">
                    <Play className="ml-0.5" fill="currentColor" />
                  </span>
                ) : (
                  <span className="absolute top-3 left-3 h-8 w-8 rounded-full bg-black/45 text-white flex items-center justify-center">
                    <Pause size={14} fill="currentColor" />
                  </span>
                )}
              </button>
              {!ready ? <KitLoader overlay /> : null}
              {making ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-white">
                  <p className="text-sm mb-2">Rendering slideshow</p>
                  <div className="w-40 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-[#B082F2]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-white/45 text-xs font-mono w-10">{formatDuration(time)}</span>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={time}
                onChange={(e) => seek(Number(e.target.value))}
                className="flex-1 accent-[#B082F2]"
              />
              <span className="text-white/45 text-xs font-mono w-10 text-right">{formatDuration(duration)}</span>
            </div>
            <audio ref={musicRef} src={musicSrc} loop preload="auto" />
          </div>

          <div className="flex-1 min-w-[240px] max-w-md">
            <p className="text-white font-medium mb-1">Talking realtor</p>
            <p className="text-white/50 text-sm mb-3">
              {brand.name || "Your photo"} speaks this script while the slideshow plays.
              {voiceReady && voiceUrl ? " AI voice ready." : voiceReady ? " Using browser voice." : " Preparing voice…"}
            </p>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={6}
              className="w-full rounded-lg px-3 py-2 text-sm bg-black/40 border border-white/15 text-white mb-3"
            />
            <label className="flex items-center gap-2 text-sm text-white/70 mb-3">
              <input type="checkbox" checked={musicOn} onChange={(e) => setMusicOn(e.target.checked)} />
              Music under voice
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggle}
                disabled={!ready || making}
                className="text-sm uppercase tracking-wide border border-white/30 text-white px-4 py-2 rounded-xl hover:bg-white/10 disabled:opacity-50"
              >
                {playing ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                disabled={!photos.length || making}
                onClick={() => void make()}
                className={kitBtn}
              >
                <Download size={14} />
                {making ? `Rendering ${progress}%` : "Download slideshow"}
              </button>
              <button
                type="button"
                className="text-sm uppercase tracking-wide border border-white/30 text-white px-4 py-2 rounded-xl"
                onClick={() => setScript(realtorScript(listing, brand))}
              >
                Rewrite script
              </button>
            </div>
            <p className="text-white/35 text-xs mt-3 mb-0">16:9 MP4/WebM with realtor photo, AI voice, and music bed.</p>
          </div>
        </div>
      )}
    </section>
  );
}
