import { useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, Eye, EyeOff, Lock, Palette, Plus, Sliders, User } from "lucide-react";
import { useLocation } from "wouter";
import {
  changePortalPassword,
  deleteStripePaymentMethod,
  getPortalProfile,
  getStripePaymentMethods,
  savePortalPreferences,
  savePortalProfile,
  setDefaultStripePaymentMethod,
} from "@/lib/api";
import PortalFooter from "@/components/portal/PortalFooter";
import PreferencesEditor from "@/components/portal/PreferencesEditor";

type ProfilePayload = {
  contact?: {
    primary?: { name?: string; email?: string; phone?: string; username?: string };
    administrator?: { adminemail?: string; adminphone?: string; adminname?: string; team?: string };
    web_social?: { domain?: string; twitter?: string; instagram?: string; facebook?: string };
    company?: { name?: string; phone?: string; address?: string };
    preferences?: { spam?: string };
  };
  shipping?: {
    shipping?: string;
    unit?: string;
    street?: string;
    city?: string;
    province?: string;
    postal?: string;
    shipnotes?: string;
  };
  media_preferences?: {
    assets?: { headshot?: string; logo?: string; broker_logo?: string };
  };
  billing?: {
    billingemail?: string;
    billingaddress?: string;
    cardpoint?: { last4?: string; cardtype?: string; expiry_month?: string; expiry_year?: string };
  };
  summary?: { customer_since?: string };
  agent?: Record<string, unknown>;
};

type TabId = "profile" | "branding" | "preferences" | "security" | "billing";

const TABS: Array<{ id: TabId; label: string; icon: typeof User }> = [
  { id: "profile", label: "Profile", icon: User },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "preferences", label: "Preferences", icon: Sliders },
  { id: "security", label: "Login & Security", icon: Lock },
  { id: "billing", label: "Billing", icon: CreditCard },
];

function tabFromUrl(pathname: string, search: string): TabId {
  const params = new URLSearchParams(search);
  const q = (params.get("tab") || params.get("section") || "") as TabId;
  if (TABS.some((t) => t.id === q)) return q;
  if (pathname.includes("preferences")) return "preferences";
  return "profile";
}

type CardMethod = {
  id: string;
  card?: { brand?: string; last4?: string; exp_month?: number; exp_year?: number };
};

