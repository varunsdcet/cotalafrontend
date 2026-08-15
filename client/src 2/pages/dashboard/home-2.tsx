import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import bgWebp from "@/pages/images/bg1r.webp";
import royalLogo from "@/pages/images/royallepagelogo.png";
import realEstateImg from "@/pages/images/standard-real-estate-photography-4-1024x683.jpg";
import propertyImg from "@/pages/images/84429_2.webp";
import lightLogo from "@/pages/images/logos/light-logo.svg";
import {
  COTALA_MY_LISTINGS_URL2_KEY,
  getMyListings,
  type MyListingsResponse,
} from "@/lib/api";

// Carousel slides data
const carouselSlides = [
  {
    id: 1,
    category: "What's New",
    title: "Holiday Products",
    description:
      "Choose from a large selection of branded holiday greeting cards and printed wall calendars, ensuring you stay top of mind in 2026.",
    buttonText: "BROWSE DESIGNS",
    image: realEstateImg,
  },
  {
    id: 2,
    category: "Featured",
    title: "New Year Collection",
    description:
      "Ring in the new year with fresh, modern designs that keep your brand front and center.",
    buttonText: "EXPLORE NOW",
    image: realEstateImg,
  },
  {
    id: 3,
    category: "Limited Time",
    title: "Thank You Cards",
    description:
      "Show appreciation to clients with premium thank-you cards in seasonal styles.",
    buttonText: "VIEW CARDS",
    image: realEstateImg,
  },
];

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [userName, setUserName] = useState("");
  const [userSalutation, setUserSalutation] = useState("");
  const [listings, setListings] = useState<MyListingsResponse["tours"]>([]);
  const [loading, setLoading] = useState(true);
  const [dynamicLogo, setDynamicLogo] = useState<string | null>(null);
  
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

    // Load user profile to get salutation and proper name
    const loadProfile = async () => {
      try {
        const { getProfile } = await import("@/lib/api");
        const profileData = await getProfile();
        if (profileData.status && profileData.user_profile) {
          const profile = profileData.user_profile;
          if (profile.name) {
            setUserName(profile.name);
          }
          if (profile.salutation) {
            setUserSalutation(profile.salutation);
          }
        }
      } catch (error) {
        console.error("Failed to load profile", error);
      }
    };

    // Load listings
    const loadListings = async () => {
      try {
        setLoading(true);
        const data = await getMyListings();
        if (data.status && data.tours) {
          setListings(data.tours);
          // Dashboard: broker logo is always `url2` from my-listings (not imagepath / sheet-bg rules).
          const url2 = data.url2 != null ? String(data.url2).trim() : "";
          if (url2) {
            setDynamicLogo(url2);
            try {
              window.localStorage.setItem(COTALA_MY_LISTINGS_URL2_KEY, url2);
            } catch {
              /* ignore quota */
            }
          } else {
            try {
              window.localStorage.removeItem(COTALA_MY_LISTINGS_URL2_KEY);
            } catch {
              /* ignore */
            }
          }
        }
      } catch (error) {
        console.error("Failed to load listings", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
    loadListings();

    // Auto-advance carousel
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  return (
    <div className="min-h-screen bg-black text-white">
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
                let imageSrc = propertyImg; // Default fallback
                
                // Type-safe access to multipleimages
                const multipleImages = listing.multipleimages;
                if (multipleImages && Array.isArray(multipleImages) && multipleImages.length > 0) {
                  const firstImage = multipleImages[0];
                  // Check if it's a valid URL string
                  if (firstImage && typeof firstImage === 'string' && firstImage.trim() !== '') {
                    imageSrc = firstImage.trim();
                  }
                }

                return (
                  <div
                    key={listing.tourid}
                    className="card property-card flex flex-col cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#040405' }}
                    onClick={() => {
                    

                      setLocation(`/listing-details?id=${listing.tourid}`)
                    }}
                  >
                    <img
                      src={imageSrc}
                      className="property-img"
                      alt="Property Image"
                      onError={(e) => {
                        // If image fails to load, fallback to hardcoded image
                        const target = e.target as HTMLImageElement;
                        if (target.src !== propertyImg) {
                          target.src = propertyImg;
                        }
                      }}
                    />
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

        {/* Carousel Section */}
        <div className="container mx-auto my-6 px-4">
          <div className="relative overflow-hidden rounded-lg" style={{ height: "420px" }}>
            {/* Carousel */}
            <div className="relative h-full">
              <div
                className="flex transition-transform duration-500 ease-in-out h-full"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`,
                }}
              >
                {carouselSlides.map((slide) => (
                  <div
                    key={slide.id}
                    className="w-full flex-shrink-0 h-full"
                  >
                    <div className="h-full flex flex-col md:flex-row">
                      {/* Left Side - Purple Background */}
                      <div className="w-full md:w-1/2 slider-left bg-[#4b3a5c] text-white p-12 md:p-16 flex flex-col justify-center items-center text-center min-h-[300px] md:min-h-full">
                        <h6 className="text-xl opacity-80 pb-8 font-light text-white">
                          {slide.category}
                        </h6>
                        <h2 className="text-3xl md:text-4xl mb-4 font-light">
                          {slide.title}
                        </h2>
                        <p className="mb-6 text-base font-light max-w-md">
                          {slide.description}
                        </p>
                        <button className="btn btn-light px-6 py-2 manage-btn rounded-full">
                          {slide.buttonText}
                        </button>
                      </div>

                      {/* Right Side - Image */}
                      <div className="w-full md:w-1/2 right-image-wrap h-[300px] md:h-full">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Carousel Indicators */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
              {carouselSlides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToSlide(index)}
                  className={`h-1 rounded-full transition-all ${
                    index === currentSlide
                      ? "w-8 bg-white"
                      : "w-6 bg-white/50"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Navigation Arrows (optional - commented out in HTML) */}
            {/* Uncomment if needed
            <button
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full"
              onClick={prevSlide}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 5l-6 7l6 7" />
              </svg>
            </button>
            <button
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full"
              onClick={nextSlide}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 5l6 7l-6 7" />
              </svg>
            </button>
            */}
          </div>
        </div>

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
