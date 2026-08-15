import qrcode from "qrcode-generator";

/** Same as Feature_sheet_builder2.html `normalizeUrl` + `qrcode(0,"M")`. */
export function normalizeTourUrl(raw: string): string {
  let u = (raw || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

/** Inline SVG for 36×36 slot — matches mockup `createSvgTag({cellSize:2,margin:1})`. */
export function renderQrSlotInnerHtml(tourUrl: string): string {
  const url = normalizeTourUrl(tourUrl);
  if (!url) {
    return '<div style="font-size:4.5px;color:#999;text-align:center;line-height:1.2">NO TOUR<br>URL SET</div>';
  }
  try {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    return qr.createSvgTag({ cellSize: 2, margin: 1 });
  } catch {
    return '<div style="font-size:4px;color:#c00;text-align:center;line-height:1.2">QR ERROR</div>';
  }
}
