import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import lightLogo from "@/pages/images/logos/light-logo.svg";
import { Search, X, DollarSign, Calendar, Clock } from "lucide-react";
import { Link } from "wouter";
import { getMyOrders, type UpcomingService } from "@/lib/api";

interface Order {
  id: string;
  orderNumber: string;
  price: string;
  date: string;
  time: string;
  badge?: string;
}

export default function OrderHistory() {
  const [orderId, setOrderId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const user_id = localStorage.getItem("cotala_user_id");
        if (!user_id) {
          setError("User not logged in");
          return;
        }

        const data = await getMyOrders({ user_id });
        if (data.status && data.upcomingservice) {
          const formattedOrders: Order[] = data.upcomingservice.map((service: UpcomingService) => {
            // Use schedule_date if set, else derive from schedule_datetime or datecreated (e.g. "2025-10-15 15:43:22")
            let formattedDate = "";
            let formattedTime = service.schedule_time ?? "";

            if (service.schedule_date) {
              const dateParts = service.schedule_date.split("-");
              formattedDate = dateParts.length === 3
                ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
                : service.schedule_date;
            } else {
              const dateTimeStr = service.schedule_datetime ?? service.datecreated ?? "";
              if (dateTimeStr) {
                const [datePart, timePart] = dateTimeStr.split(" ");
                if (datePart) {
                  const dateParts = datePart.split("-");
                  formattedDate = dateParts.length === 3
                    ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
                    : datePart;
                }
                if (timePart) {
                  // "15:43:22" -> "15:43" or optionally "3:43 pm"
                  const [h, m] = timePart.split(":");
                  const hour = parseInt(h ?? "0", 10);
                  const ampm = hour >= 12 ? "pm" : "am";
                  const hour12 = hour % 12 || 12;
                  formattedTime = `${hour12}:${m ?? "00"} ${ampm}`;
                }
              }
            }

            return {
              id: String(service.id),
              orderNumber: String(service.id),
              price: service.total || "0.00",
              date: formattedDate,
              time: formattedTime,
              badge: service.status || undefined,
            };
          });
          setOrders(formattedOrders);
        } else {
          setOrders([]);
        }
      } catch (err) {
        console.error("Failed to load orders", err);
        setError("Failed to load orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const handleSearch = () => {
    // Implement search logic
    console.log("Searching with:", { orderId, selectedDate, selectedTime });
  };

  const handleClear = () => {
    setOrderId("");
    setSelectedDate("");
    setSelectedTime("");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="new-bg-4 w-full relative" style={{ height: "200px", minHeight: "200px" }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative h-full flex flex-col justify-end p-6 md:p-8 z-10">
          <div className="overlay-1">
            <h2 className="text-white text-3xl md:text-4xl font-bold">My Orders</h2>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="service-package bg-black">
        <div className="container mx-auto px-4 py-4">
          {/* Search/Filter Section */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            {/* Order ID */}
            <div>
              <Label className="form-label font-bold text-white block mb-2">Order ID</Label>
              <Input
                type="text"
                className="rounded-3xl bg-black/40 border-white/20 text-white"
                placeholder="1"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </div>
            {/* Date */}
            <div>
              <Label className="form-label font-bold text-white block mb-2">Date</Label>
              <div className="flex">
                <Input
                  type="text"
                  id="customDate"
                  className="rounded-l-3xl rounded-r-none bg-black/40 border-white/20 text-white"
                  placeholder="YYYY-MM-DD"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  readOnly
                />
                <span className="input-group-text bg-black/40 border border-l-0 border-white/20 text-white px-3 rounded-r-3xl flex items-center justify-center">
                  <i className="fa-solid fa-chevron-down text-sm"></i>
                </span>
              </div>
            </div>
            {/* Time */}
            <div>
              <Label className="form-label font-bold text-white block mb-2">Time</Label>
              <div className="flex">
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="rounded-l-3xl rounded-r-none bg-black/40 border-white/20 text-white">
                    <SelectValue placeholder="Choose..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">9:00am - 11:00am</SelectItem>
                    <SelectItem value="2">11:00am - 1:00pm</SelectItem>
                    <SelectItem value="3">2:00pm - 4:00pm</SelectItem>
                  </SelectContent>
                </Select>
                <span className="input-group-text bg-black/40 border border-l-0 border-white/20 text-white px-3 rounded-r-3xl flex items-center justify-center">
                  <i className="fa-solid fa-chevron-down text-sm"></i>
                </span>
              </div>
            </div>
            {/* Buttons */}
            <div className="flex gap-3 ml-auto">
              {/* Search Button */}
              <Button
                onClick={handleSearch}
                className="text-white rounded-3xl px-4"
                style={{ backgroundColor: "#6f4a8e" }}
              >
                <Search className="h-6 w-6" />
              </Button>
              {/* Clear Button */}
              <Button
                onClick={handleClear}
                className="rounded-3xl px-4"
                style={{ backgroundColor: "#ffe3dc", color: "#d9534f" }}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="container mx-auto px-4 pb-8">
          {loading && (
            <div className="text-center text-white py-8">Loading orders...</div>
          )}
          {error && (
            <div className="text-center text-red-400 py-8">{error}</div>
          )}
          {!loading && !error && orders.length === 0 && (
            <div className="text-center text-white/70 py-8">No orders found.</div>
          )}
          {!loading && !error && orders.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map((order) => (
              <div key={order.id} className="order-card rounded-lg p-6 relative" style={{ backgroundColor: "#1b1b1b", border: "1px solid #333333" }}>
                {order.badge && (
                  <span className="verified-badge-1 absolute top-4 right-4 bg-[#b388ff] text-black text-xs font-bold px-3 py-1 rounded-full">
                    {order.badge}
                  </span>
                )}
                <h5 className="card-title text-white text-xl font-bold mb-6">Order #{order.orderNumber}</h5>

                {/* Price */}
                <p className="mb-3 flex items-start" style={{ marginTop: "-4px" }}>
                  <span
                    className="p-2 rounded icon-bg text-white mr-2 flex items-center justify-center"
                    style={{ width: "32px", height: "32px", backgroundColor: "#0f1110" }}
                  >
                    <DollarSign className="h-5 w-5" />
                  </span>
                  <span className="text-white">
                    Price
                    <br />
                    ${order.price}
                  </span>
                </p>

                {/* Date */}
                <p className="mb-3 flex items-start" style={{ marginTop: "8px" }}>
                  <span
                    className="p-2 rounded icon-bg text-white mr-2 flex items-center justify-center"
                    style={{ width: "32px", height: "32px", backgroundColor: "#0f1110" }}
                  >
                    <Calendar className="h-5 w-5" />
                  </span>
                  <span className="text-white">
                    Date
                    <br />
                    {order.date}
                  </span>
                </p>

                {/* Time */}
                <p className="mb-3 flex items-start" style={{ marginTop: "8px" }}>
                  <span
                    className="p-2 rounded icon-bg text-white mr-2 flex items-center justify-center"
                    style={{ width: "32px", height: "32px", backgroundColor: "#0f1110" }}
                  >
                    <Clock className="h-5 w-5" />
                  </span>
                  <span className="text-white">
                    Time
                    <br />
                    {order.time}
                  </span>
                </p>

                <Link href={`/order-details?id=${order.id}`}>
                  <Button className="w-full mt-3 bg-[#b388ff] hover:bg-[#b388ff]/80" style={{ color: "#000000" }}>
                    View Details
                  </Button>
                </Link>
              </div>
              ))}
            </div>
          )}
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
