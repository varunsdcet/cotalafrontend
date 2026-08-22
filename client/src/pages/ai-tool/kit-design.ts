import type { KitBrand, KitListing } from "./kit-cards";

export type EditorGroup =
  | "stories"
  | "square"
  | "landscape"
  | "postcard"
  | "reel"
  | "pinterest"
  | "flyer"
  | "brochure"
  | "email";

export const FONT_FAMILIES: Record<string, string> = {
  display: "'Space Grotesk', Helvetica, sans-serif",
  body: "'Instrument Sans', Helvetica, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
  serif: "'Playfair Display', Georgia, serif",
  script: "'Caveat', cursive",
  condensed: "'Oswald', Helvetica, sans-serif",
};

export const SHAPE_POINTS: Record<string, string> = {
  triangle: "50,0 100,100 0,100",
  arrow: "0,35 60,35 60,10 100,50 60,90 60,65 0,65",
  star: "50,0 61.2,34.6 97.6,34.6 68.1,55.9 79.4,90.5 50,69 20.6,90.5 31.9,55.9 2.4,34.6 38.8,34.6",
};

export const BADGE_WORDS: Record<string, [string, string]> = {
  just_listed: ["Just", "Listed"],
  open_house: ["Open", "House"],
  sold: ["Just", "Sold"],
  price_reduced: ["Price", "Reduced"],
  coming_soon: ["Coming", "Soon"],
};

export type SmartTokenKey =
  | "price"
  | "beds"
  | "baths"
  | "sqft"
  | "lot_sqft"
  | "mls_number"
  | "address"
  | "headline"
  | "agent_name"
  | "agent_phone"
  | "brokerage";

export type ImageAdjust = {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  radius: number;
};

export const NEUTRAL_ADJUST: ImageAdjust = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  radius: 0,
};

type Base = { id: string; x: number; y: number; w: number; h: number; rot: number; locked: boolean };

export type DesignObject =
  | (Base & { type: "image"; assetId: string | null; fit: "cover" | "contain"; adjust: ImageAdjust })
  | (Base & {
      type: "text";
      text: string;
      font: keyof typeof FONT_FAMILIES;
      size: number;
      weight: number;
      color: string;
      align: "left" | "center" | "right";
      tokenKey: SmartTokenKey | null;
    })
  | (Base & {
      type: "shape";
      shape: "rect" | "ellipse" | "line" | "triangle" | "arrow" | "star";
      fill: string | null;
      stroke: string | null;
      strokeWidth: number;
      radius: number;
    })
  | (Base & { type: "logo"; variant: "light" | "dark" })
  | (Base & { type: "headshot"; shape: "circle" | "square"; ring: string | null })
  | (Base & { type: "badge"; badge: keyof typeof BADGE_WORDS; style: "pill" | "editorial" });

export type DesignPage = { id: string; optional: boolean; objects: DesignObject[] };

export type DesignDoc = {
  schemaVersion: 1;
  kind: "static";
  width: number;
  height: number;
  pages: DesignPage[];
  limits: { minPages: number; maxPages: number };
};

export type Op =
  | { op: "swap_photo"; frameId: string; assetId: string }
  | ({ op: "adjust_image"; frameId: string } & Partial<ImageAdjust>)
  | { op: "set_text"; objId: string; value: string }
  | { op: "set_token_source"; tokenKey: SmartTokenKey; value: string }
  | { op: "add_object"; type: string; props: Record<string, unknown> }
  | { op: "transform"; objId: string; x?: number; y?: number; w?: number; h?: number; rot?: number }
  | { op: "set_style"; objId: string; props: Record<string, unknown> }
  | { op: "delete_object"; objId: string };

export const ARTBOARD: Record<EditorGroup, { w: number; h: number; maxPages: number }> = {
  stories: { w: 1080, h: 1920, maxPages: 1 },
  square: { w: 1080, h: 1080, maxPages: 1 },
  landscape: { w: 1920, h: 1080, maxPages: 1 },
  pinterest: { w: 1000, h: 1500, maxPages: 1 },
  postcard: { w: 1875, h: 1275, maxPages: 2 },
  flyer: { w: 1275, h: 1650, maxPages: 2 },
  brochure: { w: 1920, h: 1080, maxPages: 4 },
  email: { w: 1200, h: 628, maxPages: 1 },
  reel: { w: 1080, h: 1920, maxPages: 1 },
};

function oid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function box(id: string, x: number, y: number, w: number, h: number): Base {
  return { id, x, y, w, h, rot: 0, locked: false };
}

