import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  MapPin, 
  CheckCircle, 
  XCircle,
  Building,
  Home,
  Camera,
  ExternalLink,
  User,
  Mail,
  Phone
} from "lucide-react";
import {
  getOrderDetails,
  getPortalOrderDetail,
  getPortalOrders,
  getUserHome,
  getUserIdFromStorage,
  type OrderDetailsResponse,
} from "@/lib/api";
import lightLogo from "@/pages/images/logos/light-logo.svg";

type LooseService = Record<string, unknown> & {
  service_details?: OrderDetailsResponse["orderservice"][number]["servicedetails"];
  servicedetails?: OrderDetailsResponse["orderservice"][number]["servicedetails"];
  tourdetails?: OrderDetailsResponse["orderservice"][number]["tourdetails"];
};

function mapServices(
  services: LooseService[] | undefined,
  tour?: OrderDetailsResponse["orderservice"][number]["tourdetails"]
): OrderDetailsResponse["orderservice"] {
  return (services || []).map((service) => ({
    ...(service as OrderDetailsResponse["orderservice"][number]),
    servicedetails:
      service.service_details ||
      service.servicedetails ||
      (service as OrderDetailsResponse["orderservice"][number]).servicedetails,
    tourdetails: service.tourdetails || tour,
  }));
}

function listItems(raw: unknown): Array<Record<string, unknown>> {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  if (Array.isArray(root)) return root as Array<Record<string, unknown>>;
  if (Array.isArray(root.data)) return root.data as Array<Record<string, unknown>>;
  if (root.data && typeof root.data === "object") {
    const inner = root.data as Record<string, unknown>;
    if (Array.isArray(inner.data)) return inner.data as Array<Record<string, unknown>>;
    if (Array.isArray(inner.items)) return inner.items as Array<Record<string, unknown>>;
  }
  if (Array.isArray(root.upcomingservice)) return root.upcomingservice as Array<Record<string, unknown>>;
  return [];
}

function detailsFromRow(row: Record<string, unknown>, fallbackId?: string): OrderDetailsResponse | null {
  if (!row) return null;
  const id = row.id ?? fallbackId;
  if (id == null) return null;
  const services = (row.services || row.orderservice || []) as LooseService[];
  return {
    status: true,
    order: {
      id,
      status: String(row.status || ""),
      total: String(row.total ?? "0"),
      subtotal: String(row.subtotal ?? row.total ?? "0"),
      gst: String(row.gst ?? "0"),
      pst: String(row.pst ?? "0"),
      datecreated: String(row.datecreated || row.created || ""),
      summary: String(row.summary || ""),
      notes: String(row.notes || ""),
      mediashell: String(row.mediashell || ""),
    } as OrderDetailsResponse["order"],
    orderservice: mapServices(
      Array.isArray(services) ? services : [],
      (row.tourdetails || row.tour) as OrderDetailsResponse["orderservice"][number]["tourdetails"]
    ),
  };
}

function normalizeOrderDetail(raw: unknown, fallbackId?: string): OrderDetailsResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  if (root.status === false) return null;
  const payload =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;
  const orderCandidate = (payload.order || (payload.id ? payload : null)) as
    | Record<string, unknown>
    | null;
  if (!orderCandidate) return null;
  const services = (payload.services ||
    payload.orderservice ||
    root.orderservice ||
    []) as LooseService[];
  return {
    status: true,
    order: {
      ...(orderCandidate as OrderDetailsResponse["order"]),
      id: (orderCandidate.id as string | number) ?? Number(fallbackId),
    },
    orderservice: mapServices(
      Array.isArray(services) ? services : [],
      (payload.tour || orderCandidate.tourdetails) as OrderDetailsResponse["orderservice"][number]["tourdetails"]
    ),
  };
}

