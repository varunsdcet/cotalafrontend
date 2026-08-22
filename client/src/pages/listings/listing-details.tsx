import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Check, Plus, ChevronRight } from "lucide-react";
import { getListingDetails, getPortalListingDetail, getPortalListingStats, getTourStats, type ListingDetailsResponse, type TourStatsResponse } from "@/lib/api";
import lightLogo from "@/pages/images/logos/light-logo.svg";
/** Same hero background as `/listings` when the tour has no `multipleimages`. */
import listingsHeroBg from "@/pages/images/new-bg-1.jpg";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
 Chart as ChartJS,
 CategoryScale,
 LinearScale,
 BarElement,
 Title,
 Tooltip,
 Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
 CategoryScale,
 LinearScale,
 BarElement,
 Title,
 Tooltip,
 Legend
);

// Shimmer component for image loading
const ImageWithShimmer = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative w-full">
      {!imageLoaded && !imageError && (
        <div className={`absolute inset-0 shimmer ${className || ''}`} style={{ minHeight: '300px' }}></div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className || ''} ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageError(true);
          setImageLoaded(true);
        }}
      />
    </div>
  );
};

export default function ListingDetails() {
  const [, setLocation] = useLocation();
  const [listingData, setListingData] = useState<ListingDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("photos");
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
 const [statsData, setStatsData] = useState<TourStatsResponse | null>(null);
 const [statsLoading, setStatsLoading] = useState(false);
 const [statsTab, setStatsTab] = useState("weekly");
 const [emailInput, setEmailInput] = useState("");
 const [sendCopy, setSendCopy] = useState(false);
 const chartRef = useRef<ChartJS<"bar">>(null);
 const [pendingProofId, setPendingProofId] = useState<string | number | null>(null);
 const [printJobs, setPrintJobs] = useState<Array<{ id?: string | number; status?: string; needs_approval?: boolean; product_details?: { name?: string }; datecreated?: string; qty?: string | number; total?: string | number }>>([]);

  // Get tourid and user_id from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const tourId = urlParams.get("id");
  const user_id = localStorage.getItem("cotala_user_id");

  const handleFeatureListingClick = () => {
    if (!tourId) {
      alert("Missing tour information.");
      return;
    }
    setLocation(`/feature-listing?id=${tourId}`);
  };

  useEffect(() => {
    const loadListingDetails = async () => {
      if (!tourId) {
        setError("Listing ID is required");
        setLoading(false);
        return;
      }

      if (!user_id) {
        setError("User not logged in");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let data: ListingDetailsResponse | null = null;
        try {
          const portal = await getPortalListingDetail(tourId);
          if (portal.status && portal.data) {
            const payload = portal.data as {
              tour?: ListingDetailsResponse["tour"] & { cover_image?: string; multipleimages?: string[] };
              agent?: ListingDetailsResponse["agent"];
              print_jobs?: Array<{ id?: string | number; needs_approval?: boolean; status?: string; product_details?: { name?: string }; datecreated?: string; qty?: string | number; total?: string | number }>;
              proofs?: Array<{ print_job_id?: string | number }>;
            };
            const tour = payload.tour;
            if (tour) {
              const photos = tour.multipleimages?.length
                ? tour.multipleimages
                : tour.cover_image
                  ? [tour.cover_image]
                  : [];
              data = {
                status: true,
                tour: { ...tour, multipleimages: photos },
                agent: payload.agent,
              } as ListingDetailsResponse;
            }
            const jobs = payload.print_jobs || [];
            setPrintJobs(jobs);
            const pending = jobs.find((job) => job.needs_approval) || jobs.find((job) => !job.status || String(job.status).toLowerCase().includes("proof"));
            setPendingProofId(pending?.id || payload.proofs?.[0]?.print_job_id || null);
          }
        } catch (portalErr) {
          console.error("Failed to load portal listing detail", portalErr);
        }

        if (!data) {
          data = await getListingDetails({ tourid: tourId, user_id });
        }

        if (data.status && data.tour) {
          setListingData(data);
          const photos = data.tour.multipleimages || [];
          const fromPhotos =
            photos.length > 0 && typeof photos[0] === "string" && photos[0].trim() !== ""
              ? photos[0].trim()
              : "";
          if (!fromPhotos) {
            setHeroImageLoaded(true);
          }
        } else {
          setError("Failed to load listing details");
        }
      } catch (err) {
        console.error("Failed to load listing details", err);
        setError("Failed to load listing details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadListingDetails();
  }, [tourId, user_id]);

 // Load statistics data
 useEffect(() => {
 const loadStats = async () => {
 if (!tourId || !user_id) return;

 try {
        setStatsLoading(true);
        try {
          const portalStats = await getPortalListingStats(tourId);
          if (portalStats.status && portalStats.data) {
            setStatsData({ status: true, ...(portalStats.data as object) } as TourStatsResponse);
            return;
          }
        } catch (portalErr) {
          console.error("Failed to load portal listing stats", portalErr);
        }
        const data = await getTourStats({ tourid: tourId, user_id });
        if (data.status) {
          setStatsData(data);
        }
 } catch (err) {
 console.error("Failed to load statistics", err);
 } finally {
 setStatsLoading(false);
 }
 };

 loadStats();
  }, [tourId, user_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b388ff] mx-auto mb-4"></div>
          <p className="text-white/70">Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (error || !listingData || !listingData.tour) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-white/70 mb-6">{error || "Listing not found"}</p>
          <Button
            onClick={() => setLocation("/listings")}
            className="bg-[#b388ff] hover:bg-[#b388ff]/80 text-white"
          >
            Back to Listings
          </Button>
        </div>
      </div>
    );
  }

  const tour = listingData.tour;
  const unit = tour.unit ? String(tour.unit) : "";
  const address = tour.address || "Address not available";
  const city = tour.city || "";
  const mls = tour.mls && String(tour.mls).trim() !== "" ? String(tour.mls) : null;
  const status = tour.status || "Public";
  const photos = tour.multipleimages || [];

  const heroFromPhotos =
    photos.length > 0 && typeof photos[0] === "string" && photos[0].trim() !== ""
      ? photos[0].trim()
      : "";
  /** Listing photos first; if `multipleimages` is empty, same hero bg as `/listings` (not agent cover). */
  const heroImage = heroFromPhotos || listingsHeroBg;
  
  // Format address with proper commas and hyphens
  const formatAddress = (unit: string, address: string, city?: string) => {
    const parts: string[] = [];
    
    // Add unit with hyphen if it exists
    if (unit && unit.trim() !== "") {
      const unitStr = unit.trim();
      // Check if address starts with a number, if so add hyphen
      const addressMatch = address.match(/^(\d+)/);
      if (addressMatch) {
        parts.push(`${unitStr}-${address}`);
      } else {
        parts.push(`${unitStr} ${address}`);
      }
    } else {
      parts.push(address);
    }
    
    // Add city with comma if it exists
    if (city && city.trim() !== "") {
      parts.push(city.trim());
    }
    
    return parts.join(", ");
  };
  // Hero uses `multipleimages[0]` or listings hero asset (see above).
  
  // Handle floorplanarray - can be array or object
  // Extract three JPEG versions: branded (image1), unbranded (image3), MLS-sized (image2 or image3)
  interface FloorplanObject {
    pdf?: string;
    image1?: string;
    image2?: string;
    image3?: string;
    [key: string]: unknown;
  }
  
  let floorplans: Array<{ url: string; label: string; type: 'jpeg' | 'pdf' }> = [];
  if (tour.floorplanarray) {
    if (Array.isArray(tour.floorplanarray)) {
      // If it's an array, convert to our format
      floorplans = tour.floorplanarray.map((url, index) => ({
        url,
        label: index === 0 ? 'Floorplan (Branded)' : `Floorplan ${index + 1}`,
        type: url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'jpeg'
      }));
    } else if (typeof tour.floorplanarray === 'object') {
      const floorplanObj = tour.floorplanarray as FloorplanObject;
      
      // Add branded version (image1)
      if (floorplanObj.image1) {
        floorplans.push({
          url: floorplanObj.image1,
          label: 'Branded',
          type: 'jpeg'
        });
      }
      
      // Add unbranded version (image3)
      if (floorplanObj.image3) {
        floorplans.push({
          url: floorplanObj.image3,
          label: 'Unbranded',
          type: 'jpeg'
        });
      }
      
      // Add MLS-sized version (image2 if available, otherwise use image3 as fallback)
      if (floorplanObj.image2) {
        floorplans.push({
          url: floorplanObj.image2,
          label: 'MLS-Sized',
          type: 'jpeg'
        });
      } else if (floorplanObj.image3 && !floorplans.find(f => f.url === floorplanObj.image3 && f.label === 'MLS-Sized')) {
        // Use image3 as MLS-sized if image2 is not available
        floorplans.push({
          url: floorplanObj.image3,
          label: 'MLS-Sized',
          type: 'jpeg'
        });
      }
      
      // Add PDF if available
      if (floorplanObj.pdf) {
        floorplans.push({
          url: floorplanObj.pdf,
          label: 'PDF Floorplan',
          type: 'pdf'
        });
      }
    }
  }
  
  const video = (tour.video || tour.videodownload || tour.YouTube || "") as string;
  const virtualTour = tour.virtual_tour || "";

  const handleDownloadAllPhotos = async () => {
    if (photos.length === 0) {
      alert("No photos available to download");
      return;
    }

    try {
      const zip = new JSZip();
      const imagePromises = photos.map(async (photoUrl, index) => {
        try {
          const response = await fetch(photoUrl);
          const blob = await response.blob();
          const fileName = `photo_${String(index + 1).padStart(3, '0')}.jpg`;
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to fetch photo ${index + 1}:`, error);
        }
      });

      await Promise.all(imagePromises);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipFileName = `listing_${tourId}_photos.zip`;
      saveAs(zipBlob, zipFileName);
    } catch (error) {
      console.error("Failed to create ZIP file:", error);
      alert("Failed to download photos. Please try again.");
    }
  };

 // Prepare chart data based on selected tab
 const getChartData = () => {
 if (!statsData) return null;

 let graphData;
 switch (statsTab) {
 case "weekly":
 graphData = statsData.weekly_graph;
 break;
 case "monthly":
 graphData = statsData.monthly_graph;
 break;
 case "3months":
 graphData = statsData.three_month_graph;
 break;
 case "6months":
 graphData = statsData.six_month_graph;
 break;
 default:
 graphData = statsData.weekly_graph;
 }

 if (!graphData || !graphData.labels || !graphData.data) return null;

 // Format labels - for dates, show just the day/month, for months show month name
 const formattedLabels = graphData.labels.map((label) => {
 if (label.includes('-')) {
 // Date format: extract day from date string
 const date = new Date(label);
 return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
 }
 return label;
 });

 // Convert data to numbers
 const numericData = graphData.data.map(Number);

 // For weekly/monthly, create stacked bars with Low, Medium, High
 // For 3/6 months, show single bars
 if (statsTab === "3months" || statsTab === "6months") {
 return {
 labels: formattedLabels,
 datasets: [
 {
 label: 'Hits',
 data: numericData,
 backgroundColor: '#b39ddb',
 barThickness: 14,
 },
 ],
 };
    } else {
      // Create stacked bars with Low, Medium, High distribution
      // Always show 3 bars: Low (white), Medium (grey), High (purple)
      // Ensure all three bars are always visible with proper distribution
      const lowData = numericData.map((val) => {
        // Low always gets 1 if there are hits, 0 if no hits
        return val > 0 ? 1 : 0;
      });
      
      const mediumData = numericData.map((val) => {
        if (val === 0) {
          return 0;
        } else if (val === 1) {
          // For value 1: Ensure all bars visible - use proportional distribution
          // Low=1, but to show 3 bars, we'll give small values to medium and high
          // Since total is 1, we'll use: Low=0.4, Medium=0.3, High=0.3 (normalized to 1)
          // But actually, let's keep Low=1 and give minimums to others
          return 0.2; // Small value to ensure bar is visible
        } else if (val === 2) {
          // For value 2: Low=1, Medium=0.5, High=0.5
          return 0.5;
        } else {
          // For values >= 3, distribute: Low=1, Medium gets portion, High gets rest
          const remaining = val - 1;
          // Medium gets 30-35% of remaining, minimum 1
          return Math.max(1, Math.floor(remaining * 0.35));
        }
      });
      
      const highData = numericData.map((val, idx) => {
        const low = lowData[idx];
        const medium = mediumData[idx];
        // High gets whatever is left after Low and Medium
        let remaining = val - low - medium;
        
        // For very small values, ensure high has at least a small value to show bar
        if (val > 0 && remaining <= 0 && val <= 2) {
          if (val === 1) {
            // For value 1: Adjust to show all 3 bars
            // Use: Low=0.4, Medium=0.3, High=0.3 (but we need to adjust lowData too)
            // Actually, let's keep it simple: ensure minimum visibility
            return 0.2;
          } else {
            // For value 2: Low=1, Medium=0.5, High=0.5
            return 0.5;
          }
        }
        return Math.max(0, remaining);
      });

      // For value 1, adjust to ensure all bars are visible
      const adjustedLowData = numericData.map((val, idx) => {
        if (val === 1) {
          // For value 1, use proportional distribution: 0.4, 0.3, 0.3
          return 0.4;
        }
        return lowData[idx];
      });

      const adjustedMediumData = numericData.map((val, idx) => {
        if (val === 1) {
          return 0.3;
        }
        return mediumData[idx];
      });

      const adjustedHighData = numericData.map((val, idx) => {
        if (val === 1) {
          return 0.3;
        }
        return highData[idx];
      });

      return {
        labels: formattedLabels,
        datasets: [
          {
            label: 'Low',
            data: adjustedLowData,
            backgroundColor: '#ffffff', // White
            barThickness: 14,
          },
          {
            label: 'Medium',
            data: adjustedMediumData,
            backgroundColor: '#9e9e9e', // Grey
            barThickness: 14,
          },
          {
            label: 'High',
            data: adjustedHighData,
            backgroundColor: '#b39ddb', // Purple
            barThickness: 14,
          },
        ],
      };
    }
 };

 const chartData = getChartData();

 const chartOptions = {
 responsive: true,
 maintainAspectRatio: false,
 plugins: {
 legend: { display: false },
 },
 scales: {
 x: {
 stacked: statsTab !== "3months" && statsTab !== "6months",
 ticks: { color: '#fff' },
 grid: { display: false },
 },
 y: {
 beginAtZero: true,
 max: statsTab === "3months" || statsTab === "6months" ? undefined : 8,
 stacked: statsTab !== "3months" && statsTab !== "6months",
 ticks: {
 color: '#fff',
 stepSize: 1,
 },
 grid: {
 color: '#333',
 },
 },
 },
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div
        className="w-full relative pr-0 md:pr-[50px]"
        style={{
          height: "60vh",
          minHeight: "500px",
          backgroundColor: "#000",
        }}
      >
        {/* Shimmer loader for hero image */}
        {!heroImageLoaded && heroImage && (
          <div className="absolute inset-0 shimmer" style={{ zIndex: 1 }}></div>
        )}
        {/* Hero: first listing photo, else same bg as `/listings` */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: heroImageLoaded ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
          }}
        >
          <img
            src={heroImage}
            alt={heroFromPhotos ? "Property photo" : "Listings hero background"}
            className="hidden"
            onLoad={() => setHeroImageLoaded(true)}
            onError={() => setHeroImageLoaded(true)}
          />
        </div>
        <div className="absolute inset-0 bg-black/40" style={{ zIndex: 2 }} />
        <div className="relative h-full flex items-center z-10">
          <div className="w-full md:container md:mx-auto px-4 md:px-4">
            <div className="flex flex-wrap items-center">
              {/* LEFT CONTENT */}
              <div className="w-full lg:w-7/12 mt-[150px] md:mt-20 mb-0 md:mb-6 lg:mb-0">
                <span className="badge mb-3 px-3 py-1 rounded text-sm font-semibold inline-block text-white mt-10" style={{ backgroundColor: "#2a3547" }}>{status}</span>

            <h1 className="font-bold text-[22px] md:text-[34px] lg:text-[48px] text-white mb-4 leading-snug md:leading-tight">
  {formatAddress(unit, address, city).split(", ").map((part, index, array) => (
    <span
      key={index}
      className={
        index === 1
          ? "block mt-2 text-2xl md:text-3xl lg:text-4xl"
          : ""
      }
    >
      {part}
      {index < array.length - 1 && <br />}
    </span>
  ))}
</h1>



                {mls && (
 <p className="mb-4 text-lg md:text-xl text-white/75 opacity-75">MLS® Number: {mls}</p>
 )}

<div className="flex flex-wrap gap-3 items-center">
  <Link href="/new-appointment">
    <Button className="border border-white text-white px-4 py-2 rounded hover:bg-white/10 transition mb-0 bg-transparent">
      ORDER SERVICES
    </Button>
  </Link>
  <Button
    onClick={handleFeatureListingClick}
    className="btn-main border-0 text-black bg-[#B082F2] px-8 py-3 rounded-full hover:bg-white hover:text-[#B082F2] transition mb-0"
  >
    MARKET THIS LISTING
  </Button>
  <Button
    onClick={() => tourId && setLocation(`/ai-tool?id=${tourId}`)}
    className="border border-white text-white px-4 py-2 rounded hover:bg-white/10 transition mb-0 bg-transparent"
  >
    MARKETING KIT
  </Button>
</div>
 </div>

              {/* ALERT — SEPARATE ROW */}
              {pendingProofId && (
              <div className="w-full lg:w-9/12 mt-6">
                <div className="approval-alert relative flex items-start gap-3 md:gap-4 bg-black/70 backdrop-blur border-white/10 rounded-[12px] px-4 md:px-5 py-4">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center mt-0.5 flex-shrink-0">
  <span className="text-white font-bold text-sm">!</span>
</div>
                  <div>
 <h6 className="text-[13px] md:text-[14px] font-bold text-white mb-1">
  Print Proof Needs Approval
</h6>
<p className="text-[12px] font-medium text-white">
  We've detected that your feature sheet at{" "}
  <span className="font-bold text-white">
    {formatAddress(unit, address, city)}
  </span>{" "}
  is waiting for approval.
</p>
<Link
  href={`/proof-review?id=${pendingProofId}`}
  className="inline-block mt-1 text-[12px] font-semibold text-red-400 hover:underline">
  Click here to review now.
</Link>
 </div>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Service Cards Section */}
      <div className="service1-package bg-black mt-[150px] lg:mt-[100px] mb-12">
        <div className="container mx-auto px-4 relative z-20 mb-0">
          <div
            className="border-white/10 rounded-[12px] overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #121212, #0b0b0b)",
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3">
              {/* Professional Services */}
              <div className="p-6 border-b md:border-b-0 md:border-r border-white/10">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-white font-semibold text-lg">
                    Professional Services
                  </h4>

                  {/* CHECK ICON – EXTREME RIGHT */}
                  <div className="w-6 h-6 rounded-full bg-[#3ddc84] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                  </div>
                </div>

                <p className="text-white/60 text-sm max-w-xs">
                  Order professional media services for this listing.
                </p>
              </div>

              {/* Virtual Services */}
              <div className="p-6 border-b md:border-b-0 md:border-r border-white/10">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-white font-semibold text-lg">
                    Virtual Services
                  </h4>

                  {/* PLUS ICON – EXTREME RIGHT */}
                  <div className="w-6 h-6 rounded-full border border-white/40 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  </div>
                </div>

                <p className="text-white/60 text-sm max-w-xs">
                  Order virtual services such as staging and photo editing.
                </p>
              </div>

              {/* Manage MLS */}
              <div className="flex">
                {/* TEXT AREA */}
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-white font-semibold text-lg">
                      Manage MLS
                    </h4>

                    {/* CHECK ICON – EXTREME RIGHT */}
                    <div className="w-6 h-6 rounded-full bg-[#3ddc84] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                    </div>
                  </div>

                  <p className="text-white/60 text-sm max-w-xs">
                    Upload and manage your media on your MLS listing with ease.
                  </p>
                </div>

                {/* FULL HEIGHT ARROW BOX */}
                <div className="w-14 bg-[#2a2034] flex items-center justify-center">
                  <ChevronRight className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="service-package bg-black -mt-4">
        <div className="container mx-auto px-4 pb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList
              className="
                w-full
                flex
                items-center
                bg-[#2b2b2b]
                rounded-full
                px-2
                py-6
                border-white/10
              "
            >
              {[
                { value: "photos", label: "Photos" },
                { value: "floorplan", label: "Floorplan" },
                { value: "virtual-tour", label: "Virtual Tour" },
              ].map((tab) => (
              <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="
                    flex-1
                    text-center
                    text-sm
                    font-medium
                    text-white/60
                    rounded-full
                    py-2
                    my-1
                    transition-all
                    data-[state=active]:bg-[#b284f6]
                    data-[state=active]:text-white
                    data-[state=active]:my-0
                  "
                >
                  {tab.label}
              </TabsTrigger>
              ))}
            </TabsList>

            {/* Photos Tab */}
            <TabsContent value="photos" className="mt-6">
              <div className="mb-4">
                <Button 
                  onClick={handleFeatureListingClick}
                  className="
                    bg-[#b388ff]
                    hover:bg-[#b388ff]/80
                    text-black
                    uppercase
                    tracking-wide
                    rounded-[12px]
                    px-4
                    py-3
                    flex
                    items-center
                    gap-2
                    mb-3
                  "
                >
                  FEATURE LISTING
                </Button>

                <div>
                <Button 
                  onClick={handleDownloadAllPhotos}
                  disabled={photos.length === 0}
                  className="
                    bg-transparent
                    border
                    border-white/40
                    text-white
                    uppercase
                    tracking-wide
                    rounded-[12px]
                    px-4
                    py-3
                    hover:border-white
                    hover:bg-white/5
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Download className="h-4 w-4" />
                  DOWNLOAD ALL PHOTOS
                </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {photos.length > 0 ? (
                  photos.map((photo, index) => (
                    <div key={index} className="text-center">
                      <ImageWithShimmer 
                        src={photo} 
                        alt={`Photo ${index + 1}`} 
                        className="w-full rounded-lg"
                      />
                      <p className="text-white mt-2">{index + 1}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center col-span-full">
                    <p className="text-white/70">No photos available</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Floorplan Tab */}
            <TabsContent value="floorplan" className="mt-6">
              <div className="mb-4">
                <Button 
                  onClick={async () => {
                    if (floorplans.length > 0) {
                      // Download all JPEG floorplans as ZIP
                      const jpegFloorplans = floorplans.filter(fp => fp.type === 'jpeg');
                      if (jpegFloorplans.length > 0) {
                        try {
                          const zip = new JSZip();
                          const imagePromises = jpegFloorplans.map(async (floorplan, index) => {
                            try {
                              const response = await fetch(floorplan.url);
                              const blob = await response.blob();
                              const fileName = `floorplan_${floorplan.label.toLowerCase().replace(/\s+/g, '_')}.jpg`;
                              zip.file(fileName, blob);
                            } catch (error) {
                              console.error(`Failed to fetch floorplan ${index + 1}:`, error);
                            }
                          });

                          await Promise.all(imagePromises);
                          const zipBlob = await zip.generateAsync({ type: "blob" });
                          const zipFileName = `listing_${tourId}_floorplans.zip`;
                          saveAs(zipBlob, zipFileName);
                        } catch (error) {
                          console.error("Failed to create ZIP file:", error);
                          alert("Failed to download floorplans. Please try again.");
                        }
                      } else {
                        // If no JPEGs, download PDF
                        const pdfFloorplan = floorplans.find(fp => fp.type === 'pdf');
                        if (pdfFloorplan) {
                          window.open(pdfFloorplan.url, '_blank');
                        }
                      }
                    }
                  }}
                  disabled={floorplans.length === 0}
                  className="
                    bg-transparent
                    border
                    border-white/40
                    text-white
                    uppercase
                    tracking-wide
                    rounded-[12px]
                    px-4
                    py-3
                    hover:border-white
                    hover:bg-white/5
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Download className="h-4 w-4" />
                  DOWNLOAD FLOORPLAN
                </Button>
              </div>
              {floorplans.length > 0 ? (
 <div className="flex flex-col gap-4">
 {/* First floorplan - full width */}
 {floorplans[0] && (
 <div className="w-full text-center">
 {floorplans[0].type === 'pdf' ? (
 <div className="bg-black/40 border border-white/20 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
 <Download className="h-12 w-12 text-white/70 mb-4" />
 <a
 href={floorplans[0].url}
 target="_blank"
 rel="noopener noreferrer"
 className="text-[#b388ff] hover:underline"
 >
 <p className="text-white mt-2">{floorplans[0].label}</p>
 </a>
 </div>
 ) : (
 <>
 <ImageWithShimmer 
 src={floorplans[0].url} 
 alt={floorplans[0].label} 
 className="w-full rounded-lg"
 />
 <p className="text-white mt-2 font-medium">JPG (MSL Size)</p>
 </>
 )}
 </div>
 )}
 
 {/* Remaining floorplans - 2 per row */}
 {floorplans.length > 1 && (
 <div className="flex flex-wrap gap-4">
 {floorplans.slice(1).map((floorplan, index) => {
 const actualIndex = index + 1; // Adjust index for labeling
                    return (
 <div key={actualIndex} className="w-full lg:w-[calc(50%-0.5rem)] text-center">
                        {floorplan.type === 'pdf' ? (
                          <div className="bg-black/40 border border-white/20 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
                            <Download className="h-12 w-12 text-white/70 mb-4" />
                            <a
                              href={floorplan.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#b388ff] hover:underline"
                            >
                              <p className="text-white mt-2">{floorplan.label}</p>
                            </a>
                          </div>
                        ) : (
                          <>
                            <ImageWithShimmer 
                              src={floorplan.url} 
                              alt={floorplan.label} 
                              className="w-full rounded-lg"
                            />
 <p className="text-white mt-2 font-medium">
 {actualIndex === 1 ? "JPG" : actualIndex === 2 ? "JPG (Branded)" : floorplan.label}
 </p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
 )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-white/70">No floorplan available</p>
                </div>
              )}
            </TabsContent>

            {/* Virtual Tour Tab */}
            <TabsContent value="virtual-tour" className="mt-6">
              {virtualTour ? (
                <div className="text-center py-12">
                  <p className="text-white text-lg mb-6">Click the button below to open the virtual tour</p>
                  <Button
                    onClick={() => window.open(virtualTour, '_blank')}
                    className="
                      bg-transparent
                      border
                      border-white/40
                      text-white
                      uppercase
                      tracking-wide
                      rounded-[12px]
                      px-4
                      py-3
                      hover:border-white
                      hover:bg-white/5
                      flex
                      items-center
                      gap-2
                    "
                  >
                    OPEN VIRTUAL TOUR
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-white/70">No virtual tour available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

 {/* Statistics Section */}
 <section className="py-5 text-light bg-black">
 <div className="container mx-auto px-4">
 <div className="flex flex-col lg:flex-row gap-6">
 <div className="w-full lg:w-1/2">
 <h5 className="text-white text-lg font-semibold uppercase mb-5">Landing Page Statistics</h5>
 
 {/* Stats Tabs */}
 <Tabs value={statsTab} onValueChange={setStatsTab} className="w-full">
 <TabsList className="grid w-full grid-cols-4 bg-black/40 border border-white/20 rounded-full p-1">
 <TabsTrigger
 value="weekly"
 className="data-[state=active]:bg-[#b388ff] data-[state=active]:text-white text-white/70 rounded-full text-xs sm:text-sm"
 >
 Weekly
 </TabsTrigger>
 <TabsTrigger
 value="monthly"
 className="data-[state=active]:bg-[#b388ff] data-[state=active]:text-white text-white/70 rounded-full text-xs sm:text-sm"
 >
 Monthly
 </TabsTrigger>
 <TabsTrigger
 value="3months"
 className="data-[state=active]:bg-[#b388ff] data-[state=active]:text-white text-white/70 rounded-full text-xs sm:text-sm"
 >
 3 Months
 </TabsTrigger>
 <TabsTrigger
 value="6months"
 className="data-[state=active]:bg-[#b388ff] data-[state=active]:text-white text-white/70 rounded-full text-xs sm:text-sm"
 >
 6 Months
 </TabsTrigger>
 </TabsList>

                {/* Chart Content */}
                <TabsContent value={statsTab} className="mt-4">
                  <div className="w-full">
                    <div className="chart-box bg-black/20 rounded-lg p-4" style={{ height: '300px', position: 'relative' }}>
                      {statsLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b388ff]"></div>
                        </div>
                      ) : chartData ? (
                        <Bar 
                          key={statsTab} 
                          ref={chartRef} 
                          data={chartData} 
                          options={chartOptions} 
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-white/70">
                          No data available
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
 </Tabs>
 </div>

            {/* All-Time Stats */}
            <div className="w-full lg:w-1/2 space-y-10">
              <h2 className="text-white text-lg font-semibold mb-4">
                ALL TIME
              </h2>

              {/* ALL TIME CARD */}
              <div className="border border-white/10 rounded-[10px] overflow-hidden">
                <div className="grid grid-cols-3">
                  <div className="p-2 text-center border-r border-white/10">
                    <p className="text-[20px] font-bold text-white">
                      {statsData?.totalhits ? statsData.totalhits : "-"}
                    </p>
                    <p className="text-[13px] text-[#9aa0a6]">Total Hits</p>
                  </div>
                  <div className="p-2 text-center border-r border-white/10">
                    <p className="text-[20px] font-bold text-white">
                      {statsData?.avgtotalhits ? statsData.avgtotalhits : "-"}
                    </p>
                    <p className="text-[13px] text-[#9aa0a6]">
                      Avg. Hits Per Day
                    </p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-[20px] font-bold text-white">
                      {statsData?.bestday ? statsData.bestday.split('(')[0].trim() : "-"}
                    </p>
                    <p className="text-[13px] text-[#9aa0a6]">
                      {statsData?.bestday ? `Best Day (${statsData.bestday.match(/\((\d+)/)?.[1] || 0} Hits)` : "Best Day"}
                    </p>
                  </div>
                </div>
              </div>

              {/* EMAIL STATS */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">
                  EMAIL STATS
                </h4>

                {/* INPUT PILL */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Recipient email (separate with comma)"
                    className="
                      w-full
                      bg-[#2f2a3a]
                      text-white
                      text-sm
                      placeholder:text-white/50
                      rounded-[14px]
                      pl-5
                      pr-16
                      py-4
                      outline-none
                    "
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />

                  <button
                    className="
                      absolute
                      right-2
                      top-1/2
                      -translate-y-1/2
                      bg-[#b284f6]
                      w-10
                      h-10
                      rounded-[10px]
                      flex
                      items-center
                      justify-center
                      hover:bg-[#b284f6]/80
                    "
                    onClick={() => {
                      // Handle email send logic here
                      console.log("Send email to:", emailInput);
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 12 12"
                      fill="white"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M2 1L11 6L2 11V1Z" />
                    </svg>
                  </button>
                </div>

                {/* CHECKBOX */}
                <label className="flex items-center gap-2 text-sm text-white mb-6">
                  <input 
                    type="checkbox" 
                    className="accent-[#b284f6] w-4 h-4" 
                    checked={sendCopy}
                    onChange={(e) => setSendCopy(e.target.checked)}
                  />
                  Send me a copy
                </label>

                <h4 className="text-sm font-semibold text-white mb-2">
                  UNDERSTANDING YOUR STATS
                </h4>

                <p className="text-xs text-white/50 leading-relaxed">
                  Landing Page activity naturally varies depending on how long your
                  listing has been live. It's common to see lower numbers when a page
                  is first published or once a property is nearing the end of its
                  marketing cycle. These stats are meant to give you insight into
                  engagement over time — so don't stress if the numbers fluctuate.
                  Consistent promotion and fresh updates help maintain steady
                  visibility.
                </p>
              </div>
            </div>
 </div>
 </div>
 </section>

      {printJobs.length > 0 && (
        <div className="container mx-auto px-4 pb-10">
          <h5 className="section-heading uppercase mb-4">Listing Print Order History</h5>
          <div className="custom-table overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="py-3">Product</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {printJobs.map((job) => (
                  <tr key={String(job.id)} className={job.needs_approval ? "highlight-row" : ""}>
                    <td className="py-3">{job.product_details?.name || "Print Product"}</td>
                    <td>{job.qty || "—"}</td>
                    <td>{job.status || "—"}</td>
                    <td>{job.datecreated || "—"}</td>
                    <td>
                      {job.needs_approval ? (
                        <Link href={`/proof-review?id=${job.id}`}>
                          <span className="btn-review">REVIEW</span>
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