export function listingTokens(listing: KitListing, brand: KitBrand, headline: string): Record<SmartTokenKey, string> {
  return {
    price: listing.price || "",
    beds: listing.beds || "",
    baths: listing.baths || "",
    sqft: listing.sqft || "",
    lot_sqft: listing.lot || "",
    mls_number: listing.mls || "",
    address: listing.address || "",
    headline,
    agent_name: brand.name || "",
    agent_phone: brand.phone || "",
    brokerage: brand.brokerage || "",
  };
}

export function formatToken(key: SmartTokenKey, value: string) {
  if (key === "beds") return `${value} bd`;
  if (key === "baths") return `${value} ba`;
  if (key === "sqft") return `${value} sf`;
  return value;
}

export function resolveText(obj: Extract<DesignObject, { type: "text" }>, tokens: Record<string, string>) {
  if (obj.tokenKey) {
    const v = tokens[obj.tokenKey];
    return v ? formatToken(obj.tokenKey, v) : "";
  }
  return obj.text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => tokens[k] || "");
}

export function imageRadiusPx(adj: ImageAdjust | undefined, w: number, h: number) {
  if (!adj?.radius) return 0;
  return (Math.min(w, h) * adj.radius) / 200;
}

export function createKitDesign(
  group: EditorGroup,
  photos: string[],
  listing: KitListing,
  brand: KitBrand,
  headline: string,
): DesignDoc {
  const { w, h, maxPages } = ARTBOARD[group];
  const photo = photos[0] || "";
  const m = Math.round(Math.min(w, h) * 0.06);
  const objects: DesignObject[] = [
    { ...box("hero_1", 0, 0, w, h), type: "image", assetId: photo || null, fit: "cover", adjust: { ...NEUTRAL_ADJUST } },
    {
      ...box("wash_1", 0, Math.round(h * 0.55), w, Math.round(h * 0.45)),
      type: "shape",
      shape: "rect",
      fill: "rgba(16,18,20,0.72)",
      stroke: null,
      strokeWidth: 0,
      radius: 0,
    },
    {
      ...box("badge_1", m, h - Math.round(h * 0.28), Math.round(w * 0.42), Math.round(h * 0.045)),
      type: "badge",
      badge: /open/i.test(headline) ? "open_house" : "just_listed",
      style: "pill",
    },
    {
      ...box("addr_1", m, h - Math.round(h * 0.21), w - m * 2, Math.round(h * 0.08)),
      type: "text",
      text: listing.address || "Address",
      font: "display",
      size: Math.round(Math.min(w, h) * 0.045),
      weight: 600,
      color: "#ffffff",
      align: "left",
      tokenKey: "address",
    },
    {
      ...box("price_1", m, h - Math.round(h * 0.12), w - m * 2, Math.round(h * 0.06)),
      type: "text",
      text: listing.price || "",
      font: "body",
      size: Math.round(Math.min(w, h) * 0.032),
      weight: 500,
      color: brand.accent || "#B082F2",
      align: "left",
      tokenKey: "price",
    },
    { ...box("logo_1", m, m, Math.round(w * 0.22), Math.round(h * 0.06)), type: "logo", variant: "light" },
    {
      ...box("shot_1", w - m - Math.round(Math.min(w, h) * 0.12), m, Math.round(Math.min(w, h) * 0.12), Math.round(Math.min(w, h) * 0.12)),
      type: "headshot",
      shape: "circle",
      ring: "#ffffff",
    },
  ];
  if (group === "landscape" && photos[1]) {
    objects[0] = { ...objects[0], w: Math.round(w * 0.58) } as DesignObject;
    objects.splice(1, 0, {
      ...box("hero_2", Math.round(w * 0.58) + 12, 0, w - Math.round(w * 0.58) - 12, h),
      type: "image",
      assetId: photos[1],
      fit: "cover",
      adjust: { ...NEUTRAL_ADJUST },
    });
  }
  return {
    schemaVersion: 1,
    kind: "static",
    width: w,
    height: h,
    pages: [{ id: "p1", optional: false, objects }],
    limits: { minPages: 1, maxPages },
  };
}

export function scaleDesign(doc: DesignDoc, w: number, h: number): DesignDoc {
  const sx = w / doc.width;
  const sy = h / doc.height;
  return {
    ...structuredClone(doc),
    width: w,
    height: h,
    pages: doc.pages.map((p) => ({
      ...p,
      objects: p.objects.map((o) => ({
        ...o,
        x: Math.round(o.x * sx),
        y: Math.round(o.y * sy),
        w: Math.round(o.w * sx),
        h: Math.round(o.h * sy),
        ...(o.type === "text" ? { size: Math.max(12, Math.round(o.size * Math.min(sx, sy))) } : {}),
      })),
    })),
  };
}

function findObject(doc: DesignDoc, objId: string) {
  for (const page of doc.pages) {
    const obj = page.objects.find((o) => o.id === objId);
    if (obj) return { page, obj };
  }
  return null;
}