export default function OrderDetails() {
  const [location, setLocation] = useLocation();
  const [orderData, setOrderData] = useState<OrderDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get order ID from URL params - read fresh from window.location.search
  const getOrderId = () => {
    try {
      // Try window.location.search first
      let search = window.location.search;
      
      // If search is empty, try parsing from the full href
      if (!search && window.location.href.includes("?")) {
        const url = new URL(window.location.href);
        search = url.search;
      }
      
      const urlParams = new URLSearchParams(search);
      const orderId = urlParams.get("id");
      
      // Debug logging
      if (!orderId) {
        console.log("No order ID found. URL:", window.location.href, "Search:", search);
      }
      
      return orderId;
    } catch (e) {
      console.error("Error parsing URL params:", e);
      return null;
    }
  };

  useEffect(() => {
    const loadOrderDetails = async () => {
      const orderId = getOrderId();

      if (!orderId) {
        setError("Order ID is required");
        setLoading(false);
        return;
      }

      const user_id = getUserIdFromStorage();
      if (!user_id) {
        setError("User not logged in");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setOrderData(null);

        let details: OrderDetailsResponse | null = null;
        let lastMsg = "";

        try {
          const portal = await getPortalOrderDetail(orderId);
          details = normalizeOrderDetail(portal, orderId);
          lastMsg = String(
            (portal as { msg?: string; message?: string }).msg ||
              (portal as { message?: string }).message ||
              ""
          );
        } catch (portalErr) {
          console.warn("Portal order detail failed", portalErr);
        }

        if (!details) {
          try {
            const legacy = await getOrderDetails({ id: orderId, user_id });
            details = normalizeOrderDetail(legacy, orderId);
            lastMsg =
              lastMsg ||
              String((legacy as { msg?: string; message?: string }).msg || (legacy as { message?: string }).message || "");
          } catch (legacyErr) {
            console.warn("Legacy order-details failed", legacyErr);
          }
        }

        if (!details) {
          try {
            const lists = await Promise.allSettled([
              getPortalOrders({ search: orderId, per_page: 50 }),
              getPortalOrders({ per_page: 50 }),
              getUserHome({
                user_id,
                device_id: "web",
                device_token: "web-token",
                device_type: "web",
              }),
            ]);
            for (const result of lists) {
              if (result.status !== "fulfilled") continue;
              const items = listItems(result.value);
              const found = items.find((item) => String(item.id) === String(orderId));
              if (found) {
                details = detailsFromRow(found, orderId);
                break;
              }
            }
          } catch (listErr) {
            console.warn("Orders list fallback failed", listErr);
          }
        }

        if (details?.order) {
          setOrderData(details);
        } else {
          setError(lastMsg || "Failed to load order details");
        }
      } catch (err) {
        console.error("Failed to load order details", err);
        setError("Failed to load order details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // Load immediately
    loadOrderDetails();

    // Set up a listener for URL changes
    const handleUrlChange = () => {
      loadOrderDetails();
    };

    // Listen for popstate (browser back/forward)
    window.addEventListener("popstate", handleUrlChange);
    
    // For programmatic navigation via setLocation, check periodically
    // This handles the case where wouter doesn't trigger re-render on query param changes
    let previousOrderId = getOrderId();
    const checkInterval = setInterval(() => {
      const currentOrderId = getOrderId();
      if (currentOrderId && currentOrderId !== previousOrderId) {
        previousOrderId = currentOrderId;
        loadOrderDetails();
      }
    }, 300);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      clearInterval(checkInterval);
    };
  }, [location]); // Re-run when location changes

  // Format address with proper commas and hyphens
  const formatAddress = (unit: unknown, address: string, city?: string, postal?: string) => {
    const parts: string[] = [];
    if (unit && String(unit).trim() !== "") {
      const unitStr = String(unit).trim();
      const addressMatch = address.match(/^(\d+)/);
      if (addressMatch) {
        parts.push(`${unitStr}-${address}`);
      } else {
        parts.push(`${unitStr} ${address}`);
      }
    } else {
      parts.push(address || "No Address");
    }
    if (city && city.trim() !== "") {
      parts.push(city.trim());
    }
    if (postal && postal.trim() !== "") {
      parts.push(postal.trim());
    }
    return parts.join(", ");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status?: string) => {
    const statusLower = (status || "").toLowerCase();
    if (statusLower === "paid" || statusLower === "complete") {
      return "bg-green-500/20 text-green-400 border-green-500/50";
    }
    if (statusLower === "spec" || statusLower === "new") {
      return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    }
    if (statusLower === "pending") {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    }
    return "bg-gray-500/20 text-gray-400 border-gray-500/50";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b388ff] mx-auto mb-4"></div>
          <p className="text-white/70">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData?.order) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-white/70 mb-6">{error || "Order not found"}</p>
          <Button
            onClick={() => setLocation("/orders")}
            className="bg-[#b388ff] hover:bg-[#b388ff]/80 text-white"
          >
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  const order = orderData.order;
  const orderservice = orderData.orderservice || [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="new-bg-4 w-full relative" style={{ height: "200px", minHeight: "200px" }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative h-full flex flex-col justify-end p-6 md:p-8 z-10">
          <div className="overlay-1">
            <div className="flex items-center gap-4 mb-2">
              <Button
                onClick={() => setLocation("/orders")}
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
            </div>
            <h2 className="text-white text-3xl md:text-4xl font-bold">Order Details</h2>
            <p className="text-white/80 text-lg mt-2">Order #{order.id}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="service-package bg-black">
        <div className="container mx-auto px-4 py-8">
          {/* Order Status Card */}
          <div className="bg-black/40 border border-white/20 rounded-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Order #{order.id}</h3>
                <p className="text-white/70">{order.summary || "No summary available"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-4 py-2 rounded-full border text-sm font-semibold ${getStatusColor(order.status)}`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Order Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Services Section */}
              <div className="bg-black/40 border border-white/20 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Services
                </h3>
                <div className="space-y-4">
                  {orderservice.length === 0 && (
                    <p className="text-white/70">No services found for this order.</p>
                  )}
                  {orderservice.map((service) => (
                    <div
                      key={service.id}
                      className="bg-black/60 border border-white/10 rounded-lg p-5 hover:border-[#b388ff]/50 transition-colors relative"
                    >
                      {/* View Media Button - Top Right Corner */}
                      {order.mediashell && (
                        <a
                          href={order.mediashell}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-[#b388ff] hover:bg-[#b388ff]/80 text-white rounded-lg transition-colors text-sm z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Media
                        </a>
                      )}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                        <div className="flex-1 pr-20">
                          <h4 className="text-lg font-semibold text-white mb-2">
                            {service.servicedetails?.frontendtitle || service.servicedetails?.name || "Service"}
                          </h4>
                          <p className="text-white/70 text-sm mb-2">
                            {service.description || "No description"}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className="px-3 py-1 bg-[#6f4a8e]/30 text-[#b388ff] rounded-full text-xs font-medium">
                              {service.servicedetails?.display_category || "Service"}
                            </span>
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                              Qty: {service.qty}
                            </span>
                            {service.status && (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                                {service.status}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">${service.total}</p>
                        </div>
                      </div>

                      {/* Tour Details */}
                      {service.tourdetails && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <h5 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                            <Home className="h-4 w-4" />
                            Property Details
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-white/60">Address</p>
                              <p className="text-white font-medium">
                                {formatAddress(
                                  service.tourdetails.unit,
                                  service.tourdetails.address,
                                  service.tourdetails.city,
                                  service.tourdetails.postal
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-white/60">MLS</p>
                              <p className="text-white font-medium">{service.tourdetails.mls || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-white/60">Size</p>
                              <p className="text-white font-medium">{service.tourdetails.sqft} sqft</p>
                            </div>
                            <div>
                              <p className="text-white/60">Beds/Baths</p>
                              <p className="text-white font-medium">
                                {service.tourdetails.beds} / {service.tourdetails.baths}
                              </p>
                            </div>
                            {service.tourdetails.numpics > 0 && (
                              <div>
                                <p className="text-white/60">Photos</p>
                                <p className="text-white font-medium flex items-center gap-1">
                                  <Camera className="h-3 w-3" />
                                  {service.tourdetails.numpics}
                                </p>
                              </div>
                            )}
                            {service.tourdetails.numpans > 0 && (
                              <div>
                                <p className="text-white/60">Panoramas</p>
                                <p className="text-white font-medium">{service.tourdetails.numpans}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="space-y-6">
              {/* Pricing Summary */}
              <div className="bg-black/40 border border-white/20 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-white/70">
                    <span>Pre-tax Total</span>
                    <span>${order.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-white/70 text-sm">
                    <span>GST</span>
                    <span>${order.gst}</span>
                  </div>
                  {parseFloat(String(order.pst || "0")) > 0 && (
                    <div className="flex justify-between text-white/70 text-sm">
                      <span>PST</span>
                      <span>${order.pst}</span>
                    </div>
                  )}
                  <div className="border-t border-white/20 pt-3 mt-3">
                    <div className="flex justify-between text-white text-lg font-bold">
                      <span>Total</span>
                      <span>${order.total}</span>
                    </div>
                  </div>
                  {parseFloat(String(order.balance || "0")) > 0 && (
                    <div className="flex justify-between text-red-400 mt-2">
                      <span>Balance Due</span>
                      <span>${order.balance}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Timeline */}
              <div className="bg-black/40 border border-white/20 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-white/60 text-sm">Created</p>
                    <p className="text-white font-medium">{formatDateTime(order.datecreated)}</p>
                  </div>
                  {order.datecompleted && (
                    <div>
                      <p className="text-white/60 text-sm">Completed</p>
                      <p className="text-white font-medium">{formatDateTime(order.datecompleted)}</p>
                    </div>
                  )}
                  {order.datebilled && (
                    <div>
                      <p className="text-white/60 text-sm">Billed</p>
                      <p className="text-white font-medium">{formatDateTime(order.datebilled)}</p>
                    </div>
                  )}
                  {order.datepaid && (
                    <div>
                      <p className="text-white/60 text-sm">Paid</p>
                      <p className="text-white font-medium flex items-center gap-2">
                        {formatDateTime(order.datepaid)}
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      </p>
                    </div>
                  )}
                  {order.transactionID && (
                    <div>
                      <p className="text-white/60 text-sm">Transaction ID</p>
                      <p className="text-white font-medium font-mono text-sm">{order.transactionID}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="bg-black/40 border border-white/20 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Notes</h3>
                  <p className="text-white/70">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
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
              <div className="status-dot w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="text-sm font-medium text-white">CHAT SUPPORT</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

