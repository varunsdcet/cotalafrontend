import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { getPortalOrders } from "@/lib/api";
import PortalFooter from "@/components/portal/PortalFooter";
import fallbackThumb from "@/pages/images/img-4.jpeg";
import floorplanThumb from "@/pages/images/img-5.png";

type OrderService = {
  id?: number | string;
  status?: string;
  ui_status?: string;
  description?: string;
  customer_preferred?: string;
  schedule_date?: string;
  service_details?: { name?: string; frontendtitle?: string; category?: string; productimage?: string };
};

type PrintJob = {
  id?: number | string;
  status?: string;
  needs_approval?: boolean;
  description?: string;
  product_details?: { name?: string };
};

type PortalOrder = {
  id: number | string;
  datecreated?: string;
  total?: string | number;
  status?: string;
  services?: OrderService[];
  print_jobs?: PrintJob[];
  tourdetails?: { address?: string; city?: string; unit?: string };
};

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function serviceTitle(service: OrderService) {
  return service.service_details?.frontendtitle || service.service_details?.name || "Service";
}

function serviceThumb(service: OrderService) {
  const name = serviceTitle(service).toLowerCase();
  if (name.includes("floor")) return floorplanThumb;
  return service.service_details?.productimage || fallbackThumb;
}

function isCompletedStatus(status?: string) {
  const s = (status || "").toLowerCase();
  return ["complete", "completed", "closed", "shipped", "approved"].includes(s);
}

export default function OrderHistory() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "completed" | "progress">("all");
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getPortalOrders({ search: query, per_page: 50 });
        if (data.status && Array.isArray(data.data)) {
          setOrders(data.data as PortalOrder[]);
        } else {
          setOrders([]);
        }
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [query]);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const completed = isCompletedStatus(order.status);
      if (tab === "completed") return completed;
      if (tab === "progress") return !completed;
      return true;
    });
  }, [orders, tab]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="hero-section orders-hero">
        <div className="container mx-auto px-4">
          <h1 className="hero-title">My Orders</h1>
          <p className="hero-desc">Search all orders...</p>
          <form
            className="search-box"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search.trim());
            }}
          >
            <input
              type="text"
              placeholder="Search by address, MLS number etc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="search-btn" aria-label="Search orders">
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      <div className="service-package">
        <div className="container mx-auto px-4 my-3">
          <div className="tabs">
            <div className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>All</div>
            <div className={tab === "completed" ? "active" : ""} onClick={() => setTab("completed")}>Completed</div>
            <div className={tab === "progress" ? "active" : ""} onClick={() => setTab("progress")}>In Progress</div>
          </div>

          {loading && <div className="text-white/70 py-8">Loading orders...</div>}
          {error && <div className="text-red-400 py-8">{error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-white/70 py-8">No orders found.</div>
          )}

          {filtered.map((order) => {
            const completed = isCompletedStatus(order.status);
            const address = [order.tourdetails?.unit, order.tourdetails?.address, order.tourdetails?.city]
              .filter(Boolean)
              .join(", ");
            return (
              <div key={String(order.id)} className="order-card-1" data-status={completed ? "completed" : "progress"}>
                <div className="order-top">
                  <div className="order-left">
                    <div>
                      <div className="label">ORDER PLACED</div>
                      <div className="label">{formatDate(order.datecreated)}</div>
                    </div>
                    <div>
                      <div className="label">TOTAL</div>
                      <div className="label">${Number(order.total || 0).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="order-right text-end">
                    <div className="label">ORDER #{order.id}</div>
                    <Link href={`/order-details?id=${order.id}`} className="link">View invoice</Link>
                  </div>
                </div>
                <div className="order-body">
                  <div className="flex justify-between items-center mb-3">
                    <div className="section-title">{completed ? "Completed" : "In Progress"}</div>
                    <button type="button" className="btn-main" onClick={() => window.dispatchEvent(new CustomEvent("cotala-open-chat"))}>
                      REPORT A PROBLEM
                    </button>
                  </div>

                  {(order.services || []).map((service) => {
                    const done = isCompletedStatus(service.status || service.ui_status);
                    const title = serviceTitle(service);
                    return (
                      <div className="order-item" key={String(service.id || title)}>
                        <div className="thumb-wrapper">
                          <img src={serviceThumb(service)} alt={title} />
                          {done ? (
                            <span className="status-pill on-tick">
                              <svg width="20" height="20" viewBox="0 0 512 512">
                                <circle cx="256" cy="256" r="256" fill="#4BAE4F" />
                                <path fill="#fff" d="M379.8 169.7c6.2 6.2 6.2 16.4 0 22.6l-150 150c-6.2 6.2-16.4 6.2-22.6 0l-75-75c-6.2-6.2-6.2-16.4 0-22.6s16.4-6.2 22.6 0l63.7 63.7 138.7-138.7c6.2-6.3 16.4-6.3 22.6 0z" />
                              </svg>
                            </span>
                          ) : (
                            <span className="status-pill on-image">{service.ui_status || service.status || "In Progress"}</span>
                          )}
                        </div>
                        <div className="item-content">
                          <div className="item-title">{title}</div>
                          <div className="item-sub">{service.description || address}</div>
                          {service.customer_preferred ? (
                            <div className="item-sub purple-text">
                              Scheduled Appointment<br />
                              {service.customer_preferred}
                            </div>
                          ) : null}
                          {title.toLowerCase().includes("floor") && (
                            <Link href={`/listing-details?id=${order.tourdetails ? (order.tourdetails as { tourid?: string }).tourid || "" : ""}`}>
                              <button type="button" className="btn-outline">VIEW FLOORPLAN</button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {(order.print_jobs || []).map((job) => (
                    <div className="order-item" key={`print-${job.id}`}>
                      <div className="thumb-wrapper">
                        <img src={fallbackThumb} alt={job.product_details?.name || "Print job"} />
                        <span className={`status-pill on-image ${job.needs_approval ? "pending" : ""}`}>
                          {job.needs_approval ? "Pending" : job.status || "Print"}
                        </span>
                      </div>
                      <div className="item-content">
                        <div className="item-title">{job.product_details?.name || "Print Product"}</div>
                        <div className="item-sub">{job.description || address}</div>
                        {job.needs_approval ? (
                          <Link href={`/proof-review?id=${job.id}`}>
                            <button type="button" className="btn-outline-pending">REVIEW PROOF</button>
                          </Link>
                        ) : completed ? (
                          <button type="button" className="btn-outline-1">BUY IT AGAIN</button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <PortalFooter />
    </div>
  );
}