export default function Profile({ defaultTab }: { defaultTab?: TabId }) {
  const [location, setLocation] = useLocation();
  const [tab, setTab] = useState<TabId>(
    defaultTab || tabFromUrl(window.location.pathname, window.location.search),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    adminemail: "",
    adminphone: "",
    shipping: "office",
    street: "",
    unit: "",
    city: "",
    province: "",
    postal: "",
    instagram: "",
    twitter: "",
    facebook: "",
    url: "",
    spam: "yes",
    sms: "yes",
  });
  const [bgColour, setBgColour] = useState("#000000");
  const [textColour, setTextColour] = useState("#ffffff");
  const [accentColour, setAccentColour] = useState("#AC8ABF");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [editingRecovery, setEditingRecovery] = useState<"email" | "phone" | null>(null);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [cards, setCards] = useState<CardMethod[]>([]);
  const [activeCardId, setActiveCardId] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const headshotInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const next = defaultTab || tabFromUrl(location, window.location.search);
    setTab(next);
  }, [location, defaultTab]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getPortalProfile();
        if (res.status && res.data) {
          const payload = res.data as ProfilePayload;
          setData(payload);
          const agent = payload.agent || {};
          setForm({
            name: payload.contact?.primary?.name || "",
            email: payload.contact?.primary?.email || "",
            phone: payload.contact?.primary?.phone || "",
            adminemail: payload.contact?.administrator?.adminemail || "",
            adminphone: payload.contact?.administrator?.adminphone || "",
            shipping: payload.shipping?.shipping || "office",
            street: payload.shipping?.street || "",
            unit: payload.shipping?.unit || "",
            city: payload.shipping?.city || "",
            province: payload.shipping?.province || "",
            postal: payload.shipping?.postal || "",
            instagram: payload.contact?.web_social?.instagram || "",
            twitter: payload.contact?.web_social?.twitter || "",
            facebook: payload.contact?.web_social?.facebook || "",
            url: payload.contact?.web_social?.domain || "",
            spam: payload.contact?.preferences?.spam === "no" ? "no" : "yes",
            sms: String(agent.sms || "yes") === "no" ? "no" : "yes",
          });
          setBgColour(String(agent.bgColour || agent.bgcolour || "#000000"));
          setTextColour(String(agent.textColour || agent.textcolour || "#ffffff"));
          setAccentColour(String(agent.accentColour || "#AC8ABF"));
          setRecoveryEmail(String(agent.recovery_email || payload.contact?.primary?.email || ""));
          setRecoveryPhone(String(agent.recovery_phone || payload.contact?.primary?.phone || ""));
          setEmailAlerts(Boolean(agent.security_email_new_login ?? 1));
          setSmsAlerts(Boolean(agent.security_sms_suspicious ?? 1));
          setBillingEmail(payload.billing?.billingemail || payload.contact?.primary?.email || "");
        }
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (tab !== "billing") return;
    getStripePaymentMethods()
      .then((methods) => {
        const payload = (methods.data || {}) as { payment_methods?: CardMethod[] };
        const list = payload.payment_methods || [];
        setCards(list);
        if (list[0]?.id) setActiveCardId(list[0].id);
      })
      .catch((err) => console.warn("Unable to load cards", err));
  }, [tab]);

  const selectTab = (id: TabId) => {
    setTab(id);
    const path = id === "preferences" ? "/preferences-2" : `/profile?tab=${id}`;
    setLocation(path);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const res = await savePortalProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
        adminemail: form.adminemail,
        adminphone: form.adminphone,
        shipping: form.shipping,
        street: form.street,
        unit: form.unit,
        city: form.city,
        province: form.province,
        postal: form.postal,
        instagram: form.instagram,
        twitter: form.twitter,
        facebook: form.facebook,
        url: form.url,
        spam: form.spam,
      });
      if (!res.status) {
        alert(res.msg || "Unable to save profile");
        return;
      }
      setEditing(false);
      alert("Profile saved");
    } catch (error) {
      console.error(error);
      alert("Unable to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    try {
      setSaving(true);
      const res = await savePortalProfile({
        bgColour,
        textColour,
      });
      if (res.status) alert("Branding saved");
      else alert(res.msg || "Unable to save branding");
    } catch (error) {
      console.error(error);
      alert("Unable to save branding");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      alert("Enter current and new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match");
      return;
    }
    try {
      setSaving(true);
      const res = await changePortalPassword(currentPassword, newPassword);
      if (res.status) {
        alert("Password updated");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        alert(res.msg || res.message || "Current password not matched");
      }
    } catch (error) {
      console.error(error);
      alert("Unable to update password");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRecovery = async () => {
    try {
      setSaving(true);
      const res = await savePortalPreferences({
        recovery_email: recoveryEmail,
        recovery_phone: recoveryPhone,
        security_email_new_login: emailAlerts,
        security_sms_suspicious: smsAlerts,
      });
      if (res.status) {
        setEditingRecovery(null);
        alert("Security settings saved");
      } else {
        alert(res.msg || "Unable to save security settings");
      }
    } catch (error) {
      console.error(error);
      alert("Unable to save security settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBilling = async () => {
    try {
      setSaving(true);
      const res = await savePortalProfile({ billingemail: billingEmail });
      if (res.status) alert("Billing saved");
      else alert(res.msg || "Unable to save billing");
    } catch (error) {
      console.error(error);
      alert("Unable to save billing");
    } finally {
      setSaving(false);
    }
  };

  const assets = data?.media_preferences?.assets;
  const realtorId = data?.contact?.primary?.username || String(data?.agent?.username || "—");
  const since = useMemo(() => data?.summary?.customer_since || "—", [data]);
  const passwordStrength = newPassword.length >= 10 ? 90 : newPassword.length >= 8 ? 70 : newPassword.length * 8;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="service-package">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row">
            <div className="account-sidebar p-3">
              <ul className="flex lg:flex-col gap-2 overflow-x-auto">
                {TABS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`nav-link w-full text-left ${tab === item.id ? "active" : ""}`}
                        onClick={() => selectTab(item.id)}
                      >
                        <Icon className="inline w-4 h-4 me-2" /> {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="account-content">
              {tab === "profile" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7">
                    <h2 className="mb-4 text-3xl font-semibold">Profile</h2>
                    <div className="mb-3">
                      <div className="email-label">Name</div>
                      {editing ? (
                        <input className="form-control mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      ) : (
                        <div className="email-value">{form.name || "—"}</div>
                      )}
                    </div>
                    <div className="mb-3">
                      <div className="email-label">Primary Email</div>
                      {editing ? (
                        <input className="form-control mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      ) : (
                        <div className="email-value">{form.email || "—"}</div>
                      )}
                    </div>
                    <div className="mb-4">
                      <div className="email-label">Optional</div>
                      <div className="email-value">
                        Admin &nbsp;&nbsp;&nbsp;
                        {editing ? (
                          <input className="form-control mt-1" value={form.adminemail} onChange={(e) => setForm({ ...form, adminemail: e.target.value })} />
                        ) : (
                          <span>{form.adminemail || "—"}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-end mb-4">
                      {!editing ? (
                        <button type="button" className="edit-link" onClick={() => setEditing(true)}>EDIT</button>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button type="button" className="btn btn-sm btn-light" disabled={saving} onClick={handleSaveProfile}>Save</button>
                          <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setEditing(false)}>Cancel</button>
                        </div>
                      )}
                      <hr className="border-white/10 mt-3" />
                    </div>

                    <h6 className="text-white mb-3">Phone</h6>
                    <div className="mb-2 flex justify-between items-center">
                      <div>
                        {editing ? (
                          <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        ) : (
                          <div className="phone-number">{form.phone || "—"}</div>
                        )}
                      </div>
                      <div className="label">As Advertised</div>
                    </div>
                    <div className="mb-4 flex justify-between items-center">
                      <div>
                        {editing ? (
                          <input className="form-control" value={form.adminphone} onChange={(e) => setForm({ ...form, adminphone: e.target.value })} />
                        ) : (
                          <div className="phone-number">{form.adminphone || "—"}</div>
                        )}
                      </div>
                      <div className="label">Admin</div>
                    </div>
                    <hr className="border-white/10 mb-6" />

                    <h6 className="mb-4 text-white">Default Shipping</h6>
                    <select
                      className="form-control mb-3"
                      disabled={!editing}
                      value={form.shipping}
                      onChange={(e) => setForm({ ...form, shipping: e.target.value })}
                    >
                      <option value="office">Office delivery</option>
                      <option value="pickup">Pickup</option>
                      <option value="home">Home delivery</option>
                    </select>
                    <div className="flex items-center mb-3 gap-3">
                      <label className="form-label mb-0">Address</label>
                      <input
                        className="form-control flex-1"
                        disabled={!editing}
                        value={[form.unit, form.street, form.city, form.province, form.postal].filter(Boolean).join(", ")}
                        onChange={(e) => setForm({ ...form, street: e.target.value })}
                      />
                    </div>
                    <div className="mb-4">
                      <span className="text-white/40 text-xs">Optional</span>
                      <div className="flex items-center gap-3">
                        <label className="form-label mb-0">Buzzer Code</label>
                        <input className="form-control flex-1" disabled={!editing} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                      </div>
                    </div>
                    <hr className="border-white/10 mb-6" />

                    <h6 className="text-white mb-3">Social Links</h6>
                    {editing ? (
                      <div className="space-y-2 mb-4">
                        <input className="form-control" placeholder="Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
                        <input className="form-control" placeholder="Twitter" value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} />
                        <input className="form-control" placeholder="Website" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                      </div>
                    ) : (
                      <div className="mb-4 text-white">{form.instagram || form.url || "—"}</div>
                    )}
                    <hr className="border-white/10 mb-6" />

                    <h6 className="text-white mb-3">Receive Email Promotions</h6>
                    <label className="mr-4"><input type="radio" checked={form.spam === "yes"} disabled={!editing} onChange={() => setForm({ ...form, spam: "yes" })} /> Yes</label>
                    <label><input type="radio" checked={form.spam === "no"} disabled={!editing} onChange={() => setForm({ ...form, spam: "no" })} /> No</label>
                    <hr className="border-white/10 my-6" />
                    <h6 className="text-white mb-3">Receive SMS communication</h6>
                    <label className="mr-4"><input type="radio" checked={form.sms === "yes"} disabled={!editing} onChange={() => setForm({ ...form, sms: "yes" })} /> Yes</label>
                    <label><input type="radio" checked={form.sms === "no"} disabled={!editing} onChange={() => setForm({ ...form, sms: "no" })} /> No</label>
                  </div>
                  <div className="lg:col-span-5">
                    <div className="info-card">
                      <div className="verified">VERIFIED</div>
                      <div className="info-label">Realtor ID</div>
                      <div className="info-value">{realtorId}</div>
                      <div className="info-label">Name</div>
                      <div className="info-value">{form.name || "—"}</div>
                      <div className="info-label">Team Name</div>
                      <div className="info-value">{data?.contact?.administrator?.team || data?.contact?.company?.name || "—"}</div>
                      <div className="info-label">Brokerage</div>
                      <div className="info-value">
                        {data?.contact?.company?.name || "—"}
                        {data?.contact?.company?.address ? (
                          <>
                            <br />
                            {data.contact.company.address}
                          </>
                        ) : null}
                        {data?.contact?.company?.phone ? (
                          <>
                            <br />
                            {data.contact.company.phone}
                          </>
                        ) : null}
                      </div>
                      <div className="info-label">Customer Since</div>
                      <div className="info-value">{since}</div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "branding" && (
                <div>
                  <h2 className="mb-6">Branding</h2>
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="mb-0 text-white">Headshots</h5>
                    <button type="button" className="add-btn" onClick={() => headshotInput.current?.click()}>
                      <Plus className="inline w-3 h-3" /> ADD NEW
                    </button>
                    <input ref={headshotInput} type="file" accept="image/*" className="hidden" onChange={() => alert("Headshot selected. Save branding to keep colours; upload API is used from the account tools.")} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="headshot-card p-2">
                      {assets?.headshot ? <img src={assets.headshot} alt="Headshot" /> : <div className="h-[140px] flex items-center justify-center text-white/40">No file</div>}
                      <div className="mt-2">
                        <h6 className="mb-1 text-white">Primary</h6>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <h5 className="mb-0 text-white">Logo Variation</h5>
                    <button type="button" className="add-btn" onClick={() => logoInput.current?.click()}>
                      <Plus className="inline w-3 h-3" /> ADD NEW
                    </button>
                    <input ref={logoInput} type="file" accept="image/*" className="hidden" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                      ["Main Logo", assets?.logo],
                      ["Broker Logo", assets?.broker_logo],
                    ].map(([label, src]) => (
                      <div key={label} className="headshot-card p-2">
                        {src ? <img src={src} alt={label} className="object-contain bg-white" /> : <div className="h-[140px] flex items-center justify-center text-white/40">No file</div>}
                        <div className="mt-2"><h6 className="mb-1 text-white">{label}</h6></div>
                      </div>
                    ))}
                  </div>

                  <h5 className="mb-4 text-white">Colour Palette</h5>
                  <div className="flex flex-wrap items-center gap-6 mb-8">
                    {[
                      ["Primary background", bgColour, setBgColour],
                      ["Primary text", textColour, setTextColour],
                      ["Secondary background", accentColour, setAccentColour],
                    ].map(([label, value, setter]) => (
                      <label key={String(label)} className="color-item text-center">
                        <input
                          type="color"
                          className="color-circle p-0 border-0 cursor-pointer"
                          value={String(value)}
                          onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                        />
                        <div className="mt-2 text-white text-sm">{String(label)}</div>
                      </label>
                    ))}
                  </div>
                  <button type="button" className="btn-purple" disabled={saving} onClick={handleSaveBranding}>
                    {saving ? "Saving..." : "Save Branding"}
                  </button>
                </div>
              )}

              {tab === "preferences" && <PreferencesEditor />}

              {tab === "security" && (
                <div>
                  <h2>Login & Security</h2>
                  <p className="service-package-desc mb-6">Manage your account security and keep your data safe.</p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <div className="dark-card mb-4">
                        <h5 className="mb-1 text-white">Change Password</h5>
                        <div className="card-sub mb-4">Update your password regularly to keep your account secure.</div>
                        <div className="mb-3">
                          <label className="form-label">Current Password</label>
                          <div className="relative">
                            <input type={showPass ? "text" : "password"} className="form-control custom-input w-full" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                            <button type="button" className="eye-icon" onClick={() => setShowPass((v) => !v)}>
                              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">New Password</label>
                          <input type="password" className="form-control custom-input w-full" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="progress flex-grow-1 me-3 h-2 bg-white/10 rounded">
                            <div className="h-2 rounded bg-[#57ff57]" style={{ width: `${Math.min(passwordStrength, 100)}%` }} />
                          </div>
                          <span style={{ color: "#57ff57", fontSize: 13 }}>{passwordStrength >= 70 ? "Strong" : "Weak"}</span>
                        </div>
                        <div className="small-muted mb-4">Use at least 8 characters with a mix of letters, numbers & symbols.</div>
                        <div className="mb-4">
                          <label className="form-label">Confirm New Password</label>
                          <input type="password" className="form-control custom-input w-full" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                        <button type="button" className="btn-purple" disabled={saving} onClick={handleUpdatePassword}>
                          Update Password
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="dark-card mb-4">
                        <h5 className="mb-1 text-white">Account Recovery</h5>
                        <div className="card-sub mb-4">Keep your recovery information up to date.</div>
                        <div className="recovery-row mb-4">
                          <div>
                            <div className="text-white recovery-title">Recovery Email</div>
                            {editingRecovery === "email" ? (
                              <input className="form-control custom-input mt-2" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} />
                            ) : (
                              <div className="small-muted">{recoveryEmail || "—"}</div>
                            )}
                          </div>
                          <button type="button" className="recovery-btn" onClick={() => setEditingRecovery(editingRecovery === "email" ? null : "email")}>
                            {editingRecovery === "email" ? "Done" : "Edit"}
                          </button>
                        </div>
                        <div className="recovery-row mb-4">
                          <div>
                            <div className="text-white recovery-title">Recovery Phone</div>
                            {editingRecovery === "phone" ? (
                              <input className="form-control custom-input mt-2" value={recoveryPhone} onChange={(e) => setRecoveryPhone(e.target.value)} />
                            ) : (
                              <div className="small-muted">{recoveryPhone || "—"}</div>
                            )}
                          </div>
                          <button type="button" className="recovery-btn" onClick={() => setEditingRecovery(editingRecovery === "phone" ? null : "phone")}>
                            {editingRecovery === "phone" ? "Done" : "Edit"}
                          </button>
                        </div>
                        <button type="button" className="btn-purple" disabled={saving} onClick={handleSaveRecovery}>Save Recovery</button>
                      </div>
                      <div className="dark-card">
                        <h5 className="mb-1 text-white">Security Notifications</h5>
                        <div className="card-sub mb-4">Choose how you want to be notified about account activity.</div>
                        <div className="alert-box mb-3 flex justify-between items-center">
                          <div>
                            <div className="text-white">Email alerts for new logins</div>
                            <div className="small-muted">Get notified when a new device logs into your account.</div>
                          </div>
                          <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
                        </div>
                        <div className="alert-box mb-4 flex justify-between items-center">
                          <div>
                            <div className="text-white">SMS alerts for suspicious activity</div>
                            <div className="small-muted">Get notified about suspicious logins or security events.</div>
                          </div>
                          <input type="checkbox" checked={smsAlerts} onChange={(e) => setSmsAlerts(e.target.checked)} />
                        </div>
                        <button type="button" className="btn-purple" disabled={saving} onClick={handleSaveRecovery}>Save Notifications</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "billing" && (
                <div>
                  <h2>Billing</h2>
                  <p className="service-package-desc mb-6">Manage cards on file and billing contact.</p>
                  <div className="card-stack mb-8 relative h-[240px] max-w-[420px]">
                    {(cards.length ? cards : [{ id: "placeholder", card: { brand: data?.billing?.cardpoint?.cardtype || "Card", last4: data?.billing?.cardpoint?.last4 || "••••", exp_month: Number(data?.billing?.cardpoint?.expiry_month || 0), exp_year: Number(data?.billing?.cardpoint?.expiry_year || 0) } }]).slice(0, 3).map((card, index) => (
                      <button
                        key={card.id}
                        type="button"
                        className={`pay-card ${activeCardId === card.id || (!activeCardId && index === 0) ? "active" : ""}`}
                        onClick={() => setActiveCardId(card.id)}
                      >
                        <div className="card-header-custom relative z-10">
                          <small>{index === 0 ? "PRIMARY" : "CARD"}</small>
                          <div className="uppercase">{card.card?.brand || "Card"}</div>
                        </div>
                        <div className="relative z-10 mt-10 text-xl tracking-widest">•••• •••• •••• {card.card?.last4 || "••••"}</div>
                        <div className="relative z-10 mt-4 text-sm">
                          Exp {card.card?.exp_month || "—"}/{card.card?.exp_year || "—"}
                        </div>
                      </button>
                    ))}
                  </div>
                  {activeCardId && activeCardId !== "placeholder" && (
                    <div className="flex gap-3 mb-6">
                      <button type="button" className="btn-purple" onClick={() => setDefaultStripePaymentMethod(activeCardId).then(() => alert("Default card updated"))}>
                        Set Default
                      </button>
                      <button
                        type="button"
                        className="btn-outline-custom"
                        onClick={() => deleteStripePaymentMethod(activeCardId).then(() => setCards((prev) => prev.filter((c) => c.id !== activeCardId)))}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <div className="dark-card max-w-xl">
                    <div className="info-label">Billing Email</div>
                    <input className="form-control custom-input w-full mb-4" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
                    <div className="info-label">Billing Address</div>
                    <div className="info-value mb-4">{data?.billing?.billingaddress || "—"}</div>
                    <button type="button" className="btn-purple" disabled={saving} onClick={handleSaveBilling}>
                      Save Billing
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <PortalFooter />
    </div>
  );
}
