import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { useLocation } from "wouter";
import { Download, Loader2, MessageCircle } from "lucide-react";
import {
  downloadOversizePdfViaApi,
  submitOversizePdfViaApi,
} from "@/lib/oversize-pdf-api";
import { buildFeatureSheetPdfPayload } from "@/lib/feature-sheet-pdf-payload";
import {
  buildPrintColorProfilePayload,
} from "@/lib/print-color-profile";
import {
  readFeatureListingFinalSnapshot,
  type FeatureListingFinalSnapshot,
} from "../feature-listing-preview";
import { buildFeatureSheetPrintHtml } from "./build-print-html";
import { captureProofSheetImages } from "./capture-proof-sheets";
import { createDefaultFormState, PRINT_LAYOUT, snapshotToFormState } from "./defaults";
import { openFeatureSheetPrintWindow } from "./open-print-window";
import { ProofModal } from "./ProofModal";
import { renderFeatureSheetPanels, type FeatureSheetFormState } from "./render-panels";
import { DEFAULT_PROOF_ORDER, type ProofOrderState } from "./types";
import "./feature-sheet-builder.css";

function buildApproveAlertMessage(order: ProofOrderState): string {
  let payload = `Order Approved!\n\nQuantity: ${order.quantity}\nDelivery Method: ${order.deliveryMethod}`;
  if (order.deliveryMethod === "ship") {
    payload += `\nAddress: ${order.shippingAddress}\nCourier: ${order.courier}`;
  }
  return payload;
}

type TabId = "property" | "photos" | "rooms" | "agent" | "design";