export function applyOps(design: DesignDoc, ops: Op[]): DesignDoc {
  const doc: DesignDoc = structuredClone(design);
  for (const op of ops) {
    if (op.op === "swap_photo") {
      const hit = findObject(doc, op.frameId);
      if (hit && hit.obj.type === "image") hit.obj.assetId = op.assetId;
    } else if (op.op === "adjust_image") {
      const hit = findObject(doc, op.frameId);
      if (hit && hit.obj.type === "image") {
        const { brightness, contrast, saturation, hue, blur, radius } = op;
        hit.obj.adjust = {
          ...hit.obj.adjust,
          ...(brightness !== undefined ? { brightness } : {}),
          ...(contrast !== undefined ? { contrast } : {}),
          ...(saturation !== undefined ? { saturation } : {}),
          ...(hue !== undefined ? { hue } : {}),
          ...(blur !== undefined ? { blur } : {}),
          ...(radius !== undefined ? { radius } : {}),
        };
      }
    } else if (op.op === "set_text") {
      const hit = findObject(doc, op.objId);
      if (hit && hit.obj.type === "text") hit.obj.text = op.value;
    } else if (op.op === "transform") {
      const hit = findObject(doc, op.objId);
      if (!hit) continue;
      if (op.x !== undefined) hit.obj.x = op.x;
      if (op.y !== undefined) hit.obj.y = op.y;
      if (op.w !== undefined) hit.obj.w = op.w;
      if (op.h !== undefined) hit.obj.h = op.h;
      if (op.rot !== undefined) hit.obj.rot = op.rot;
    } else if (op.op === "set_style") {
      const hit = findObject(doc, op.objId);
      if (hit) Object.assign(hit.obj, op.props);
    } else if (op.op === "delete_object") {
      const pageIdx = doc.pages.findIndex((p) => p.id === op.objId);
      if (pageIdx >= 0 && doc.pages[pageIdx].optional && doc.pages.length > doc.limits.minPages) {
        doc.pages.splice(pageIdx, 1);
      } else {
        for (const page of doc.pages) page.objects = page.objects.filter((o) => o.id !== op.objId);
      }
    } else if (op.op === "add_object") {
      if (op.type === "page") {
        if (doc.pages.length >= doc.limits.maxPages) continue;
        const last = doc.pages[doc.pages.length - 1];
        doc.pages.push({ id: oid("p"), optional: true, objects: structuredClone(last.objects) });
        continue;
      }
      const page = doc.pages[(op.props.pageIndex as number) || 0] || doc.pages[0];
      const base = box(oid("obj"), (op.props.x as number) || 48, (op.props.y as number) || 48, (op.props.w as number) || 280, (op.props.h as number) || 80);
      if (op.type === "text" || op.type === "heading") {
        page.objects.push({
          ...base,
          type: "text",
          text: (op.props.text as string) || "New text",
          font: ((op.props.font as keyof typeof FONT_FAMILIES) || (op.type === "heading" ? "display" : "body")),
          size: (op.props.size as number) || (op.type === "heading" ? 48 : 28),
          weight: op.type === "heading" ? 600 : 400,
          color: (op.props.color as string) || "#ffffff",
          align: "left",
          tokenKey: null,
        });
      } else if (op.type === "media") {
        page.objects.push({ ...base, w: 360, h: 360, type: "image", assetId: (op.props.assetId as string) || null, fit: "cover", adjust: { ...NEUTRAL_ADJUST } });
      } else if (op.type === "shape") {
        const shape = (op.props.shape as Extract<DesignObject, { type: "shape" }>["shape"]) || "rect";
        page.objects.push({
          ...base,
          w: shape === "line" ? 320 : 180,
          h: shape === "line" ? 8 : 180,
          type: "shape",
          shape,
          fill: (op.props.fill as string) || "#1B3050",
          stroke: null,
          strokeWidth: 0,
          radius: 0,
        });
      } else if (op.type === "logo") {
        page.objects.push({ ...base, w: 220, h: 72, type: "logo", variant: "light" });
      } else if (op.type === "badge") {
        page.objects.push({ ...base, w: 280, h: 56, type: "badge", badge: "just_listed", style: "pill" });
      }
    }
  }
  return doc;
}

export function designStorageKey(tourId: string, group: EditorGroup, index: number) {
  return `cotala_ai_fabric_v1_${tourId}_${group}_${index}`;
}

export function loadStoredDesign(tourId: string, group: EditorGroup, index: number): DesignDoc | null {
  try {
    const raw = localStorage.getItem(designStorageKey(tourId, group, index));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DesignDoc;
    if (!parsed?.pages?.length || !parsed.width) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredDesign(tourId: string, group: EditorGroup, index: number, doc: DesignDoc) {
  localStorage.setItem(designStorageKey(tourId, group, index), JSON.stringify(doc));
}
