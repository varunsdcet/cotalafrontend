import type { ScrapePayload } from "../feature-listing-preview";
import { featureSheetPublicRemarksBody } from "../feature-listing-preview";
import type { FeatureSheetFormState, RoomRow } from "./render-panels";

function cleanScrapedAddress(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  // Scrape often prefixes MLS + type: "3139937 House/Single Family 20452 46A AVENUE, ..."
  const streetMatch = s.match(
    /(\d+\s+[\dA-Za-z/.'-]*(?:\s+(?:AVENUE|AVE|STREET|ST|ROAD|RD|DRIVE|DR|WAY|BLVD|BOULEVARD|CRESCENT|CR|LANE|LN|PLACE|PL|COURT|CT|TRAIL|GROVE|PARADE|TERRACE|CRES|HWY|HIGHWAY)[^,]*(?:,.*)?))$/i,
  );
  if (streetMatch) return streetMatch[1].trim();
  return s.replace(/^\w+\s+[\w/]+\s+/i, "").trim();
}

function asTrimmedString(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function formatSqftNumber(v: unknown): string {
  if (v == null || String(v).trim() === "") return "";
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n.toLocaleString() : String(v);
}

function joinList(items: unknown): string {
  if (Array.isArray(items)) return items.filter(Boolean).join(", ");
  if (typeof items === "string") return items.trim();
  return "";
}

function formatParking(scrape: ScrapePayload): string {
  const p = scrape.parking;
  if (!p) return "";
  const total = p.total;
  const covered = asTrimmedString(p.covered);
  if (total != null && covered) return `${total} (${covered} Covered)`;
  if (total != null) return String(total);
  return covered || joinList(p.features);
}

function formatTax(pricing: ScrapePayload["pricing"], fallback: string): string {
  if (pricing?.gross_taxes != null) {
    const year = pricing.tax_year ? ` for the year ${pricing.tax_year}` : "";
    return `$${Number(pricing.gross_taxes).toLocaleString()}${year}`;
  }
  return fallback;
}

function formatMaint(pricing: ScrapePayload["pricing"], fallback: string): string {
  if (pricing?.maintenance_fee != null) {
    return `$${Number(pricing.maintenance_fee).toLocaleString()}`;
  }
  return fallback;
}

function mapRooms(scrape: ScrapePayload): RoomRow[] {
  const list = Array.isArray(scrape.room_list) ? scrape.room_list : [];
  return list
    .filter((r) => asTrimmedString(r?.name) !== "")
    .map((r) => ({
      f: asTrimmedString(r.floor),
      r: asTrimmedString(r.name),
      d: asTrimmedString(r.dimensions),
    }));
}

function mapHighlights(scrape: ScrapePayload): string[] {
  const fromFeatures = (scrape.features ?? []).filter(Boolean).slice(0, 6);
  if (fromFeatures.length) return fromFeatures as string[];
  const fromAmenities = (scrape.amenities ?? []).filter(Boolean).slice(0, 6);
  return fromAmenities as string[];
}

/** Map MLS scrape payload → feature sheet builder form fields (same logic as page 4 preview). */
export function scrapeToFormFields(
  scrape: ScrapePayload | null | undefined,
): Partial<FeatureSheetFormState> {
  if (!scrape) return {};

  const listing = scrape.listing ?? {};
  const property = scrape.property ?? {};
  const pricing = scrape.pricing ?? {};
  const details = scrape.property_details ?? {};
  const lot = scrape.lot ?? {};
  const building = scrape.building ?? {};
  const utilities = scrape.utilities ?? {};
  const parking = scrape.parking ?? {};
  const floor = scrape.floor_area ?? {};
  const size = scrape.size ?? {};

  const cleanAddress = cleanScrapedAddress(property.address);
  const cityProvPostal = [property.city, property.province, property.postal_code]
    .map((v) => asTrimmedString(v))
    .filter(Boolean)
    .join(" ");
  const cleanLower = cleanAddress.toLowerCase();
  const addCityProvPostal =
    cityProvPostal &&
    !cleanLower.includes(asTrimmedString(property.postal_code).toLowerCase()) &&
    !cleanLower.includes(asTrimmedString(property.city).toLowerCase());
  const headerAddress =
    [cleanAddress, addCityProvPostal ? cityProvPostal : ""].filter(Boolean).join(", ") || "";
  const headerCityLine = (
    (property.subarea ? `${asTrimmedString(property.subarea)}, ` : "") +
    asTrimmedString(property.postal_code)
  ).trim();

  const fullBaths =
    details.full_baths != null ? String(details.full_baths) : "";
  const halfBaths =
    details.half_baths != null ? String(details.half_baths) : "";
  const baths =
    details.bathrooms != null
      ? String(details.bathrooms)
      : fullBaths && halfBaths
        ? String(Number(fullBaths) + Number(halfBaths))
        : fullBaths || halfBaths;

  const mainSqft = formatSqftNumber(floor.finished_main_sqft ?? size.main_sqft);
  const aboveSqft = formatSqftNumber(floor.finished_above_sqft ?? size.above_sqft);
  const belowSqft = formatSqftNumber(
    floor.finished_below_sqft ?? floor.finished_basement_sqft ?? size.below_sqft,
  );
  const grandSqft = formatSqftNumber(
    floor.grand_total_sqft ?? floor.finished_total_sqft ?? size.total_sqft,
  );

  const rooms = mapRooms(scrape);
  const highlights = mapHighlights(scrape);

  return {
    mls: asTrimmedString(listing.mls_number),
    addr: headerAddress,
    city: headerCityLine,
    type: asTrimmedString(building.building_type || property.property_type),
    listingStatus: asTrimmedString(listing.status ?? "Residential") || "Residential",
    beds: details.bedrooms != null ? String(details.bedrooms) : "",
    baths,
    fullBaths,
    halfBaths,
    sqft: grandSqft,
    mainSqft,
    aboveSqft,
    belowSqft,
    year: details.approx_year_built != null ? String(details.approx_year_built) : "",
    age: details.age != null ? String(details.age) : "",
    tax: formatTax(pricing, ""),
    strata: formatMaint(pricing, ""),
    park: formatParking(scrape),
    zone: asTrimmedString(property.zoning),
    style: asTrimmedString(details.style_of_home),
    pid: asTrimmedString(property.pid),
    complex: asTrimmedString(property.complex_name),
    titleToLand: asTrimmedString(property.ownership_type),
    lotDimensions: asTrimmedString(lot.lot_dimensions),
    frontage: lot.frontage_ft != null ? String(lot.frontage_ft) : "",
    lotArea: lot.lot_area != null ? String(lot.lot_area) : "",
    floodPlain: lot.flood_plain == null ? "" : lot.flood_plain ? "Yes" : "No",
    construction: joinList(building.construction_materials),
    exterior: asTrimmedString(building.building_type),
    waterSupply: asTrimmedString(utilities.water_supply),
    fuelHeating: joinList(utilities.fuel_heating),
    floorFinish: asTrimmedString(building.floor_finish),
    propertyDisc: asTrimmedString(property.property_disc),
    fixturesLeased: asTrimmedString(property.fixtures_leased),
    servicesConnected: joinList(utilities.services_connected),
    amenities: joinList(scrape.amenities),
    features: joinList(scrape.features),
    desc: featureSheetPublicRemarksBody(null, scrape),
    ...(rooms.length ? { rooms } : {}),
    ...(highlights.length ? { highlights } : {}),
  };
}
