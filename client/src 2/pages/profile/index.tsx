import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import lightLogo from "@/pages/images/logos/light-logo.svg";
import { getProfile, type GetProfileResponse, type UserProfile } from "@/lib/api";

function formatAccountCreated(joined: string | undefined): string {
  if (!joined) return "—";
  const d = new Date(joined);
  if (Number.isNaN(d.getTime())) return joined;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function buildShippingDisplay(profile: UserProfile): string {
  if (profile.shipping === "agency" && profile.agencydetails) {
    const a = profile.agencydetails;
    const parts = [a.address || [a.street, a.city, a.province, a.postal].filter(Boolean).join(", ")];
    if (a.phone) parts.push(a.phone);
    return parts.join(" · ") || "Agency";
  }
  if (profile.shipping === "home" || profile.shipping === "office") {
    const parts = [];
    if (profile.unit) parts.push(profile.unit);
    if (profile.street) parts.push(profile.street);
    if (profile.city) parts.push(profile.city);
    if (profile.province) parts.push(profile.province);
    if (profile.postal) parts.push(profile.postal);
    if (parts.length) return parts.join(", ");
  }
  return profile.shipping || profile.shippingnote || "—";
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<GetProfileResponse | null>(null);

  const profile = profileData?.user_profile;

  // Local state for editable fields (optional – can be expanded later)
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agencyPhone, setAgencyPhone] = useState("");
  const [mlsPhotoSubmission, setMlsPhotoSubmission] = useState("");
  const [shippingTo, setShippingTo] = useState("");
  const [twitter, setTwitter] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await getProfile();
        if (data.status && data.user_profile) {
          setProfileData(data);
          const p = data.user_profile as UserProfile;
          setDisplayName(p.name ?? "");
          setEmail(p.email ?? "");
          setPhone((p.cell || p.phone) ?? "");
          setWebsite(p.url ?? "");
          setAgencyName((p.agencydetails?.name) ?? "");
          setAgencyPhone((p.agencydetails?.phone) ?? "");
          setMlsPhotoSubmission(p.pref_photos ?? "");
          setShippingTo(buildShippingDisplay(p));
          setTwitter(p.twitter ?? "");
        }
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Recompute shipping when profile (and nested agencydetails) is available
  useEffect(() => {
    if (profile) {
      setShippingTo(buildShippingDisplay(profile as UserProfile));
      if (profile.agencydetails) {
        setAgencyName(profile.agencydetails.name ?? "");
        setAgencyPhone(profile.agencydetails.phone ?? "");
      }
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="new-bg-4 w-full relative" style={{ height: "200px", minHeight: "200px" }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative h-full flex flex-col justify-end p-6 md:p-8 z-10">
          <div className="overlay-1">
            <h2 className="text-white text-3xl md:text-4xl font-bold">Profile</h2>
          </div>
        </div>
      </div>

      <div className="service-package bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-wrap -mx-4">
            <div className="w-full md:w-8/12 px-4 space-y-8">
              {/* 1. Account Details */}
              <section>
                <h3 className="text-white text-xl font-semibold mb-4 border-b border-white/20 pb-2">
                  1. Account Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/70 text-sm">Display Name</Label>
                    <p className="text-white mt-1">{displayName || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-white/70 text-sm">Email Address</Label>
                    <p className="text-white mt-1">{email || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-white/70 text-sm">Phone Number</Label>
                    <p className="text-white mt-1">{phone || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-white/70 text-sm">Website</Label>
                    <p className="text-white mt-1">{website ? (website.startsWith("http") ? website : `https://${website}`) : "—"}</p>
                  </div>
                  <div>
                    <Label className="text-white/70 text-sm">Account Created</Label>
                    <p className="text-white mt-1">{formatAccountCreated(profile?.joined)}</p>
                  </div>
                </div>
              </section>

              {/* 2. Agency / Brokerage Details */}
              <section>
                <h3 className="text-white text-xl font-semibold mb-4 border-b border-white/20 pb-2">
                  2. Agency / Brokerage Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/70 text-sm">Agency Name</Label>
                    <p className="text-white mt-1">{agencyName || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-white/70 text-sm">Agency Phone</Label>
                    <p className="text-white mt-1">{agencyPhone || "—"}</p>
                  </div>
                </div>
              </section>

              {/* 3. Your Preferences */}
              <section>
                <h3 className="text-white text-xl font-semibold mb-4 border-b border-white/20 pb-2">
                  3. Your Preferences
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/70 text-sm">MLS Photo Submission</Label>
                    <p className="text-white mt-1">{mlsPhotoSubmission || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-white/70 text-sm">Shipping to</Label>
                    <p className="text-white mt-1">{shippingTo || "—"}</p>
                  </div>
                </div>
              </section>

              {/* 4. Social Networks */}
              <section>
                <h3 className="text-white text-xl font-semibold mb-4 border-b border-white/20 pb-2">
                  4. Social Networks
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/70 text-sm">X (Twitter)</Label>
                    <p className="text-white mt-1">{twitter || "—"}</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Right card – optional summary */}
            <div className="w-full md:w-4/12 px-4 mt-6 md:mt-0">
              <div className="realtor-card shadow-lg bg-black/40 border border-white/20 rounded-lg p-6 relative">
                <div className="mb-3">
                  <h6 className="text-white/70 text-sm mb-1">Realtor ID</h6>
                  <p className="text-white">{profile?.username ?? "—"}</p>
                </div>
                <div className="mb-3">
                  <h6 className="text-white/70 text-sm mb-1">Name</h6>
                  <p className="text-white">{displayName || "—"}</p>
                </div>
                <div className="mb-3">
                  <h6 className="text-white/70 text-sm mb-1">Brokerage</h6>
                  <p className="text-white">
                    {agencyName || "—"}
                    {agencyPhone ? (
                      <>
                        <br />
                        {agencyPhone}
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer bg-black border-t border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-left mb-3 md:mb-0">
              <img src={lightLogo} width="100" alt="Logo" className="mb-2" />
              <div className="copyright text-sm text-white/50 text-left">
                © 2025 Cotala Cross Media Inc. All Rights Reserved.
              </div>
            </div>
            <div className="chat-support flex items-center gap-2">
              <div className="status-dot w-2 h-2 bg-green-500 rounded-full" />
              <div className="text-sm font-medium text-white">CHAT SUPPORT</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
