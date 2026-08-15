import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { approveProof, getProofDetail, requestProofChanges } from "@/lib/api";
import PortalFooter from "@/components/portal/PortalFooter";

type ProofData = {
  id?: number | string;
  description?: string;
  status?: string;
  preview_url?: string;
  proof_url?: string;
  product_details?: { name?: string };
  tour?: { address?: string; city?: string; unit?: string };
};

export default function ProofReview() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const proofId = params.get("id");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showChanges, setShowChanges] = useState(false);
  const [proof, setProof] = useState<ProofData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!proofId) {
        setError("Proof ID is required");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getProofDetail(proofId);
        if (data.status && data.data) {
          setProof(data.data as ProofData);
        } else {
          setError(data.msg || "Proof not found");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load proof");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [proofId]);

  const handleApprove = async () => {
    if (!proofId) return;
    try {
      setSaving(true);
      const data = await approveProof(proofId);
      if (data.status) {
        setProof((prev) => (prev ? { ...prev, status: "Approved" } : prev));
        alert("Proof approved");
        setLocation("/orders");
      } else {
        alert(data.msg || "Unable to approve proof");
      }
    } catch (err) {
      console.error(err);
      alert("Unable to approve proof");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!proofId || !message.trim()) {
      alert("Please describe the changes you need");
      return;
    }
    try {
      setSaving(true);
      const data = await requestProofChanges(proofId, message.trim());
      if (data.status) {
        alert("Change request submitted");
        setLocation("/orders");
      } else {
        alert(data.msg || "Unable to submit change request");
      }
    } catch (err) {
      console.error(err);
      alert("Unable to submit change request");
    } finally {
      setSaving(false);
    }
  };

  const title = proof?.product_details?.name || "Proof Review";
  const address = [proof?.tour?.unit, proof?.tour?.address, proof?.tour?.city].filter(Boolean).join(", ")
    || proof?.description
    || "";
  const preview = proof?.preview_url || proof?.proof_url || "";

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="hero-section">
        <div className="container mx-auto px-4">
          <h1 className="hero-title">Proof Review</h1>
          <p className="hero-desc">{loading ? "Loading..." : title}</p>
          {address ? <p className="hero-desc-1">{address}</p> : null}
        </div>
      </div>

      <div className="service-package">
        <div className="container mx-auto px-4 my-3">
          {error ? (
            <div className="text-red-400 py-8">{error}</div>
          ) : (
            <div className="order-card-1">
              <div className="order-top gap-3">
                <div className="order-right text-end flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={saving}
                    onClick={() => setShowChanges((v) => !v)}
                  >
                    REQUEST CHANGES
                  </button>
                  <button type="button" className="btn-main" disabled={saving} onClick={handleApprove}>
                    APPROVE NOW
                  </button>
                </div>
              </div>
              <div className="order-body p-4">
                {showChanges && (
                  <div className="mb-4">
                    <textarea
                      className="form-control w-full min-h-[120px]"
                      placeholder="Tell us what you’d like changed..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-main mt-3"
                      disabled={saving}
                      onClick={handleRequestChanges}
                    >
                      SUBMIT CHANGES
                    </button>
                  </div>
                )}
                {loading ? (
                  <div className="text-white/70 py-16 text-center">Loading proof...</div>
                ) : preview ? (
                  preview.toLowerCase().includes(".pdf") || preview.includes("proof.php") ? (
                    <embed src={preview} type="application/pdf" width="100%" height="1000px" />
                  ) : (
                    <img src={preview} alt="Proof preview" className="w-full rounded-lg" />
                  )
                ) : (
                  <div className="text-white/70 py-16 text-center">No proof file available yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <PortalFooter />
    </div>
  );
}
