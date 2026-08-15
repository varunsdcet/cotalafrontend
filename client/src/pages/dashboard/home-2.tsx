import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowRight, Camera, Brush, Calendar } from "lucide-react";
import bgWebp from "@/pages/images/bg1r.webp";
import royalLogo from "@/pages/images/royallepagelogo.png";
import propertyImg from "@/pages/images/84429_2.webp";
import lightLogo from "@/pages/images/logos/light-logo.svg";
import {
  COTALA_MY_LISTINGS_URL2_KEY,
  getPortalDashboard,
  listingImage,
  type PortalListing,
} from "@/lib/api";
import { startFeatureSheetForListing } from "@/lib/start-feature-sheet";

// Knowledge Base cards data
const knowledgeBaseCards = [
  {
    id: 1,
    title: "Set Up Canada Post",
    description:
      "Learn how to create Neighbourhood Admail and send out to a specific target area.",
  },
  {
    id: 2,
    title: "Farming Mailouts",
    description:
      "Browse a variety of printed options for repeat marketing through Canada Post.",
  },
  {
    id: 3,
    title: "Sign Installation",
    description:
      "Request a sign installation at a new listing or modify a current installation.",
  },
  {
    id: 4,
    title: "Social Media Tips",
    description:
      "Best practices for promoting your listings and personal brand.",
  },
  {
    id: 5,
    title: "Print Ready Files",
    description: "How to ensure your own print artwork is print ready.",
  },
  {
    id: 6,
    title: "Listing Prep",
    description: "Checklist to help get your listing ready for showings.",
  },
];

