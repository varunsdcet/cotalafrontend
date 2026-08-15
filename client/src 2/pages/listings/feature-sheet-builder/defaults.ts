import type { FeatureListingFinalSnapshot, ScrapePayload } from "../feature-listing-preview";
import { featureSheetPublicRemarksBody } from "../feature-listing-preview";
import type { FeatureSheetFormState, RoomRow } from "./render-panels";
import { scrapeToFormFields } from "./scrape-to-form";

export const DEFAULT_ROOMS: RoomRow[] = [];

export const DEFAULT_HIGHLIGHTS: string[] = [];

/** Printed MLS sheet — neutral dark text on white (matches mockup `.sheet { color: #222 }`). */
export const FEATURE_SHEET_MLS_TEXT_COLOR = "#222222";
export const FEATURE_SHEET_MLS_BG_COLOR = "#ffffff";

export function createDefaultFormState(tourId = ""): FeatureSheetFormState {
  return {
    useFloorplan: false,
    mls: "",
    addr: "",
    city: "",
    price: "",
    type: "",
    listingStatus: "Residential",
    beds: "",
    baths: "",
    fullBaths: "",
    halfBaths: "",
    sqft: "",
    mainSqft: "",
    aboveSqft: "",
    belowSqft: "",
    year: "",
    age: "",
    tax: "",
    strata: "",
    park: "",
    zone: "",
    style: "",
    pid: "",
    complex: "",
    titleToLand: "",
    lotDimensions: "",
    frontage: "",
    lotArea: "",
    floodPlain: "",
    construction: "",
    exterior: "",
    waterSupply: "",
    fuelHeating: "",
    floorFinish: "",
    propertyDisc: "",
    fixturesLeased: "",
    servicesConnected: "",
    amenities: "",
    features: "",
    desc: "",
    tour: tourId ? `cotala.com/${tourId}` : "",
    agentName: "",
    agentTitle: "",
    agentPhone: "",
    agentEmail: "",
    agentWeb: "",
    agentBroker: "",
    agentLogoLabel: "YOUR BROKER NAME / LOGO",
    bgColor: FEATURE_SHEET_MLS_BG_COLOR,
    textColor: FEATURE_SHEET_MLS_TEXT_COLOR,
    primaryColor: "#1a3a5c",
    accentColor: "#c8a96e",
    displayFont: "'Georgia',serif",
    rooms: [],
    highlights: [],
    images: { hero: null, agent: null, logo: null, il1: null, rh: null, fp: null, lb: {}, rg: {} },
    layoutP2: ["content", "hero"],
    layoutP4: ["hero", "grid"],
  };
}

function formatPrice(price: string | null): string {
  if (!price?.trim()) return "";
  const n = Number(price.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n)) return price;
  return `$${n.toLocaleString()}`;
}

const FEATURE_VALIDATION_SCRAPE_KEY = "cotala_feature_validation_scrape";

export function readValidationScrapeForTour(tourId: string): ScrapePayload | null {
  if (typeof window === "undefined" || !tourId.trim()) return null;
  try {
    const raw = window.localStorage.getItem(FEATURE_VALIDATION_SCRAPE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { tourId?: string | number; scrape?: ScrapePayload };
    if (parsed?.scrape && String(parsed.tourId ?? "") === String(tourId)) {
      return parsed.scrape;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function snapshotToFormState(snap: FeatureListingFinalSnapshot): FeatureSheetFormState {
  const base = createDefaultFormState(snap.tourId);
  const scrape = snap.scrapeData ?? readValidationScrapeForTour(snap.tourId);
  const fromScrape = scrapeToFormFields(scrape);

  const primary = snap.primaryImages ?? [];
  const secondary = snap.secondaryImages ?? [];

  const lb: Record<number, string> = {};
  for (let i = 1; i <= 3; i++) {
    const url = primary[i]?.trim();
    if (url) lb[i] = url;
  }
  const rg: Record<number, string> = {};
  const rgSources = [primary[5], ...secondary.slice(0, 8)];
  rgSources.forEach((url, idx) => {
    if (url?.trim()) rg[idx + 1] = url.trim();
  });

  const descFromSnap = featureSheetPublicRemarksBody(snap.listingDescription, scrape);

  return {
    ...base,
    ...fromScrape,
    addr: fromScrape.addr || snap.listingAddress || base.addr,
    price: formatPrice(snap.price) || fromScrape.price || base.price,
    beds: snap.bedrooms || fromScrape.beds || base.beds,
    baths: snap.bathrooms || fromScrape.baths || base.baths,
    sqft: snap.size || fromScrape.sqft || base.sqft,
    tax: snap.tax || fromScrape.tax || base.tax,
    strata: snap.maintFee || fromScrape.strata || base.strata,
    desc: descFromSnap || fromScrape.desc || base.desc,
    tour: `cotala.com/${snap.tourId}`,
    agentName: snap.agentName || base.agentName,
    agentPhone: snap.agentPhone || base.agentPhone,
    agentEmail: snap.agentEmail || base.agentEmail,
    agentWeb: snap.agentWebsite || base.agentWeb,
    // Do not inherit agent brand textColour (often blue) — MLS print uses black/gray like original sheet.
    bgColor: FEATURE_SHEET_MLS_BG_COLOR,
    textColor: FEATURE_SHEET_MLS_TEXT_COLOR,
    images: {
      hero: snap.coverImage?.trim() || null,
      agent: snap.agentHeadshot?.trim() || null,
      logo: snap.agentLogo?.trim() || null,
      il1: primary[0]?.trim() || null,
      rh: primary[4]?.trim() || null,
      fp: null,
      lb,
      rg,
    },
  };
}

export const PRINT_LAYOUT = {
  finishWidthIn: 17,
  finishHeightIn: 11,
  docWidthIn: 17.5,
  docHeightIn: 11.5,
  bleedIn: 0.25,
  markOffsetIn: 0.125,
  safetyIn: 0.25,
  refWidthPx: 556,
  refHeightPx: 748,
  previewScale: 0.47,
} as const;
