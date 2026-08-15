import { renderQrSlotInnerHtml } from "./qr-svg";

export type RoomRow = { f: string; r: string; d: string };

export type FeatureSheetImages = {
  hero: string | null;
  agent: string | null;
  logo: string | null;
  il1: string | null;
  rh: string | null;
  fp: string | null;
  lb: Record<number, string>;
  rg: Record<number, string>;
};

export type FeatureSheetFormState = {
  useFloorplan: boolean;
  mls: string;
  addr: string;
  city: string;
  price: string;
  type: string;
  listingStatus: string;
  beds: string;
  baths: string;
  fullBaths: string;
  halfBaths: string;
  sqft: string;
  mainSqft: string;
  aboveSqft: string;
  belowSqft: string;
  year: string;
  age: string;
  tax: string;
  strata: string;
  park: string;
  zone: string;
  style: string;
  pid: string;
  complex: string;
  titleToLand: string;
  lotDimensions: string;
  frontage: string;
  lotArea: string;
  floodPlain: string;
  construction: string;
  exterior: string;
  waterSupply: string;
  fuelHeating: string;
  floorFinish: string;
  propertyDisc: string;
  fixturesLeased: string;
  servicesConnected: string;
  amenities: string;
  features: string;
  desc: string;
  tour: string;
  agentName: string;
  agentTitle: string;
  agentPhone: string;
  agentEmail: string;
  agentWeb: string;
  agentBroker: string;
  agentLogoLabel: string;
  bgColor: string;
  textColor: string;
  primaryColor: string;
  accentColor: string;
  displayFont: string;
  rooms: RoomRow[];
  highlights: string[];
  images: FeatureSheetImages;
  layoutP2: Array<"content" | "hero">;
  layoutP4: Array<"hero" | "grid">;
};

export type RenderedPanels = {
  p1: string;
  p2: string;
  p3: string;
  p4: string;
  bgColor: string;
};

