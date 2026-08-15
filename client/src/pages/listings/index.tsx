import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getPortalListings, listingImage, type PortalListing } from "@/lib/api";
import heroBg from "@/pages/images/new-bg-1.jpg";
import propertyImg from "@/pages/images/84429_2.webp";
import lightLogo from "@/pages/images/logos/light-logo.svg";

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

export default function Listings() {
  const [, setLocation] = useLocation();
  const [listings, setListings] = useState<PortalListing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadListings = async () => {
      try {
        setLoading(true);
        const data = await getPortalListings({ search: searchQuery });
        if (data.status && Array.isArray(data.data)) {
          setListings(data.data as PortalListing[]);
        } else {
          setListings([]);
        }
      } catch (error) {
        console.error("Failed to load listings", error);
      } finally {
        setLoading(false);
      }
    };
    loadListings();
  }, []);

  const filteredListings = listings?.filter((listing) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      listing.address?.toLowerCase().includes(query) ||
      listing.city?.toLowerCase().includes(query) ||
      String(listing.tourid).includes(query)
    );
  }) || [];

  const handleReset = () => {
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
     <div className="new-bg-4 w-full relative" style={{ 
      backgroundImage: `url(${heroBg})`,
      backgroundSize: "cover",
      backgroundPosition: "center center",
      height: "200px", 
      minHeight: "200px" 
      }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative h-full flex flex-col justify-end p-6 md:p-8 z-10">
          <div className="overlay-1">
            <h2 className="text-white text-3xl md:text-4xl font-bold">Listing</h2>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="service-package">
        <div className="container mx-auto mb-4 pt-6 px-4">
          <Input
            type="text"
            className="w-full text-white bg-black/40 border-white/20"
            placeholder="Search Listing...."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Listings Grid */}
        <div className="container mx-auto pb-5 px-4">
          {loading ? (
            <div className="text-center text-white py-12">
              <p>Loading listings...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center text-white py-12">
              <p>No listings found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((listing) => {
                // Get first image from multipleimages array, fallback to hardcoded image
                const imageSrc = listingImage(listing, propertyImg);

                return (
                  <div 
                    key={listing.tourid} 
                    className="property-card-wrapper cursor-pointer"
                    onClick={() => setLocation(`/listing-details?id=${listing.tourid}`)}
                  >
                    <div 
                      className="card property-card flex flex-col hover:opacity-90 transition-opacity" 
                      style={{ 
                        backgroundColor: '#040405', 
                        borderColor: '#1a1a1a',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
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
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer bg-black border-t border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row justify-between items-center">
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