export default function Home2() {
  const [, setLocation] = useLocation();
  const [userName, setUserName] = useState("");
  const [userSalutation, setUserSalutation] = useState("");
  const [listings, setListings] = useState<PortalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [dynamicLogo, setDynamicLogo] = useState<string | null>(null);
  const [homeSearch, setHomeSearch] = useState("");
  const [startingSheetTourId, setStartingSheetTourId] = useState<string | number | null>(null);
  
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good Morning";
    } else if (hour < 17) {
      return "Good Afternoon";
    } else if (hour < 21) {
      return "Good Evening";
    } else {
      return "Good Night";
    }
  };

  // Properly format name with title case (handles "Voight" correctly)
  const formatName = (name: string) => {
    if (!name) return "";
    // First, add space before capital letters if name is camelCase (e.g., "GaryVoight" -> "Gary Voight")
    const spacedName = name.replace(/([a-z])([A-Z])/g, '$1 $2');
    // Split by spaces and capitalize each word properly
    return spacedName
      .split(/\s+/)
      .map(word => {
        if (!word) return "";
        // Capitalize first letter, keep rest as-is (handles "Voight", "McDonald", etc.)
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  };

  // Format address with proper commas and hyphens (always include city)
  const formatAddress = (unit: unknown, address: string, city?: string) => {
    const parts: string[] = [];
    
    // Add unit with hyphen if it exists
    if (unit && String(unit).trim() !== "") {
      const unitStr = String(unit).trim();
      // Check if address starts with a number, if so add hyphen
      const addressStr = address || "";
      const addressMatch = addressStr.match(/^(\d+)/);
      if (addressMatch) {
        parts.push(`${unitStr}-${addressStr}`);
      } else {
        parts.push(`${unitStr} ${addressStr}`);
      }
    } else {
      parts.push(address || "No Address");
    }
    
    // Always add city with comma if it exists
    if (city && city.trim() !== "") {
      parts.push(city.trim());
    }
    
    return parts.join(", ");
  };

  useEffect(() => {
    // Get user name from localStorage
    const userData = localStorage.getItem("cotala_user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        // Try to get name, username, or email
        setUserName(user.name || user.username || user.email || "");
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const data = await getPortalDashboard();
        const payload = (data.data || {}) as {
          greeting_name?: string;
          recent_listings?: PortalListing[];
          performing_agents?: Array<{ image_url?: string }>;
        };
        if (payload.greeting_name) {
          setUserName(payload.greeting_name);
        }
        setListings(Array.isArray(payload.recent_listings) ? payload.recent_listings : []);
        const logo = payload.performing_agents?.[0]?.image_url || "";
        if (logo) {
          setDynamicLogo(logo);
          try {
            window.localStorage.setItem(COTALA_MY_LISTINGS_URL2_KEY, logo);
          } catch {
            /* ignore quota */
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const handleHomeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = homeSearch.trim().toLowerCase();
    if (!q) return;
    if (q.includes("book") || q.includes("appointment") || q.includes("order")) {
      setLocation("/new-appointment");
      return;
    }
    if (q.includes("design")) {
      setLocation("/design-job");
      return;
    }
    if (q.includes("account") || q.includes("profile")) {
      setLocation("/profile");
      return;
    }
    setLocation(`/listings?search=${encodeURIComponent(homeSearch.trim())}`);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {startingSheetTourId != null && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/60">
          <svg
            className="animate-spin h-10 w-10 text-[#b082f2] mb-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-white text-base font-semibold">please wait</p>
        </div>
      )}
      {/* Hero Section */}
      <div
        className="relative w-full hero-section"
        style={{
          backgroundImage: `url(${bgWebp})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          height: "45vh",
          minHeight: "350px",
          overflow: "hidden",
        }}
      >
        <div className="w-full h-full">
          <div className="container mx-auto px-4 h-full">
            <div className="flex items-center flex-nowrap h-full pt-6 md:pt-8 lg:pt-10">
              {/* LEFT CONTENT - Full width on mobile, 3/5 on desktop */}
              <div className="w-full lg:w-3/5 text-white flex-shrink-0" style={{ paddingLeft: 0 }}>
                <h1 className="text-[32px] md:text-[40px] lg:text-[40px] font-semibold leading-tight mb-3 text-left m-0 p-0">
  {getGreeting()}
  <br />
  {userSalutation ? userSalutation : userName ? formatName(userName) : ""}
</h1>


              </div>

              {/* RIGHT GLASS LOGO - Moved left and width increased */}
              <div className="hidden lg:flex lg:w-2/5 justify-start items-center pl-8 flex-shrink-0 ml-[-40px]">
  <div className="glass-logo w-full max-w-[55vw] h-[260px] flex items-center justify-center">
  <img
    src={dynamicLogo ?? royalLogo}
    alt="Royal LePage Broker Logo"
    className="w-full h-full object-contain opacity-50"
    style={{ filter: "blur(0.2px)" }}
  />
</div>
</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="service-package bg-black">
        <div className="container mx-auto px-4 pt-6">
          <h1 className="hero-title">What would you like to do today?</h1>
          <form className="search-box" onSubmit={handleHomeSearch}>
            <input
              type="text"
              placeholder="I want to book an appointment..."
              value={homeSearch}
              onChange={(e) => setHomeSearch(e.target.value)}
            />
            <button type="submit" className="search-btn" aria-label="Search">
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
        {/* Listings Section */}
        {loading ? (
          <div className="text-center text-white py-12">
            <p>Loading listings...</p>
          </div>
        ) : !listings || listings.length === 0 ? (
          /* No Listings Section - Same UI when empty */
          <div className="container mx-auto px-4 pt-6 pb-6">
            <div className="text-left">
              <p className="text-white text-xl mb-4">
                You have no pending or active listings.
              </p>
              <Link href="/listings">
                <button className="btn btn-outline-light manage-btn">
                  CREATE LISTING
                </button>
              </Link>
            </div>
          </div>
        ) : (
          /* Listings Grid - Show when data exists */
          <div className="container mx-auto px-4 py-6">
            {/* Active MLS Listing Section */}
            {listings && listings.length > 0 && (
              <div className="text-left pb-4 mb-4">
                <span className="text-uppercase text-white active-list fw-bolder text-sm font-semibold block mb-2">
                  Active MLS Listing
                </span>
                <p className="text-white fs-5 mb-2 text-left">
                  {formatAddress(listings[0]?.unit, listings[0]?.address || "Address not available", listings[0]?.city)}
                </p>
                <div className="text-left">
                  <button className="btn btn-outline-light text-uppercase manage-btn">
                    Manage
                  </button>
                </div>
              </div>
            )}

            {/* Recent Listing Section */}
            <div className="flex justify-start items-center gap-2 mb-4 text-left">
              <h2 className="mb-0 text-white text-2xl font-bold">Recent Listing</h2>
              <Link href="/listings" className="text-light text-decoration-none hover:opacity-80 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="icon icon-tabler icons-tabler-outline icon-tabler-external-link"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
                  <path d="M11 13l9 -9" />
                  <path d="M15 4h5v5" />
                </svg>
              </Link>
            </div>

            {/* Listings Grid - Limited to 9 items */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings && listings.slice(0, 9).map((listing) => {
                // Get first image from multipleimages array, fallback to hardcoded image
                const imageSrc = listingImage(listing, propertyImg);

                return (
                  <div
                    key={listing.tourid}
                    className="card property-card flex flex-col cursor-pointer"
                    style={{ backgroundColor: '#040405' }}
                    onClick={() => setLocation(`/listing-details?id=${listing.tourid}`)}
                  >
                    <div className="img-wrapper relative">
                      {startingSheetTourId === listing.tourid && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 text-white">
                          <svg
                            className="animate-spin h-8 w-8 text-[#b082f2] mb-2"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span className="text-sm font-semibold">please wait</span>
                        </div>
                      )}
                      <img
                        src={imageSrc}
                        className="property-img"
                        alt="Property Image"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== propertyImg) {
                            target.src = propertyImg;
                          }
                        }}
                      />
                      <div className="hover-overlay" onClick={(e) => e.stopPropagation()}>
                        <div className="icon-group">
                          <Camera
                            className="w-4 h-4 cursor-pointer"
                            onClick={() => setLocation(`/listing-details?id=${listing.tourid}`)}
                          />
                          <Brush
                            className={`w-4 h-4 cursor-pointer ${startingSheetTourId === listing.tourid ? "opacity-50" : ""}`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (startingSheetTourId) return;
                              try {
                                setStartingSheetTourId(listing.tourid);
                                const href = await startFeatureSheetForListing(listing);
                                setLocation(href);
                              } catch (err) {
                                console.error("Failed to start feature sheet", err);
                                setLocation(`/feature-listing?id=${listing.tourid}`);
                              } finally {
                                setStartingSheetTourId(null);
                              }
                            }}
                          />
                          <Calendar
                            className="w-4 h-4 cursor-pointer"
                            onClick={() => setLocation("/new-appointment")}
                          />
                        </div>
                      </div>
                    </div>
                  <div className="card-body flex flex-col flex-grow px-3 py-3" style={{ backgroundColor: '#040405' }}>
                    <div className="flex justify-between items-center">
                      <h5 className="text-white mb-0 text-lg font-semibold">
                        {formatAddress(listing.unit, listing.address || "No Address", listing.city)}
                      </h5>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      {listing.mls && String(listing.mls).trim() !== "" ? (
                        <p className="text-white/50 mb-0 text-sm">
                          MLS #{String(listing.mls)}
                        </p>
                      ) : null}
                      <span className="property-status">
                        {listing.status ? String(listing.status).charAt(0).toUpperCase() + String(listing.status).slice(1) : "Active"}
                      </span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            
            {/* View All Listings Link - Show if there are more than 9 listings */}
            {listings && listings.length > 9 && (
              <div className="text-center mt-6">
                <Link href="/listings">
                  <button className="btn btn-outline-light text-uppercase manage-btn px-6 py-3">
                    View All Listings ({listings.length})
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Knowledge Base Section */}
        <section className="py-12 text-light px-4">
          <div className="container mx-auto">
            <div className="flex justify-start items-center mb-6 gap-2">
              <h2 className="mb-0 text-2xl md:text-3xl font-bold text-white">
                Knowledge Base
              </h2>
              <a
                href="#"
                className="text-light text-decoration-none hover:opacity-80 transition-opacity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="icon icon-tabler icons-tabler-outline icon-tabler-external-link"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
                  <path d="M11 13l9 -9" />
                  <path d="M15 4h5v5" />
                </svg>
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {knowledgeBaseCards.map((card) => (
                <div
                  key={card.id}
                  className="kb-card p-6 h-full relative group cursor-pointer hover:bg-white/5 transition-colors rounded-lg border border-white/10"
                >
                  <h5 className="mb-2 text-white text-lg font-semibold">
                    {card.title}
                  </h5>
                  <p className="mb-0 text-white/50 text-sm">
                    {card.description}
                  </p>
                  <span className="arrow absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="icon icon-tabler icons-tabler-outline icon-tabler-chevron-right"
                    >
                      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                      <path d="M9 6l6 6l-6 6" />
                    </svg>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="footer bg-black border-t border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            {/* Left logo and copyright */}
            <div className="text-left mb-3 md:mb-0">
              <img
                src={lightLogo}
                width="100"
                alt="Logo"
                className="mb-2"
              />
              <div className="copyright text-sm text-white/50 text-left">
                © 2025 Cotala Cross Media Inc. All Rights Reserved.
              </div>
            </div>

            {/* Right chat support */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("cotala-open-chat"))}
              className="chat-support flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label="Open chat support"
            >
              <div className="status-dot w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="text-sm font-medium">CHAT SUPPORT</div>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