function esc(s: string | null | undefined): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderFeatureSheetPanels(state: FeatureSheetFormState): RenderedPanels {
  const primary = state.primaryColor || "#1a3a5c";
  const accent = state.accentColor || "#c8a96e";
  const bgColor = state.bgColor || "#ffffff";
  const txtColor = state.textColor || "#222222";
  const font = state.displayFont || "'Georgia',serif";
  const imgs = state.images;
  const rooms = state.rooms;
  const layoutP2 = state.layoutP2;
  const layoutP4 = state.layoutP4;

  const addr = state.addr || "";
  const city = state.city || "";
  const price = state.price || "";
  const beds = state.beds || "";
  const baths = state.baths || "";
  const sqft = state.sqft || "";
  const yr = state.year || "";
  const tax = state.tax || "";
  const strata = state.strata || "";
  const park = state.park || "";
  const zone = state.zone || "";
  const mls = state.mls || "";
  const style2 = state.style || "";
  const desc = state.desc || "";
  const tour = state.tour || "";
  const listingStatus = state.listingStatus || "Residential";
  const fullBaths = state.fullBaths || "";
  const halfBaths = state.halfBaths || "";
  const pid = state.pid || "";
  const age = state.age || "";
  const complex = state.complex || "";
  const titleToLand = state.titleToLand || "";
  const lotDimensions = state.lotDimensions || "";
  const frontage = state.frontage || "";
  const lotArea = state.lotArea || "";
  const floodPlain = state.floodPlain || "";
  const construction = state.construction || "";
  const exterior = state.exterior || "";
  const waterSupply = state.waterSupply || "";
  const fuelHeating = state.fuelHeating || "";
  const floorFinish = state.floorFinish || "";
  const propertyDisc = state.propertyDisc || "";
  const fixturesLeased = state.fixturesLeased || "";
  const servicesConnected = state.servicesConnected || "";
  const amenities = state.amenities || "";
  const features = state.features || "";
  const mainSqft = state.mainSqft || "";
  const aboveSqft = state.aboveSqft || "";
  const belowSqft = state.belowSqft || "";
  const propType = state.type || "";

  const aName = (state.agentName || "").toUpperCase();
  const aPhone = state.agentPhone || "";
  const aEmail = state.agentEmail || "";
  const aWeb = state.agentWeb || "";
  const aBroker = state.agentBroker || "";
  const aBlbl = state.agentLogoLabel || "";

  const heroH = imgs.hero
    ? `<img src="${imgs.hero}" style="width:100%;height:100%;object-fit:cover" alt="Property">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;background:#e0e0e0"><span style='font-size:9px;color:#bbb'>Exterior hero photo</span></div>`;

  const hr = `<div style="border-top:0.5px solid ${txtColor}; margin: 4px 0; opacity: 0.6;"></div>`;
  const labelStyle = `font-weight:700; width:75px; display:inline-block; color:${txtColor};`;

  const roomTableH =
    `<table style="width:100%; border-collapse:collapse; font-size:6px; color:${txtColor};">` +
    `<thead><tr><th style="text-align:left; padding-bottom:3px; border-bottom:0.5px solid ${txtColor}; opacity:0.6;">Floor</th><th style="text-align:left; padding-bottom:3px; border-bottom:0.5px solid ${txtColor}; opacity:0.6;">Type</th><th style="text-align:left; padding-bottom:3px; border-bottom:0.5px solid ${txtColor}; opacity:0.6;">Dimensions</th>` +
    `<th style="text-align:left; padding-bottom:3px; border-bottom:0.5px solid ${txtColor}; opacity:0.6;">Floor</th><th style="text-align:left; padding-bottom:3px; border-bottom:0.5px solid ${txtColor}; opacity:0.6;">Type</th><th style="text-align:left; padding-bottom:3px; border-bottom:0.5px solid ${txtColor}; opacity:0.6;">Dimensions</th></tr></thead><tbody>` +
    (() => {
      let out = "";
      const h = Math.ceil(rooms.length / 2);
      for (let i = 0; i < h; i++) {
        const a = rooms[i] || { f: "", r: "", d: "" };
        const b = rooms[i + h] || { f: "", r: "", d: "" };
        out +=
          `<tr>` +
          `<td style="padding:1.5px 0;">${esc(a.f)}</td><td style="padding:1.5px 0;">${esc(a.r)}</td><td style="padding:1.5px 0;">${esc(a.d)}</td>` +
          `<td style="padding:1.5px 0;">${esc(b.f)}</td><td style="padding:1.5px 0;">${esc(b.r)}</td><td style="padding:1.5px 0;">${esc(b.d)}</td>` +
          `</tr>`;
      }
      return out;
    })() +
    `</tbody></table>`;

  const fpH = imgs.fp
    ? `<img src="${imgs.fp}" style="width:100%;height:100%;object-fit:contain" alt="Floorplan">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;background:#e8e8e8;border:1px dashed #ccc;"><span style='font-size:9px;color:#bbb'>Floorplan placeholder</span></div>`;

  const dataContent =
    `<div style="display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:5px;">` +
    `<div style="font-size:5.5px; font-weight:700;">${esc(mls)}<br>${esc(propType)}</div>` +
    `<div style="text-align:center;"><div style="font-size:11px; font-weight:700;">${esc(addr).toUpperCase()}</div><div style="font-size:5.5px;">${esc(city)}</div></div>` +
    `<div style="font-size:5.5px; font-weight:700; text-align:right;">${esc(listingStatus)}<br>${esc(price)} (LP)</div>` +
    `</div>` +
    hr +
    `<div style="display:flex; font-size:5.5px; gap:5px;">` +
    `<div style="flex:1;">` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Depth/Size (ft):</span> ${esc(lotDimensions)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Frontage (ft):</span> ${esc(frontage)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Lot Area:</span> ${esc(lotArea)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Flood Plain:</span> ${esc(floodPlain)}</div>` +
    `</div>` +
    `<div style="flex:1;">` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Bedrooms:</span> ${esc(beds)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Bathrooms:</span> ${esc(baths)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Full Baths:</span> ${esc(fullBaths || baths)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Half Baths:</span> ${esc(halfBaths || "0")}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Maint. Fee:</span> ${esc(strata)}</div>` +
    `</div>` +
    `<div style="flex:1;">` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Approx. Year Built:</span> ${esc(yr)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Age:</span> ${esc(age)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Zoning:</span> ${esc(zone)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Gross Taxes:</span> ${esc(tax)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">P.I.D.:</span> ${esc(pid)}</div>` +
    `</div>` +
    `</div>` +
    hr +
    `<div style="display:flex; font-size:5.5px; gap:5px;">` +
    `<div style="flex:1.5;">` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Style of Home:</span> ${esc(style2)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Construction:</span> ${esc(construction)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Exterior:</span> ${esc(exterior)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Water Supply:</span> ${esc(waterSupply)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Fuel/Heating:</span> ${esc(fuelHeating)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Floor Finish:</span> ${esc(floorFinish)}</div>` +
    `</div>` +
    `<div style="flex:1;">` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Parking:</span> ${esc(park)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Title to Land:</span> ${esc(titleToLand)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Property Disc:</span> ${esc(propertyDisc)}</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Fixtures Leased:</span> ${esc(fixturesLeased)}</div>` +
    `</div>` +
    `</div>` +
    hr +
    `<div style="font-size:5.5px;">` +
    `<div style="display:flex; margin-bottom:1px;"><span style="${labelStyle}">Complex / Subdiv:</span><span style="flex:1;">${esc(complex)}</span></div>` +
    `<div style="display:flex; margin-bottom:1px;"><span style="${labelStyle}">Services Connected:</span><span style="flex:1;">${esc(servicesConnected)}</span></div>` +
    `<div style="display:flex; margin-bottom:1px;"><span style="${labelStyle}">Amenities:</span><span style="flex:1;">${esc(amenities)}</span></div>` +
    `<div style="display:flex; margin-bottom:1px;"><span style="${labelStyle}">Features:</span><span style="flex:1;">${esc(features)}</span></div>` +
    `<div style="display:flex; margin-bottom:1px;"><span style="${labelStyle}">Listing Broker(s):</span><span style="flex:1;">${esc(aBroker)}</span></div>` +
    `</div>` +
    hr +
    roomTableH +
    `<div style="margin-bottom:4px;"></div>` +
    hr +
    `<div style="display:flex; font-size:5.5px; gap:5px;">` +
    `<div style="flex:1;">` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Finished Floor (Main):</span> ${esc(mainSqft)} sqft</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Finished Floor (Above):</span> ${esc(aboveSqft)} sqft</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Finished Floor (Below):</span> ${esc(belowSqft)} sqft</div>` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}">Grand Total:</span> ${esc(sqft)} sqft</div>` +
    `</div>` +
    `<div style="flex:1;">` +
    `<div style="margin-bottom:1px;"><span style="${labelStyle}"># Of Rooms:</span> ${rooms.length}</div>` +
    `</div>` +
    `</div>` +
    hr +
    `<div style="font-size:5.5px; line-height:1.4; margin-top:4px;"><b>Welcome to ${esc(addr.split(",")[0])}...</b> ${esc(desc)}</div>`;

  const fpContent = `<div style="flex:1; width:100%; overflow:hidden; margin-bottom:10px;">${fpH}</div>`;
  const mainContent = state.useFloorplan
    ? fpContent
    : `<div style="flex:1; display:flex; flex-direction:column;">${dataContent}</div>`;

  const p1 =
    `<div style="display:flex; flex-direction:column; height:100%; background:${bgColor}; color:${txtColor}; font-family:${font}; padding:17px 17px 17px 16px; box-sizing:border-box;">` +
    mainContent +
    `<div style="margin-top:auto; border-top:0.5px solid ${txtColor}; padding-top:4px; display:flex; gap:10px; align-items:center; opacity: 0.8; flex-shrink:0;">` +
    `<div style="font-weight:700; font-size:8.5px;">cotala</div>` +
    `<div style="flex:1; font-size:4.5px; line-height:1.2; text-align:right;">The enclosed information while deemed to be correct, is not guaranteed. Information and measurements should not be relied upon without independent verification. Not intended to solicit properties already listed for sale.</div>` +
    `</div>` +
    `</div>`;

  const agentBarClean =
    `<div style="display:flex;align-items:center;gap:15px;padding:25px 24px 38px;background:${bgColor};color:${txtColor};flex-shrink:0">` +
    (imgs.agent
      ? `<img src="${imgs.agent}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;flex-shrink:0" alt="Agent">`
      : `<div style="width:100px;height:100px;border-radius:50%;background:#ddd;display:flex;align-items:center;justify-content:center;color:#aaa;flex-shrink:0"></div>`) +
    `<div style="flex:1;min-width:0">` +
    `<div style="font-size:16px;font-weight:400;line-height:1.1;margin-bottom:4px;font-family:${font};">${aName}</div>` +
    `<div style="font-size:9px;line-height:1.4;font-family:${font};opacity:0.8;">${esc(aPhone)}<br>${esc(aEmail)}<br>${esc(aWeb)}</div></div>` +
    `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;flex-shrink:0">` +
    (imgs.logo
      ? `<img src="${imgs.logo}" style="max-height:30px;max-width:80px;object-fit:contain" alt="Logo">`
      : `<div style="background:#111;padding:6px 10px;border-radius:2px;font-size:12px;font-weight:700;color:white;font-family:${font};">co</div>`) +
    `<div style="font-size:5px;text-align:center;max-width:80px;line-height:1.2;font-family:${font};opacity:0.6;">${esc(aBlbl)}</div></div></div>`;

  const p2Dict: Record<string, string> = {
    content:
      `<div style="background:${bgColor}; color:${txtColor}; padding: 24px 24px 10px;">` +
      `<div style="font-size:10px; opacity:0.7; margin-bottom:2px; font-family:${font};">Welcome to</div>` +
      `<div style="font-size:13px; font-weight:600; letter-spacing:0.5px; font-family:${font};">${esc(addr).toUpperCase()}</div>` +
      `</div>`,
    hero:
      `<div style="flex:1; padding: 0 24px; background:${bgColor}; display:flex; flex-direction:column; overflow:hidden;">` +
      `<div style="flex:1; overflow:hidden;">${heroH}</div>` +
      `</div>`,
  };

  const p2 =
    `<div style="display:flex;flex-direction:column;height:100%;background:${bgColor};">` +
    layoutP2.map((key) => p2Dict[key]).join("") +
    agentBarClean +
    `</div>`;

  const statLineP3 =
    `<div style="font-size:7px;color:${txtColor};padding:5px 0;border-top:0.5px solid ${txtColor};border-bottom:0.5px solid ${txtColor};margin:10px 0;display:flex;justify-content:space-between;text-transform:uppercase;opacity:0.8;">` +
    `<span>SIZE &nbsp;<strong>${esc(sqft)} SF</strong></span>&nbsp; | &nbsp;` +
    `<span>BEDS &nbsp;<strong>${esc(beds)}</strong></span>&nbsp; | &nbsp;` +
    `<span>BATHS &nbsp;<strong>${esc(baths)}</strong></span>&nbsp; | &nbsp;` +
    `<span>TAX &nbsp;<strong>${esc(tax)}</strong></span>&nbsp; | &nbsp;` +
    `<span>MAINT &nbsp;<strong>${esc(strata)}</strong></span></div>`;

  const p3Top =
    `<div style="padding: 30px 24px 10px; background:${bgColor}; color:${txtColor};">` +
    `<div style="font-size:14px;color:${txtColor};margin-bottom:6px;font-family:${font};opacity:0.8;text-transform:uppercase;">${esc(addr)}</div>` +
    `<div style="display:flex;align-items:baseline;gap:5px;margin-bottom:12px;">` +
    `<span style="font-size:6px;color:${txtColor};letter-spacing:0.04em;text-transform:uppercase;opacity:0.6;">Listed<br>For</span>` +
    `<span style="font-size:20px;font-weight:400;color:${txtColor};font-family:${font};line-height:1">${esc(price)}</span></div>` +
    `<div style="font-size:6.5px;line-height:1.6;font-family:${font};opacity:0.9;">${esc(desc)}</div>` +
    statLineP3 +
    `</div>`;

  const il1H = imgs.il1
    ? `<img src="${imgs.il1}" style="width:100%;height:100%;object-fit:cover" alt="Interior">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;background:#d8d8d8"><span style='font-size:9px;color:#bbb'>Left large photo — e.g. kitchen</span></div>`;

  let lbPhotos = "";
  for (let i = 1; i <= 3; i++) {
    lbPhotos +=
      `<div style="flex:1;overflow:hidden;background:${i === 2 ? "#ccc" : "#d4d4d4"}">` +
      (imgs.lb[i]
        ? `<img src="${imgs.lb[i]}" style="width:100%;height:100%;object-fit:cover" alt="Interior ${i + 1}">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:8px;color:#bbb">Bottom ${i}</div>`) +
      `</div>`;
  }

  const p3 =
    `<div style="display:flex;flex-direction:column;height:100%;background:${bgColor};">` +
    p3Top +
    `<div style="flex:1;overflow:hidden;padding:0 24px;margin-bottom:5px;">${il1H}</div>` +
    `<div style="height:159px;display:flex;gap:5px;padding:0 24px 32px;flex-shrink:0;">${lbPhotos}</div>` +
    `</div>`;

  const rhH = imgs.rh
    ? `<img src="${imgs.rh}" style="width:100%;height:100%;object-fit:cover" alt="Interior hero">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;background:#d0d0d0"><span style='font-size:9px;color:#bbb'>Right hero photo — e.g. living room</span></div>`;

  let rgPhotos = "";
  for (let j = 1; j <= 9; j++) {
    rgPhotos +=
      `<div style="overflow:hidden;background:${j % 2 ? "#d8d8d8" : "#ccc"}">` +
      (imgs.rg[j]
        ? `<img src="${imgs.rg[j]}" style="width:100%;height:100%;object-fit:cover" alt="Grid ${j}">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:8px;color:#bbb">Photo ${j}</div>`) +
      `</div>`;
  }

  const qrInner = renderQrSlotInnerHtml(tour);
  const qrBlock =
    `<div style="position:absolute;top:0;right:0;background:${bgColor};padding:8px 8px 6px;display:flex;flex-direction:column;align-items:center;gap:2px;">` +
    `<div class="qr-slot" style="width:36px;height:36px;background:#e8e8e8;border:0.5px solid #ccc;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:4.5px;color:#999;text-align:center;line-height:1.2;overflow:hidden">${qrInner}</div>` +
    `<div style="font-size:4px;color:${txtColor};text-align:center;line-height:1.2;font-weight:700;">TAKE THE TOUR<br><span style="font-weight:400;opacity:0.8;">${esc(tour)}</span></div></div>`;

  const p4Dict: Record<string, string> = {
    hero: `<div style="flex:0.85;width:100%;overflow:hidden;position:relative;background:#d0d0d0">${rhH}${qrBlock}</div>`,
    grid: `<div style="flex:1.15;width:100%;display:grid;grid-template-columns:repeat(3, 1fr);grid-template-rows:repeat(3, 1fr);gap:5px;overflow:hidden;">${rgPhotos}</div>`,
  };

  const p4 =
    `<div style="display:flex;flex-direction:column;width:100%;height:100%;background:${bgColor};padding:32px 24px;">` +
    `<div style="display:flex;flex-direction:column;gap:5px;width:100%;height:100%;">` +
    layoutP4.map((key) => p4Dict[key]).join("") +
    `</div></div>`;

  return { p1, p2, p3, p4, bgColor };
}