function getTourIdFromSearch(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

function countLbSlots(images: FeatureSheetFormState["images"]): number {
  return Math.max(0, ...Object.keys(images.lb).map(Number), 0);
}

function countRgSlots(images: FeatureSheetFormState["images"]): number {
  return Math.max(0, ...Object.keys(images.rg).map(Number), 0);
}

export default function FeatureSheetBuilderPage() {
  const [, setLocation] = useLocation();
  const tourId = getTourIdFromSearch();
  const [tab, setTab] = useState<TabId>("property");
  const [curPg, setCurPg] = useState<1 | 2>(1);
  const [form, setForm] = useState<FeatureSheetFormState>(() => createDefaultFormState(tourId));
  const [snapshot, setSnapshot] = useState<FeatureListingFinalSnapshot | null>(null);
  const [lbCount, setLbCount] = useState(0);
  const [rgCount, setRgCount] = useState(0);
  const [proofOpen, setProofOpen] = useState(false);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofSheet1, setProofSheet1] = useState<string | null>(null);
  const [proofSheet2, setProofSheet2] = useState<string | null>(null);
  const [proofOrder, setProofOrder] = useState<ProofOrderState>(DEFAULT_PROOF_ORDER);
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  useEffect(() => {
    if (!tourId) return;
    const snap = readFeatureListingFinalSnapshot(tourId);
    if (snap) {
      setSnapshot(snap);
      const next = snapshotToFormState(snap);
      setForm(next);
      setLbCount(countLbSlots(next.images) > 0 ? 3 : 0);
      setRgCount(countRgSlots(next.images) > 0 ? 9 : 0);
    }
  }, [tourId]);

  const panels = useMemo(() => renderFeatureSheetPanels(form), [form]);
  /** Server-bound HTML — no browser print script. */
  const printHtmlForApi = useMemo(
    () => buildFeatureSheetPrintHtml(panels, { autoPrint: false }),
    [panels],
  );

  const patch = useCallback((partial: Partial<FeatureSheetFormState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const onImagePick = useCallback(
    async (e: ChangeEvent<HTMLInputElement>, key: keyof FeatureSheetFormState["images"] | `lb-${number}` | `rg-${number}`) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const dataUrl = await readFileAsDataUrl(file);
      setForm((prev) => {
        const images = { ...prev.images };
        if (key.startsWith("lb-")) {
          const n = Number(key.split("-")[1]);
          images.lb = { ...images.lb, [n]: dataUrl };
        } else if (key.startsWith("rg-")) {
          const n = Number(key.split("-")[1]);
          images.rg = { ...images.rg, [n]: dataUrl };
        } else {
          images[key as keyof typeof images] = dataUrl as never;
        }
        return { ...prev, images };
      });
    },
    [],
  );

  const addLb = () => {
    if (lbCount >= 3) return;
    setLbCount((c) => c + 1);
  };
  const addRg = () => {
    if (rgCount >= 9) return;
    setRgCount((c) => c + 1);
  };

  const goSheet = (n: 1 | 2) => {
    setCurPg(n);
  };

  const panelClose = () => {
    if (tourId) setLocation(`/feature-listing?id=${encodeURIComponent(tourId)}`, { replace: true });
    else setLocation("/feature-sheet");
  };

  const hint =
    curPg === 1
      ? "Exterior: MLS data (left) + Marketing (right) · Fold at center"
      : "Interior: Photo spread — left panel + right panel · Fold at center";

  const showProof = () => {
    setProofOrder((prev) => ({
      ...prev,
      shippingAddress: prev.shippingAddress.trim() || form.addr || "",
    }));
    setProofOpen(true);
    setProofLoading(true);
    setProofSheet1(null);
    setProofSheet2(null);
    void captureProofSheetImages(panels)
      .then(({ sheet1Jpg, sheet2Jpg }) => {
        setProofSheet1(sheet1Jpg);
        setProofSheet2(sheet2Jpg);
      })
      .catch((err) => {
        console.error(err);
        window.alert(err instanceof Error ? err.message : "Could not generate proof images.");
        setProofOpen(false);
      })
      .finally(() => setProofLoading(false));
  };

  const buildApiPayload = useCallback(
    async (submitMode: "approve_proof_print" | "download_pdf") => {
      const colorProfile = await buildPrintColorProfilePayload();
      return buildFeatureSheetPdfPayload({
        form,
        panels,
        printHtml: printHtmlForApi,
        tourId,
        listingSnapshot: snapshot,
        colorProfile,
        submitMode,
        proofOrder: submitMode === "approve_proof_print" ? proofOrder : undefined,
      });
    },
    [form, panels, printHtmlForApi, tourId, snapshot, proofOrder],
  );

  const downloadPdf = () => {
    void (async () => {
      setPdfDownloading(true);
      try {
        const inner = await buildApiPayload("download_pdf");
        await downloadOversizePdfViaApi(inner as Record<string, unknown>, tourId);
      } catch (err) {
        console.error(err);
        window.alert(err instanceof Error ? err.message : "Could not download PDF.");
      } finally {
        setPdfDownloading(false);
      }
    })();
  };

  const approveProof = () => {
    if (proofOrder.deliveryMethod === "ship" && !proofOrder.shippingAddress.trim()) {
      window.alert("Please enter a valid shipping address before approving.");
      return;
    }

    void (async () => {
      setProofSubmitting(true);
      try {
        const inner = await buildApiPayload("approve_proof_print");
        const apiResult = await submitOversizePdfViaApi(inner as Record<string, unknown>);

        const lines = [
          apiResult.message || "Order submitted to print successfully.",
          "",
          buildApproveAlertMessage(proofOrder),
        ];
        if (apiResult.order_id) lines.push("", `Order ID: ${apiResult.order_id}`);
        if (apiResult.pdf_url) lines.push(`PDF: ${apiResult.pdf_url}`);

        window.alert(lines.join("\n"));
        setProofOpen(false);
        window.setTimeout(() => {
          openFeatureSheetPrintWindow(panels, { autoPrint: true });
        }, 300);
      } catch (err) {
        console.error(err);
        window.alert(err instanceof Error ? err.message : "Could not submit print order.");
      } finally {
        setProofSubmitting(false);
      }
    })();
  };

  return (
    <div className="fsb-root">
      <div className="fsb-app">
        <div className="fsb-ep">
          <div className="fsb-eh">
            <h2>Feature Sheet Editor — 4 Panel</h2>
            <p>Sheet 1: Exterior · Sheet 2: Interior (photo spread)</p>
            {tourId ? (
              <button type="button" className="fsb-back-link" onClick={panelClose}>
                ← Back to listing
              </button>
            ) : null}
          </div>
          <div className="fsb-tabs">
            {(["property", "photos", "rooms", "agent", "design"] as TabId[]).map((t) => (
              <button key={t} type="button" className={`fsb-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                {t === "property" ? "Property" : t === "photos" ? "Photos" : t === "rooms" ? "Rooms" : t === "agent" ? "Agent" : "Design"}
              </button>
            ))}
          </div>

          <div className={`fsb-tc ${tab === "property" ? "show" : ""}`}>
            <div className="fsb-st">Sheet 1 Layout</div>
            <label className="fsb-fg" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.useFloorplan} onChange={(e) => patch({ useFloorplan: e.target.checked })} />
              <span className="fsb-fl" style={{ margin: 0 }}>Show floorplan instead of MLS data</span>
            </label>
            <label className="fsb-pslot" style={{ width: "100%", height: 60, marginBottom: 12 }}>
              Upload Floorplan
              <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => void onImagePick(e, "fp")} />
            </label>
            <div className="fsb-st">Listing Info</div>
            {[
              ["MLS #", "mls"],
              ["Address", "addr"],
              ["City / Area", "city"],
            ].map(([label, key]) => (
              <div key={key} className="fsb-fg">
                <label className="fsb-fl">{label}</label>
                <input className="fsb-fi" value={(form as Record<string, string>)[key]} onChange={(e) => patch({ [key]: e.target.value } as Partial<FeatureSheetFormState>)} />
              </div>
            ))}
            <div className="fsb-fr2">
              <div className="fsb-fg"><label className="fsb-fl">List Price</label><input className="fsb-fi" value={form.price} onChange={(e) => patch({ price: e.target.value })} /></div>
              <div className="fsb-fg"><label className="fsb-fl">Type</label><input className="fsb-fi" value={form.type} onChange={(e) => patch({ type: e.target.value })} /></div>
            </div>
            <div className="fsb-st">Key Stats</div>
            <div className="fsb-fr2">
              <div className="fsb-fg"><label className="fsb-fl">Bedrooms</label><input className="fsb-fi" value={form.beds} onChange={(e) => patch({ beds: e.target.value })} /></div>
              <div className="fsb-fg"><label className="fsb-fl">Bathrooms</label><input className="fsb-fi" value={form.baths} onChange={(e) => patch({ baths: e.target.value })} /></div>
            </div>
            <div className="fsb-fr2">
              <div className="fsb-fg"><label className="fsb-fl">Size (sq ft)</label><input className="fsb-fi" value={form.sqft} onChange={(e) => patch({ sqft: e.target.value })} /></div>
              <div className="fsb-fg"><label className="fsb-fl">Year Built</label><input className="fsb-fi" value={form.year} onChange={(e) => patch({ year: e.target.value })} /></div>
            </div>
            <div className="fsb-fr2">
              <div className="fsb-fg"><label className="fsb-fl">Taxes</label><input className="fsb-fi" value={form.tax} onChange={(e) => patch({ tax: e.target.value })} /></div>
              <div className="fsb-fg"><label className="fsb-fl">Maint.</label><input className="fsb-fi" value={form.strata} onChange={(e) => patch({ strata: e.target.value })} /></div>
            </div>
            <div className="fsb-fg"><label className="fsb-fl">Description</label><textarea className="fsb-fi" rows={5} value={form.desc} onChange={(e) => patch({ desc: e.target.value })} /></div>
            <div className="fsb-fg"><label className="fsb-fl">Virtual Tour URL</label><input className="fsb-fi" value={form.tour} onChange={(e) => patch({ tour: e.target.value })} /></div>
          </div>

          <div className={`fsb-tc ${tab === "photos" ? "show" : ""}`}>
            <div style={{ opacity: curPg === 1 ? 1 : 0.35, pointerEvents: curPg === 1 ? "auto" : "none" }}>
              <div className="fsb-st">Exterior - Hero</div>
              <label className="fsb-pslot" style={{ width: "100%", height: 60, marginBottom: 12 }}>
                {form.images.hero ? <img src={form.images.hero} alt="" /> : "Exterior hero photo"}
                <input type="file" accept="image/*" hidden onChange={(e) => void onImagePick(e, "hero")} />
              </label>
            </div>
            <div style={{ opacity: curPg === 2 ? 1 : 0.35, pointerEvents: curPg === 2 ? "auto" : "none", marginTop: 12 }}>
              <div className="fsb-st">Interior Left — Large Photo</div>
              <label className="fsb-pslot" style={{ width: "100%", height: 80, marginBottom: 6 }}>
                {form.images.il1 ? <img src={form.images.il1} alt="" /> : "Left large photo"}
                <input type="file" accept="image/*" hidden onChange={(e) => void onImagePick(e, "il1")} />
              </label>
              <div className="fsb-st">Bottom Row (3)</div>
              <div className="fsb-pgrid">
                {Array.from({ length: lbCount }, (_, i) => i + 1).map((n) => (
                  <label key={n} className="fsb-pslot" style={{ aspectRatio: "4/3" }}>
                    {form.images.lb[n] ? <img src={form.images.lb[n]} alt="" /> : `Bottom ${n}`}
                    <input type="file" accept="image/*" hidden onChange={(e) => void onImagePick(e, `lb-${n}`)} />
                  </label>
                ))}
              </div>
              <button type="button" className="fsb-addbtn" onClick={addLb} disabled={lbCount >= 3}>Add photo (max 3)</button>
              <div className="fsb-st">Interior Right — Hero</div>
              <label className="fsb-pslot" style={{ width: "100%", height: 90, marginBottom: 6 }}>
                {form.images.rh ? <img src={form.images.rh} alt="" /> : "Right hero photo"}
                <input type="file" accept="image/*" hidden onChange={(e) => void onImagePick(e, "rh")} />
              </label>
              <div className="fsb-st">Grid (9)</div>
              <div className="fsb-pgrid">
                {Array.from({ length: rgCount }, (_, i) => i + 1).map((n) => (
                  <label key={n} className="fsb-pslot" style={{ aspectRatio: "4/3" }}>
                    {form.images.rg[n] ? <img src={form.images.rg[n]} alt="" /> : `Grid ${n}`}
                    <input type="file" accept="image/*" hidden onChange={(e) => void onImagePick(e, `rg-${n}`)} />
                  </label>
                ))}
              </div>
              <button type="button" className="fsb-addbtn" onClick={addRg} disabled={rgCount >= 9}>Add photo (max 9)</button>
            </div>
          </div>

          <div className={`fsb-tc ${tab === "rooms" ? "show" : ""}`}>
            <div className="fsb-st">Room Dimensions</div>
            {form.rooms.map((rm, i) => (
              <div key={i} className="fsb-rrow">
                <input className="fsb-fi" value={rm.f} onChange={(e) => { const rooms = [...form.rooms]; rooms[i] = { ...rm, f: e.target.value }; patch({ rooms }); }} />
                <input className="fsb-fi" value={rm.r} onChange={(e) => { const rooms = [...form.rooms]; rooms[i] = { ...rm, r: e.target.value }; patch({ rooms }); }} />
                <input className="fsb-fi" value={rm.d} onChange={(e) => { const rooms = [...form.rooms]; rooms[i] = { ...rm, d: e.target.value }; patch({ rooms }); }} />
                <button type="button" className="fsb-delbtn" onClick={() => patch({ rooms: form.rooms.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <button type="button" className="fsb-addbtn" onClick={() => patch({ rooms: [...form.rooms, { f: "Main", r: "", d: "" }] })}>Add room</button>
          </div>

          <div className={`fsb-tc ${tab === "agent" ? "show" : ""}`}>
            {[
              ["Name", "agentName"],
              ["Phone", "agentPhone"],
              ["Email", "agentEmail"],
              ["Website", "agentWeb"],
              ["Brokerage", "agentBroker"],
            ].map(([label, key]) => (
              <div key={key} className="fsb-fg">
                <label className="fsb-fl">{label}</label>
                <input className="fsb-fi" value={(form as Record<string, string>)[key]} onChange={(e) => patch({ [key]: e.target.value } as Partial<FeatureSheetFormState>)} />
              </div>
            ))}
            <label className="fsb-pslot" style={{ width: 70, height: 84 }}>
              {form.images.agent ? <img src={form.images.agent} alt="" style={{ objectFit: "cover" }} /> : "Agent"}
              <input type="file" accept="image/*" hidden onChange={(e) => void onImagePick(e, "agent")} />
            </label>
            <label className="fsb-pslot" style={{ width: "100%", height: 40 }}>
              {form.images.logo ? <img src={form.images.logo} alt="" style={{ objectFit: "contain" }} /> : "Company logo"}
              <input type="file" accept="image/*" hidden onChange={(e) => void onImagePick(e, "logo")} />
            </label>
          </div>

          <div className={`fsb-tc ${tab === "design" ? "show" : ""}`}>
            <div className="fsb-fg">
              <label className="fsb-fl">Background</label>
              <div className="fsb-cr">
                <input type="color" className="fsb-cs" value={form.bgColor} onChange={(e) => patch({ bgColor: e.target.value })} />
                <input className="fsb-ci" value={form.bgColor} onChange={(e) => patch({ bgColor: e.target.value })} />
              </div>
            </div>
            <div className="fsb-fg">
              <label className="fsb-fl">Text</label>
              <div className="fsb-cr">
                <input type="color" className="fsb-cs" value={form.textColor} onChange={(e) => patch({ textColor: e.target.value })} />
                <input className="fsb-ci" value={form.textColor} onChange={(e) => patch({ textColor: e.target.value })} />
              </div>
            </div>
            <div className="fsb-fg">
              <label className="fsb-fl">Display Font</label>
              <select className="fsb-fi" value={form.displayFont} onChange={(e) => patch({ displayFont: e.target.value })}>
                <option value="'Georgia',serif">Georgia (Serif)</option>
                <option value="'Times New Roman',serif">Times New Roman</option>
                <option value="'Arial',sans-serif">Arial (Sans)</option>
              </select>
            </div>
          </div>

          <div className="fsb-acts">
            <button
              type="button"
              className="fsb-btn fsb-btnp"
              disabled={pdfDownloading}
              onClick={downloadPdf}
            >
              {pdfDownloading ? (
                <>
                  <Loader2 className="inline h-3 w-3 animate-spin" aria-hidden /> Generating…
                </>
              ) : (
                <>
                  <Download className="inline h-3 w-3" aria-hidden /> Download PDF
                </>
              )}
            </button>
            <button type="button" className="fsb-btn" onClick={() => goSheet(curPg === 1 ? 2 : 1)}>
              Sheet {curPg === 1 ? "2 →" : "1 ←"}
            </button>
          </div>
        </div>

        <div className="fsb-pp">
          <div className="fsb-pnav">
            <button type="button" className={`fsb-pn ${curPg === 1 ? "active" : ""}`} onClick={() => goSheet(1)}>Sheet 1 — Exterior</button>
            <button type="button" className={`fsb-pn ${curPg === 2 ? "active" : ""}`} onClick={() => goSheet(2)}>Sheet 2 — Interior</button>
          </div>
          <div className="fsb-hint">{hint}</div>
          <div className="fsb-sw">
            <div className="fsb-sheet">
              <div className="fsb-bb" />
              {curPg === 1 ? (
                <>
                  <div
                    className="fsb-pg fsb-fold"
                    style={{ fontFamily: "Arial,sans-serif", display: "flex", flexDirection: "column" }}
                    dangerouslySetInnerHTML={{ __html: panels.p1 }}
                  />
                  <div
                    className="fsb-pg"
                    style={{ display: "flex", flexDirection: "column" }}
                    dangerouslySetInnerHTML={{ __html: panels.p2 }}
                  />
                </>
              ) : (
                <>
                  <div
                    className="fsb-pg fsb-fold"
                    style={{ display: "flex", flexDirection: "column" }}
                    dangerouslySetInnerHTML={{ __html: panels.p3 }}
                  />
                  <div
                    className="fsb-pg"
                    style={{ display: "flex", flexDirection: "column" }}
                    dangerouslySetInnerHTML={{ __html: panels.p4 }}
                  />
                </>
              )}
            </div>
          </div>
          <div className="fsb-hint" style={{ marginTop: 5 }}>
            Blue outline = 11.58&quot;×17.58&quot; bleed · Dashed = fold · Sheet 1112×748px (same as HTML mockup)
          </div>
        </div>
      </div>

      <ProofModal
        open={proofOpen}
        loading={proofLoading}
        sheet1Jpg={proofSheet1}
        sheet2Jpg={proofSheet2}
        order={proofOrder}
        submitting={proofSubmitting}
        onClose={() => {
          if (!proofSubmitting) setProofOpen(false);
        }}
        onOrderChange={(patch) => setProofOrder((prev) => ({ ...prev, ...patch }))}
        onApprove={approveProof}
      />

      <button
        type="button"
        className="fsb-chat-fab"
        aria-label="Open chat support"
        onClick={() => window.dispatchEvent(new CustomEvent("cotala-open-chat"))}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
