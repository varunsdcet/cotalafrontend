import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import cardImg from "@/pages/images/card.png";
import lightLogo from "@/pages/images/logos/light-logo.svg";
import heroBg from "@/pages/images/new-bg-1.jpg";
import { MapPin, Ruler, Check, ChevronDown, CheckCircle2 } from "lucide-react";
import { 
  getMyListings, 
  getCategory, 
  getSubCategoryNew,
  getSubCategoryAddon,
  getDateTimeSlots,
  calculateTotalAmount,
  addOrder,
  type MyListingsResponse,
  type CategoryResponse,
  type SubCategoryNewResponse,
  type SubCategoryAddonResponse,
  type ServiceArrayItem
} from "@/lib/api";

interface OrderItem {
  category: string;
  name: string;
  price: number;
  date?: string;
  serviceId?: string | number;
  qty?: number;
  rush?: "yes" | "no";
  rush_option?: string;
  type?: string;
}

interface CategoryData {
  name: string;
  image: string;
  subcategories?: SubCategoryNewResponse["list"];
  addons?: SubCategoryAddonResponse["list"];
}

export default function NewOrder() {
  const [userName, setUserName] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [cardNumberError, setCardNumberError] = useState("");
  const [expiryDateError, setExpiryDateError] = useState("");

  // Capitalize first letter of name
  const capitalizeFirstLetter = (str: string): string => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Card number validation (Luhn algorithm)
  const validateCardNumber = (cardNumber: string): boolean => {
    // Remove spaces and non-digits
    const cleaned = cardNumber.replace(/\s+/g, "").replace(/\D/g, "");
    
    // Check if it's 13-19 digits (standard card length)
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  // Format card number with spaces every 4 digits
  const formatCardNumber = (value: string): string => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, "");
    // Add space every 4 digits
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted;
  };

  // Validate expiry date (MM/YY format)
  const validateExpiryDate = (expiryDate: string): boolean => {
    // Remove slashes and spaces
    const cleaned = expiryDate.replace(/\D/g, "");
    
    // Should be 4 digits (MMYY)
    if (cleaned.length !== 4) {
      return false;
    }
    
    const month = parseInt(cleaned.substring(0, 2));
    const year = parseInt(cleaned.substring(2, 4));
    
    // Month should be 01-12
    if (month < 1 || month > 12) {
      return false;
    }
    
    // Check if date is not expired
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100; // Last 2 digits
    const currentMonth = currentDate.getMonth() + 1;
    
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return false;
    }
    
    return true;
  };

  // Format expiry date as MM/YY
  const formatExpiryDate = (value: string): string => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, "");
    
    // Limit to 4 digits
    const limited = cleaned.substring(0, 4);
    
    // Add slash after 2 digits
    if (limited.length >= 2) {
      return `${limited.substring(0, 2)}/${limited.substring(2)}`;
    }
    
    return limited;
  };

  // Handle card number input
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    e.target.value = formatted;
    
    // Validate
    if (formatted.replace(/\s/g, "").length > 0) {
      if (validateCardNumber(formatted)) {
        setCardNumberError("");
      } else {
        setCardNumberError("Please enter a valid card number");
      }
    } else {
      setCardNumberError("");
    }
  };

  // Handle card number blur (validate on focus loss)
  const handleCardNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.replace(/\s/g, "").length > 0) {
      if (!validateCardNumber(value)) {
        setCardNumberError("Please enter a valid card number");
      }
    }
  };

  // Handle expiry date input
  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    e.target.value = formatted;
    
    // Validate
    if (formatted.replace(/\D/g, "").length === 4) {
      if (validateExpiryDate(formatted)) {
        setExpiryDateError("");
      } else {
        setExpiryDateError("Please enter a valid expiry date (MM/YY)");
      }
    } else {
      setExpiryDateError("");
    }
  };

  // Handle expiry date blur (validate on focus loss)
  const handleExpiryDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.replace(/\D/g, "").length === 4) {
      if (!validateExpiryDate(value)) {
        setExpiryDateError("Please enter a valid expiry date (MM/YY)");
      }
    } else if (value.replace(/\D/g, "").length > 0) {
      setExpiryDateError("Please enter a valid expiry date (MM/YY)");
    }
  };
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [listingAddress, setListingAddress] = useState("");
  const [listingSize, setListingSize] = useState("");
  const [myListings, setMyListings] = useState<MyListingsResponse["tours"]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [useGooglePlaces, setUseGooglePlaces] = useState(false);
  const autocompleteRef = useRef<any>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [homesize, setHomesize] = useState<string>("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [timeSlots, setTimeSlots] = useState<Array<{ slotStart: string; slotEnd: string }>>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [calculatedAmount, setCalculatedAmount] = useState<{ totalamount?: number | string; paymentgatewayamount?: number | string } | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [dateTimePreference, setDateTimePreference] = useState<string>("");
  const [serviceDates, setServiceDates] = useState<{ [key: string]: { date: string; timeSlot: string } }>({});
  const [serviceTimeSlots, setServiceTimeSlots] = useState<{ [key: string]: Array<{ slotStart: string; slotEnd: string }> }>({});
  const [listingDetailsSaved, setListingDetailsSaved] = useState(false);
  const [categorySaved, setCategorySaved] = useState<{ [key: string]: boolean }>({});
  const [dateTimeSameSaved, setDateTimeSameSaved] = useState(false);
  const [dateTimeDifferentSaved, setDateTimeDifferentSaved] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string>("flush-collapseOne");

  useEffect(() => {
    // Get user name from localStorage
    const userData = localStorage.getItem("cotala_user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const name = user.name || user.username || user.email || "";
        setUserName(capitalizeFirstLetter(name));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }

    // Load my listings
    const loadMyListings = async () => {
      try {
        const data = await getMyListings();
        if (data.status && data.tours) {
          setMyListings(data.tours);
        }
      } catch (error) {
        console.error("Failed to load listings", error);
      }
    };
    loadMyListings();

    // Load categories
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const data = await getCategory();
        if (data.status && data.list) {
          setCategories(data.list.map(cat => ({ name: cat.name, image: cat.image })));
        }
      } catch (error) {
        console.error("Failed to load categories", error);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  // Handle address input change and detect if it's from listings
  const handleAddressChange = useCallback((value: string) => {
    setListingAddress(value);
    
    // Check if the value matches any listing
    const matchingListing = myListings?.find(
      (tour) => `${tour.address}${tour.city ? `, ${tour.city}` : ""}` === value
    );
    
    if (matchingListing) {
      setSelectedListingId(String(matchingListing.tourid));
      setUseGooglePlaces(false);
    } else {
      setSelectedListingId("");
      setUseGooglePlaces(true);
    }
  }, [myListings]);

  // Initialize Google Places Autocomplete (always enabled for Canada addresses)
  useEffect(() => {
    if (window.google?.maps?.places) {
      // Small delay to ensure input is rendered
      const timer = setTimeout(() => {
        const addressInput = document.getElementById("address") as HTMLInputElement;
        if (addressInput && !autocompleteRef.current && window.google && window.google.maps && window.google.maps.places) {
          // Initialize Google Places Autocomplete for Canada
          const autocomplete = new window.google.maps.places.Autocomplete(addressInput, {
            componentRestrictions: { country: "ca" }, // Restrict to Canada
            fields: ["formatted_address", "address_components", "geometry"],
            types: ["address"],
          });

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.formatted_address) {
              handleAddressChange(place.formatted_address);
              // Extract city from address components
              const cityComponent = place.address_components?.find(
                (component) => component.types.includes("locality") || component.types.includes("administrative_area_level_2")
              );
              if (cityComponent) {
                // You can set city if needed
              }
            }
          });

          autocompleteRef.current = autocomplete;
        }
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [handleAddressChange]); // Include handleAddressChange in dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const handleTimeSlotClick = (slot: string) => {
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter((s) => s !== slot));
    } else {
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  const handleSaveListingDetails = () => {
    // This will be called from Listing Details section
    // Address and size are already in state
    const sizeInput = document.getElementById("size") as HTMLInputElement;
    if (sizeInput) {
      setHomesize(sizeInput.value);
    }
  };

  // Load subcategories for a category
  const loadSubcategories = async (categoryName: string) => {
    if (!homesize) {
      const sizeInput = document.getElementById("size") as HTMLInputElement;
      if (sizeInput && sizeInput.value) {
        setHomesize(sizeInput.value);
      } else {
        alert("Please enter home size first");
        return;
      }
    }

    try {
      const data = await getSubCategoryNew({
        category: [categoryName],
        homesize: homesize || "2000"
      });
      
      if (data.status && data.list) {
        setCategories(prev => prev.map(cat => 
          cat.name.toLowerCase() === categoryName.toLowerCase() 
            ? { ...cat, subcategories: data.list }
            : cat
        ));
      }
    } catch (error) {
      console.error("Failed to load subcategories", error);
    }
  };

  // Load addons for categories
  const loadAddons = async (categoryNames: string[]) => {
    if (!homesize) {
      const sizeInput = document.getElementById("size") as HTMLInputElement;
      if (sizeInput && sizeInput.value) {
        setHomesize(sizeInput.value);
      } else {
        alert("Please enter home size first");
        return;
      }
    }

    try {
      const data = await getSubCategoryAddon({
        category: categoryNames,
        homesize: homesize || "2000"
      });
      
      if (data.status && data.list) {
        // Store addons in state - you can organize this as needed
        console.log("Addons loaded:", data.list);
      }
    } catch (error) {
      console.error("Failed to load addons", error);
    }
  };

  // Handle category accordion open
  const handleCategoryOpen = (categoryName: string) => {
    const category = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
    if (category && !category.subcategories) {
      loadSubcategories(categoryName);
    }
  };

  // Calculate total amount for selected services and update individual prices
  const calculateTotalAmountForServices = async (items: OrderItem[]) => {
    if (items.length === 0) {
      setCalculatedAmount(null);
      setTotalAmount(0);
      // Clear prices from order items
      setOrderItems(prev => prev.map(item => ({ ...item, price: 0 })));
      return;
    }

    try {
      const serviceArray: ServiceArrayItem[] = items.map(item => ({
        service: String(item.serviceId || ""),
        qty: item.qty || 1,
        rush: item.rush || "no",
        type: item.type || item.category.toLowerCase(),
        rush_option: item.rush_option || "",
        name: item.name,
        totalamount: "0"
      }));

      const data = await calculateTotalAmount({ servicearray: serviceArray });
      if (data.status) {
        setCalculatedAmount({
          totalamount: data.totalamount,
          paymentgatewayamount: data.paymentgatewayamount
        });
        const total = Number(data.totalamount) || 0;
        setTotalAmount(total);
        
        // Update order items with calculated prices from API response
        if (data.servicearray && data.servicearray.length > 0) {
          // API returned individual service amounts
          setOrderItems(prev => {
            return prev.map((item) => {
              // Find matching service in API response
              const apiService = data.servicearray!.find(
                s => String(s.service) === String(item.serviceId) && s.name === item.name
              );
              if (apiService) {
                return {
                  ...item,
                  price: Number(apiService.totalamount) || 0
                };
              }
              return item;
            });
          });
        } else {
          // API didn't return individual amounts, calculate proportionally
          // This is a fallback - ideally API should return individual amounts
          const pricePerService = items.length > 0 ? total / items.length : 0;
          setOrderItems(prev => {
            return prev.map((item) => {
              const matchingItem = items.find(
                i => i.serviceId === item.serviceId && i.category === item.category
              );
              if (matchingItem) {
                return {
                  ...item,
                  price: pricePerService
                };
              }
              return item;
            });
          });
        }
      }
    } catch (error) {
      console.error("Failed to calculate total amount", error);
    }
  };

  // Load datetime slots when date is selected
  const loadDateTimeSlots = async (date: string) => {
    try {
      const data = await getDateTimeSlots({ date });
      if (data.status && data.timeSlots) {
        setTimeSlots(data.timeSlots);
      }
    } catch (error) {
      console.error("Failed to load time slots", error);
    }
  };

  // Handle service selection
  const handleServiceSelect = (categoryName: string, serviceId: string | number, serviceName: string, isAddon: boolean = false) => {
    const newItem: OrderItem = {
      category: categoryName,
      name: serviceName,
      price: 0, // Will be calculated
      serviceId,
      qty: 1,
      rush: "no",
      rush_option: "",
      type: isAddon ? "addon" : categoryName.toLowerCase()
    };
    
    setOrderItems(prev => {
      // Remove if already exists, otherwise add
      const filtered = prev.filter(item => 
        !(item.serviceId === serviceId && item.category === categoryName)
      );
      const updated = [...filtered, newItem];
      // Calculate total amount when services change
      calculateTotalAmountForServices(updated);
      return updated;
    });
  };

  // Handle order submission
  const handleSubmitOrder = async () => {
    if (!listingAddress) {
      alert("Please enter listing address");
      return;
    }
    if (!homesize) {
      alert("Please enter home size");
      return;
    }
    if (orderItems.length === 0) {
      alert("Please select at least one service");
      return;
    }
    
    // Only require date/time if not "as soon as possible" or "contact my seller"
    if (dateTimePreference !== "asap" && dateTimePreference !== "contact") {
      if (!selectedDateStr || !selectedTimeSlot) {
        alert("Please select date and time");
        return;
      }
    }

    // Validate card number
    const cardnumberInput = document.getElementById("cardnumber") as HTMLInputElement;
    const cardnumber = cardnumberInput?.value || "";
    if (!cardnumber || !validateCardNumber(cardnumber)) {
      setCardNumberError("Please enter a valid card number");
      alert("Please enter a valid card number");
      return;
    }

    // Validate expiry date
    const expirydateInput = document.getElementById("expirydate") as HTMLInputElement;
    const expirydate = expirydateInput?.value || "";
    if (!expirydate || !validateExpiryDate(expirydate)) {
      setExpiryDateError("Please enter a valid expiry date (MM/YY)");
      alert("Please enter a valid expiry date (MM/YY)");
      return;
    }
    
    // For "as soon as possible", set default values if not set
    let finalDate = selectedDateStr;
    let finalTime = selectedTimeSlot;
    if (dateTimePreference === "asap") {
      if (!finalDate) {
        const today = new Date();
        finalDate = today.toISOString().split('T')[0];
      }
      if (!finalTime) {
        finalTime = "As soon as possible";
      }
    }

    setSubmittingOrder(true);
    try {
      // Get payment details from form
      // Get payment details (already validated above, remove formatting for API)
      const cardnumberInput = document.getElementById("cardnumber") as HTMLInputElement;
      const expirydateInput = document.getElementById("expirydate") as HTMLInputElement;
      const cardnumber = cardnumberInput?.value.replace(/\s/g, "") || ""; // Remove spaces for API
      const expirydate = expirydateInput?.value.replace(/\//g, "") || ""; // Remove slash for API
      const cvv = (document.getElementById("cvv") as HTMLInputElement)?.value || "";
      const holdername = (document.getElementById("holdername") as HTMLInputElement)?.value || "";
      const saveCardCheckbox = document.getElementById("savecarddetails") as HTMLInputElement;
      const savecarddetails = saveCardCheckbox?.checked || false;
      const notes = (document.querySelector("textarea") as HTMLTextAreaElement)?.value || "";
      const photographer = ""; // Get from photographer selection if available

      // Extract city from address (you might want to improve this)
      const city = listingAddress.split(",").slice(-2, -1)[0]?.trim() || "";

      // Format time to match API format (e.g., "11:00 am")
      const formatTime = (timeStr: string) => {
        // If already in correct format, return as is
        if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
          return timeStr.toLowerCase();
        }
        // If it's "As soon as possible", return as is
        if (timeStr.toLowerCase().includes("as soon")) {
          return timeStr;
        }
        // Otherwise, assume it's in "HH:MM - HH:MM" format and extract first part
        const timePart = timeStr.split("-")[0]?.trim() || timeStr;
        return timePart.toLowerCase();
      };

      // Parse time slot to get start and end time
      let parsedTime = finalTime;
      let parsedEndTime = finalTime;
      if (finalTime && finalTime.includes("-")) {
        const [start, end] = finalTime.split("-").map(t => t.trim());
        parsedTime = formatTime(start);
        parsedEndTime = formatTime(end);
      } else if (finalTime) {
        parsedTime = formatTime(finalTime);
        parsedEndTime = parsedTime; // Use same time if no end time specified
      }

      // Helper function to convert time to 24-hour format for datetime
      const convertTo24Hour = (timeStr: string): string => {
        if (!timeStr) return "00:00:00";
        // If already in 24-hour format (HH:MM), return with seconds
        if (timeStr.match(/^\d{2}:\d{2}$/)) {
          return `${timeStr}:00`;
        }
        // If in 12-hour format with AM/PM
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
        if (match) {
          let hours = parseInt(match[1]);
          const minutes = match[2];
          const ampm = match[3].toLowerCase();
          if (ampm === "pm" && hours !== 12) hours += 12;
          if (ampm === "am" && hours === 12) hours = 0;
          return `${String(hours).padStart(2, "0")}:${minutes}:00`;
        }
        return "00:00:00";
      };

      // Determine customer_preferred based on date/time preference
      let customerPreferred = "";
      let customerPreferredDateStartTime = "";
      let customerPreferredDateEndTime = "";

      if (dateTimePreference === "asap") {
        customerPreferred = "alltime";
      } else if (dateTimePreference === "contact") {
        customerPreferred = "seller";
      } else if (dateTimePreference === "same" || dateTimePreference === "different") {
        // Format: "2018-06-19 16:18:32"
        if (finalDate && parsedTime && parsedEndTime) {
          const startTime24 = convertTo24Hour(parsedTime);
          const endTime24 = convertTo24Hour(parsedEndTime);
          customerPreferred = `${finalDate} ${startTime24}`;
          customerPreferredDateStartTime = `${finalDate} ${startTime24}`;
          customerPreferredDateEndTime = `${finalDate} ${endTime24}`;
        }
      }

      const serviceArray: ServiceArrayItem[] = orderItems.map(item => {
        // For "different days", get the specific date/time for this service
        let servicePreferred = customerPreferred;
        let serviceStartTime = customerPreferredDateStartTime;
        let serviceEndTime = customerPreferredDateEndTime;

        if (dateTimePreference === "different" && item.date) {
          // Extract date and time from item.date (format: "2024-12-25 - 09:00 AM - 10:00 AM")
          const dateMatch = item.date.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(.+)/);
          if (dateMatch) {
            const serviceDate = dateMatch[1];
            const timePart = dateMatch[2];
            if (timePart.includes("-")) {
              const [start, end] = timePart.split("-").map(t => t.trim());
              const startTime24 = convertTo24Hour(start);
              const endTime24 = convertTo24Hour(end);
              servicePreferred = `${serviceDate} ${startTime24}`;
              serviceStartTime = `${serviceDate} ${startTime24}`;
              serviceEndTime = `${serviceDate} ${endTime24}`;
            } else {
              const time24 = convertTo24Hour(timePart);
              servicePreferred = `${serviceDate} ${time24}`;
              serviceStartTime = `${serviceDate} ${time24}`;
              serviceEndTime = `${serviceDate} ${time24}`;
            }
          }
        }

        return {
          service: String(item.serviceId || ""),
          qty: item.qty || 1,
          rush: item.rush || "no",
          type: item.type || item.category.toLowerCase(),
          rush_option: item.rush_option || "",
          name: item.name,
          totalamount: String(item.price || 0),
          customer_preferred: servicePreferred || customerPreferred,
          customer_preferred_datestarttime: serviceStartTime || customerPreferredDateStartTime,
          customer_preferred_dateendtime: serviceEndTime || customerPreferredDateEndTime
        };
      });

      // Determine tour_id - set to 0 if no listing is selected
      const tourId = selectedListingId ? Number(selectedListingId) : 0;

      const orderPayload = {
        address: listingAddress,
        city: city,
        date: finalDate,
        time: parsedTime,
        end_time: parsedEndTime,
        is_same_date: dateTimePreference === "same" || dateTimePreference === "asap",
        homesize: homesize,
        lotsize: "100", // Default or get from form
        notes: notes,
        photographer: photographer || "",
        tour_id: tourId,
        amount: calculatedAmount?.paymentgatewayamount ? Number(calculatedAmount.paymentgatewayamount) : totalAmount,
        total: calculatedAmount?.totalamount ? Number(calculatedAmount.totalamount) : totalAmount,
        cardnumber: cardnumber,
        expirydate: expirydate,
        cvv: cvv,
        holdername: holdername,
        savecarddetails: savecarddetails,
        servicearray: serviceArray
      };

      console.log(JSON.stringify(orderPayload,null,2))
      return
      const data = await addOrder(orderPayload);
      if (data.status) {
        // Navigate to success page with animation
        window.location.href = "/order-success";
      } else {
        alert(data.message || "Failed to place order");
      }
    } catch (error) {
      console.error("Failed to submit order", error);
      alert("Unable to place order. Please try again.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSavePhotography = () => {
    // Get selected photography items
    const selectedPhotos: OrderItem[] = [];
    // Find all checked checkboxes that are within the Photography accordion
    // Look for checkboxes with IDs starting with "photo-" or "extra-"
    const photoCheckboxes = document.querySelectorAll('input[id^="photo-"]:checked, input[id^="extra-"]:checked');
    photoCheckboxes.forEach((cb) => {
      const checkbox = cb as HTMLInputElement;
      const label = document.querySelector(`label[for="${checkbox.id}"]`);
      if (label) {
        const name = label.textContent?.trim() || "";
        // Map photo types to prices
        const prices: { [key: string]: number } = {
          "Standard Photos": 199,
          "HDR Photos": 239,
          "Twilight Photos": 299,
          "Twilight Exteriors": 349,
          "Drone Stills": 399,
          "Virtual Staging": 40,
          "Photo Slideshow": 50,
        };
        const price = prices[name] || 0;
        if (price > 0 && name) {
          selectedPhotos.push({ category: "Photography", name, price });
        }
      }
    });

    // Remove existing photography items and add new ones
    setOrderItems((prev) => prev.filter((item) => item.category !== "Photography").concat(selectedPhotos));
  };

  const handleSaveVideo = () => {
    const selectedVideos: OrderItem[] = [];
    // Find all checked checkboxes that are within the Video accordion
    // Look for checkboxes with IDs starting with "video-"
    const videoCheckboxes = document.querySelectorAll('input[id^="video-"]:checked');
    videoCheckboxes.forEach((cb) => {
      const checkbox = cb as HTMLInputElement;
      const label = document.querySelector(`label[for="${checkbox.id}"]`);
      if (label) {
        const name = label.textContent?.trim() || "";
        const prices: { [key: string]: number } = {
          "Cinematic Walkthrough": 499,
          "Drone Video": 599,
        };
        const price = prices[name] || 0;
        if (price > 0 && name) {
          selectedVideos.push({ category: "Video", name, price });
        }
      }
    });

    setOrderItems((prev) => prev.filter((item) => item.category !== "Video").concat(selectedVideos));
  };

  const handleSaveDateSelection = async () => {
    const dateInput = document.getElementById("customDate") as HTMLInputElement;
    const timeSelect = document.querySelector('[data-value="flush-collapseSix"] select') as HTMLSelectElement;
    
    if (dateInput?.value) {
      const dateStr = dateInput.value;
      setSelectedDateStr(dateStr);
      // Load time slots for selected date
      await loadDateTimeSlots(dateStr);
      
      if (timeSelect?.value) {
      const timeText = timeSelect.options[timeSelect.selectedIndex]?.text || "";
        setSelectedTimeSlot(timeText);
      // Update existing items with date/time
      setOrderItems((prev) =>
        prev.map((item) => ({
          ...item,
            date: `${dateStr} - ${timeText}`,
        }))
      );
      }
    }
  };

  const removeOrderItem = (category: string, name: string) => {
    setOrderItems((prev) => {
      const filtered = prev.filter((item) => !(item.category === category && item.name === name));
      // Recalculate total when item is removed
      calculateTotalAmountForServices(filtered);
      return filtered;
    });
  };

  const calculateTotal = () => {
    // Use calculated amount from API if available, otherwise calculate from items
    if (calculatedAmount?.totalamount) {
      return Number(calculatedAmount.totalamount);
    }
    return orderItems.reduce((sum, item) => sum + item.price, 0);
  };

  // Helper functions to check if sections are filled
  const isListingDetailsFilled = () => {
    return !!(listingAddress && homesize);
  };

  const isCategoryFilled = (categoryName: string) => {
    return orderItems.some(item => 
      item.category.toLowerCase() === categoryName.toLowerCase()
    );
  };

  const isDateTimeFilled = () => {
    if (dateTimePreference === "asap" || dateTimePreference === "contact") {
      return true;
    }
    if (dateTimePreference === "same") {
      return !!(selectedDateStr && selectedTimeSlot);
    }
    if (dateTimePreference === "different") {
      return orderItems.every(item => item.date);
    }
    return false;
  };

  const [paymentFieldsFilled, setPaymentFieldsFilled] = useState(false);

  // Check payment fields periodically
  useEffect(() => {
    const checkPaymentFields = () => {
      const cardnumberInput = document.getElementById("cardnumber") as HTMLInputElement;
      const expirydateInput = document.getElementById("expirydate") as HTMLInputElement;
      const cvvInput = document.getElementById("cvv") as HTMLInputElement;
      const holdernameInput = document.getElementById("holdername") as HTMLInputElement;
      
      const isFilled = !!(
        cardnumberInput?.value && 
        validateCardNumber(cardnumberInput.value) &&
        expirydateInput?.value && 
        validateExpiryDate(expirydateInput.value) &&
        cvvInput?.value &&
        holdernameInput?.value
      );
      
      setPaymentFieldsFilled(isFilled);
    };

    // Check on mount and set up interval to check periodically
    checkPaymentFields();
    const interval = setInterval(checkPaymentFields, 500);
    
    // Also check on input events
    const cardnumberInput = document.getElementById("cardnumber");
    const expirydateInput = document.getElementById("expirydate");
    const cvvInput = document.getElementById("cvv");
    const holdernameInput = document.getElementById("holdername");
    
    [cardnumberInput, expirydateInput, cvvInput, holdernameInput].forEach(input => {
      if (input) {
        input.addEventListener("input", checkPaymentFields);
        input.addEventListener("blur", checkPaymentFields);
      }
    });

    return () => {
      clearInterval(interval);
      [cardnumberInput, expirydateInput, cvvInput, holdernameInput].forEach(input => {
        if (input) {
          input.removeEventListener("input", checkPaymentFields);
          input.removeEventListener("blur", checkPaymentFields);
        }
      });
    };
  }, []);

  const isPaymentFilled = () => {
    return paymentFieldsFilled;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="w-full p-0 bg-black">
        <div className="flex flex-wrap m-0">
          {/* Main Content - Left Side (9 columns on desktop) */}
          <div className="w-full md:w-9/12 p-0">
            {/* Hero Section */}
            <div
              className="new-bg-1 w-full relative"
              style={{
                backgroundImage: `url(${heroBg})`,
                backgroundSize: "cover",
                backgroundPosition: "center center",
                height: "60vh",
                minHeight: "200px",
              }}
            >
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative h-full flex flex-col justify-end p-6 md:p-8 z-10">
                <div className="overlay-1">
                  <h1 className="text-white text-[32px] md:text-[40px] lg:text-[40px] font-semibold leading-tight">
                    Let's book your appointment,
                    <br />
                    {userName ? capitalizeFirstLetter(userName) : "Chelsea"}
                  </h1>
                </div>
              </div>
            </div>
            <Accordion
              type="single"
              collapsible
              className="accordion-flush bg-black"
              value={openAccordion}
              onValueChange={(value) => {
                setOpenAccordion(value || "");
                // When an accordion opens, check if it's a category and load subcategories
                if (value && value.startsWith("category-")) {
                  const categoryIndex = parseInt(value.replace("category-", ""));
                  const category = categories[categoryIndex];
                  if (category) {
                    handleCategoryOpen(category.name);
                  }
                }
              }}
            >
              {/* Listing Details */}
              <AccordionItem value="flush-collapseOne" className="border-b border-white/20">
                <AccordionTrigger className="text-white hover:no-underline px-4 md:px-6 [&>svg]:hidden group">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>Listing Details</span>
                    <div className="flex items-center gap-2">
                      {isListingDetailsFilled() && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      <ChevronDown className="h-5 w-5 text-white/70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-4" style={{ backgroundColor: "#222023" }}>
                  <div className="form-section">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="icon-label flex-shrink-0">
                        <MapPin className="h-5 w-5 text-white/70" />
                      </span>
                      <div className="flex-grow" style={{ marginTop: "0.5rem" }}>
                        <Label htmlFor="address" className="text-white/70 mb-2 block" style={{ marginTop: "0.75rem" }}>
                          Listing Address
                        </Label>
                        <div className="relative">
                        <Input
                          type="text"
                          id="address"
                            placeholder="Select from your listings or type a Canada address..."
                            className="bg-black/40 border-white/20 text-white pr-10"
                            style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                            value={listingAddress}
                            onChange={(e) => handleAddressChange(e.target.value)}
                            onFocus={() => {
                              if (!selectedListingId) {
                                setUseGooglePlaces(true);
                              }
                            }}
                            list="my-listings-options"
                          />
                          {myListings && myListings.length > 0 && (
                            <datalist id="my-listings-options">
                              {myListings.map((tour) => (
                                <option
                                  key={tour.tourid}
                                  value={`${tour.address}${tour.city ? `, ${tour.city}` : ""}`}
                                  data-tourid={tour.tourid}
                                />
                              ))}
                            </datalist>
                          )}
                          {listingAddress && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <button
                                type="button"
                                onClick={() => {
                                  setListingAddress("");
                                  setSelectedListingId("");
                                  setUseGooglePlaces(true);
                                }}
                                className="text-white/50 hover:text-white"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                        {myListings && myListings.length > 0 && (
                          <p className="text-xs text-white/50 mt-1">
                            Select from your listings above or type a new address
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mb-4 flex items-center gap-3">
                      <span className="icon-label flex-shrink-0">
                        <Ruler className="h-5 w-5 text-white/70" />
                      </span>
                      <div className="flex-grow">
                        <Label htmlFor="size" className="text-white/70 mb-2 block" style={{ marginTop: "0.75rem" }}>
                          Approximate Size
                        </Label>
                        <Input
                          type="text"
                          style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                          id="size"
                          placeholder=" "
                          className="bg-black/40 border-white/20 text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          const addressInput = document.getElementById("address") as HTMLInputElement;
                          const sizeInput = document.getElementById("size") as HTMLInputElement;
                          if (addressInput) setListingAddress(addressInput.value);
                          if (sizeInput) setListingSize(sizeInput.value);
                          handleSaveListingDetails();
                          setListingDetailsSaved(true);
                          setOpenAccordion("");
                        }}
                        className={`border-2 border-white text-white px-4 py-2 rounded-md hover:bg-white/10 flex items-center gap-2 transition-colors ${
                          listingDetailsSaved ? "bg-green-400/30 border-green-400" : ""
                        }`}
                      >
                        <Check className="h-4 w-4" />
                        Save Selection
                      </button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Dynamic Category Sections */}
              {categories.map((category, categoryIndex) => {
                const categoryValue = `category-${categoryIndex}`;
                const subcategories = category.subcategories?.[category.name] || [];
                const isSelected = orderItems.some(item => 
                  item.category.toLowerCase() === category.name.toLowerCase()
                );

                return (
                  <AccordionItem 
                    key={category.name} 
                    value={categoryValue} 
                    className="border-b border-white/20"
                  >
                <AccordionTrigger className="text-white hover:no-underline px-4 md:px-6 [&>svg]:hidden group">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="capitalize">{category.name}</span>
                        <div className="flex items-center gap-2">
                          {isCategoryFilled(category.name) && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                          <ChevronDown className="h-5 w-5 text-white/70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-4" style={{ backgroundColor: "#222023" }}>
                      {loadingCategories ? (
                        <p className="text-white/70">Loading...</p>
                      ) : subcategories.length === 0 ? (
                        <p className="text-white/70">Please enter home size and save listing details first</p>
                      ) : (
                        <>
                  <h6 className="text-white mb-3">Select all that apply</h6>
                  <div className="flex flex-wrap gap-2 mb-3">
                            {subcategories.map((subcat, idx) => (
                              <div key={subcat.id} className="relative">
                          <input
                            type="checkbox"
                            className="peer hidden"
                                  id={`${categoryValue}-service-${subcat.id}`}
                                  checked={orderItems.some(item => 
                                    item.serviceId === subcat.id && 
                                    item.category.toLowerCase() === category.name.toLowerCase()
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      handleServiceSelect(category.name, subcat.id, subcat.name, false);
                                    } else {
                                      setOrderItems(prev => prev.filter(item => 
                                        !(item.serviceId === subcat.id && 
                                          item.category.toLowerCase() === category.name.toLowerCase())
                                      ));
                                    }
                                  }}
                        />
                        <label
                                  htmlFor={`${categoryValue}-service-${subcat.id}`}
                          className="btn-check-label px-4 py-2 border border-white/30 rounded-full text-sm cursor-pointer peer-checked:bg-[#b388ff] peer-checked:border-[#b388ff] peer-checked:text-white text-white/70 hover:border-white/50 transition-colors"
                        >
                                  {subcat.name}
                        </label>
                      </div>
                    ))}
                  </div>
                          
                          {/* Addons for this category */}
                          {subcategories.some(subcat => subcat.addon && subcat.addon.length > 0) && (
                            <>
                              <h6 className="text-white mb-3">{category.name} Extras</h6>
                  <div className="flex flex-wrap gap-2 mb-4">
                                {subcategories.map((subcat) => 
                                  subcat.addon?.map((addon) => {
                                    // Create unique identifier for this addon
                                    const uniqueAddonId = `${category.name}-${subcat.id}-addon-${addon.id}`;
                                    const isSelected = orderItems.some(item => 
                                      item.serviceId === addon.id && 
                                      item.type === "addon" &&
                                      item.category.toLowerCase() === category.name.toLowerCase()
                                    );
                                    
                                    return (
                                      <div key={uniqueAddonId} className="relative">
                                        <input
                                          type="checkbox"
                                          className="peer hidden"
                                          id={uniqueAddonId}
                                          checked={isSelected}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              handleServiceSelect(category.name, addon.id, addon.name, true);
                                            } else {
                                              setOrderItems(prev => {
                                                const filtered = prev.filter(item => 
                                                  !(item.serviceId === addon.id && 
                                                    item.type === "addon" &&
                                                    item.category.toLowerCase() === category.name.toLowerCase())
                                                );
                                                calculateTotalAmountForServices(filtered);
                                                return filtered;
                                              });
                                            }
                                          }}
                                        />
                                        <label
                                          htmlFor={uniqueAddonId}
                                          className="btn-check-label px-4 py-2 border border-white/30 rounded-full text-sm cursor-pointer peer-checked:bg-[#b388ff] peer-checked:border-[#b388ff] peer-checked:text-white text-white/70 hover:border-white/50 transition-colors"
                                        >
                                          {addon.name}
                                        </label>
                                      </div>
                                    );
                                  })
                                )}
                  </div>
                            </>
                          )}
                          
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => {
                                setOrderItems(prev => {
                                  const filtered = prev.filter(item => 
                                    item.category.toLowerCase() !== category.name.toLowerCase()
                                  );
                                  calculateTotalAmountForServices(filtered);
                                  return filtered;
                                });
                      }}
                      className="border border-white/30 text-white px-4 py-2 rounded-md hover:bg-white/10"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={async () => {
                        // Calculate and save prices for selected services in this category
                        const categoryItems = orderItems.filter(item => 
                          item.category.toLowerCase() === category.name.toLowerCase()
                        );
                        if (categoryItems.length > 0) {
                          await calculateTotalAmountForServices(categoryItems);
                        }
                        setCategorySaved(prev => ({ ...prev, [category.name]: true }));
                        setOpenAccordion("");
                      }}
                      className={`border-2 border-white text-white px-4 py-2 rounded-md hover:bg-white/10 flex items-center gap-2 transition-colors ${
                        categorySaved[category.name] ? "bg-green-400/30 border-green-400" : ""
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      Save Selection
                    </button>
                  </div>
                        </>
                      )}
                </AccordionContent>
              </AccordionItem>
                );
              })}

              {/* Date / Time Preference */}
              <AccordionItem value="flush-collapseSix" className="border-b border-white/20">
                <AccordionTrigger className="text-white hover:no-underline px-4 md:px-6 [&>svg]:hidden group">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>Date / Time Preference</span>
                    <div className="flex items-center gap-2">
                      {isDateTimeFilled() && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      <ChevronDown className="h-5 w-5 text-white/70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-4" style={{ backgroundColor: "#222023" }}>
                  <Select value={dateTimePreference} onValueChange={setDateTimePreference}>
                    <SelectTrigger className="mb-5 bg-black/40 border-white/20 text-white" style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem", marginTop: "0.75rem" }}>
                      <SelectValue placeholder="Please select one" />
                    </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asap">As soon as possible</SelectItem>
                      <SelectItem value="same">Schedule services at the same time</SelectItem>
                      <SelectItem value="different">Different days for my services</SelectItem>
                      <SelectItem value="contact">Contact my seller</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Schedule services at the same time */}
                  {dateTimePreference === "same" && (
                  <div className="mt-6">
                    <h5 className="text-white mb-4">Schedule services at the same time</h5>
                    <div className="form-check mb-4">
                      <input
                        className="form-check-input mr-2"
                        type="checkbox"
                        id="scheduleAllSameTime"
                        style={{ accentColor: "#b388ff" }}
                      />
                      <label className="form-check-label text-white" htmlFor="scheduleAllSameTime">
                        I want my services scheduled at the same time, if possible
                      </label>
                    </div>
                    <hr className="my-4 border-white/20" />
                    <div className="flex flex-wrap gap-3">
                      <div className="w-full md:w-4/12">
                        <Label className="form-label text-white w-100" style={{ marginTop: "0.75rem" }}>All Services</Label>
                      </div>
                      <div className="w-full md:w-4/12">
                        <div className="input-group">
                          <Input
                            type="date"
                            id="customDate"
                            className="form-control bg-black/40 border-white/20 text-white cursor-pointer"
                            placeholder="YYYY-MM-DD"
                            style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem", cursor: "pointer" }}
                            onClick={(e) => {
                              // Open date picker on click (requires user gesture)
                              const target = e.target as HTMLInputElement;
                              if (target && 'showPicker' in target && typeof target.showPicker === 'function') {
                                try {
                                  target.showPicker();
                                } catch (error) {
                                  // If showPicker fails, just focus the input
                                  target.focus();
                                }
                              } else {
                                // Focus the input if showPicker is not available
                                target.focus();
                              }
                            }}
                            onChange={async (e) => {
                              const dateStr = e.target.value;
                              if (dateStr) {
                                setSelectedDateStr(dateStr);
                                await loadDateTimeSlots(dateStr);
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-full md:w-4/12">
                        <div className="input-group">
                          <Select 
                            value={selectedTimeSlot}
                            onValueChange={(value) => {
                              setSelectedTimeSlot(value);
                              if (selectedDateStr) {
                                setOrderItems((prev) =>
                                  prev.map((item) => ({
                                    ...item,
                                    date: `${selectedDateStr} - ${value}`,
                                  }))
                                );
                              }
                            }}
                          >
                            <SelectTrigger className="bg-black/40 border-white/20 text-white">
                              <SelectValue placeholder="Choose..." />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.length > 0 ? (
                                timeSlots.map((slot, idx) => (
                                  <SelectItem key={idx} value={`${slot.slotStart} - ${slot.slotEnd}`}>
                                    {slot.slotStart} - {slot.slotEnd}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-2 py-1.5 text-sm text-white/50">Select date first</div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <hr className="my-4 border-white/20" />
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => {
                          handleSaveDateSelection();
                          setDateTimeSameSaved(true);
                          setOpenAccordion("");
                        }}
                        className={`border-2 border-white text-white px-4 py-2 rounded-md hover:bg-white/10 flex items-center gap-2 transition-colors ${
                          dateTimeSameSaved ? "bg-green-400/30 border-green-400" : ""
                        }`}
                      >
                        <Check className="h-4 w-4" />
                        Save Selection
                      </button>
                    </div>
                  </div>
                  )}

                  {/* Different days for my services */}
                  {dateTimePreference === "different" && (
                  <div className="mt-8">
                    <h5 className="text-white mb-4">Different days for my services</h5>
                    {orderItems.length === 0 ? (
                      <p className="text-white/70">Please select services first</p>
                    ) : (
                      <div className="space-y-6">
                        {orderItems.map((item, itemIdx) => {
                          const serviceKey = `${item.category}-${item.serviceId}`;
                          const serviceDate = serviceDates[serviceKey]?.date || "";
                          const serviceTimeSlot = serviceDates[serviceKey]?.timeSlot || "";
                          const slotsForService = serviceTimeSlots[serviceKey] || [];

                          return (
                            <div key={itemIdx} className="flex flex-wrap gap-4 mb-6">
                              <div className="w-full md:w-6/12">
                                <div className="card-1 bg-black/40 border border-white/20 rounded-lg p-4">
                                  <h5 className="text-white mb-3 flex items-center gap-2">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="24"
                                      height="24"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#B08BC0"
                                      strokeWidth="1.5"
                                    >
                                      <path d="M2 12c0-3.771 0-5.657 1.172-6.828S6.229 4 10 4h4c3.771 0 5.657 0 6.828 1.172S22 8.229 22 12v2c0 3.771 0 5.657-1.172 6.828S17.771 22 14 22h-4c-3.771 0-5.657 0-6.828-1.172S2 17.771 2 14z" />
                                      <path strokeLinecap="round" d="M7 4V2.5M17 4V2.5" />
                                      <circle cx="16.5" cy="16.5" r="1.5" />
                                      <path strokeLinecap="round" d="M2.5 9h19" />
                                    </svg>
                                    &nbsp;&nbsp;{item.name}
                                  </h5>
                                  <Input
                                    type="date"
                                    className="form-control bg-black/40 border-white/20 text-white mb-4 cursor-pointer"
                                    style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem", cursor: "pointer" }}
                                    value={serviceDate}
                                    onClick={(e) => {
                                      // Open date picker on click (requires user gesture)
                                      const target = e.target as HTMLInputElement;
                                      if (target && 'showPicker' in target && typeof target.showPicker === 'function') {
                                        try {
                                          target.showPicker();
                                        } catch (error) {
                                          // If showPicker fails, just focus the input
                                          target.focus();
                                        }
                                      } else {
                                        // Focus the input if showPicker is not available
                                        target.focus();
                                      }
                                    }}
                                    onChange={async (e) => {
                                      const dateStr = e.target.value;
                                      if (dateStr) {
                                        setServiceDates(prev => ({
                                          ...prev,
                                          [serviceKey]: { ...prev[serviceKey], date: dateStr, timeSlot: "" }
                                        }));
                                        // Load time slots for this date
                                        try {
                                          const data = await getDateTimeSlots({ date: dateStr });
                                          if (data.status && data.timeSlots) {
                                            setServiceTimeSlots(prev => ({
                                              ...prev,
                                              [serviceKey]: data.timeSlots || []
                                            }));
                                          }
                                        } catch (error) {
                                          console.error("Failed to load time slots", error);
                                        }
                                      }
                                    }}
                                  />
                                  {slotsForService.length > 0 && (
                                    <Select
                                      value={serviceTimeSlot}
                                      onValueChange={(value) => {
                                        setServiceDates(prev => ({
                                          ...prev,
                                          [serviceKey]: { ...prev[serviceKey], timeSlot: value }
                                        }));
                                        // Update order item with date and time
                                        setOrderItems(prev => prev.map((orderItem, idx) => 
                                          idx === itemIdx 
                                            ? { ...orderItem, date: `${serviceDate} - ${value}` }
                                            : orderItem
                                        ));
                                      }}
                                    >
                                      <SelectTrigger className="bg-black/40 border-white/20 text-white" style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
                                        <SelectValue placeholder="Select time slot" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {slotsForService.map((slot, idx) => (
                                          <SelectItem key={idx} value={`${slot.slotStart} - ${slot.slotEnd}`}>
                                            {slot.slotStart} - {slot.slotEnd}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                      <button 
                        onClick={() => {
                          // Save all service dates and times
                          orderItems.forEach((item, idx) => {
                            const serviceKey = `${item.category}-${item.serviceId}`;
                            const serviceDate = serviceDates[serviceKey]?.date || "";
                            const serviceTimeSlot = serviceDates[serviceKey]?.timeSlot || "";
                            if (serviceDate && serviceTimeSlot) {
                              setOrderItems(prev => prev.map((orderItem, itemIdx) => 
                                itemIdx === idx 
                                  ? { ...orderItem, date: `${serviceDate} - ${serviceTimeSlot}` }
                                  : orderItem
                              ));
                            }
                          });
                          setDateTimeDifferentSaved(true);
                          setOpenAccordion("");
                        }}
                        className={`border-2 border-white text-white px-4 py-2 rounded-md hover:bg-white/10 flex items-center gap-2 transition-colors ${
                          dateTimeDifferentSaved ? "bg-green-400/30 border-green-400" : ""
                        }`}
                      >
                        <Check className="h-4 w-4" />
                        Save Selection
                      </button>
                    </div>
                  </div>
                  )}

                  {/* Contact my seller */}
                  {dateTimePreference === "contact" && (
                  <div className="mt-8">
                    <h5 className="text-white mb-4">Contact my seller</h5>
                    <div className="form-section">
                      <div className="mb-4">
                        <Label htmlFor="seller" className="text-white/70 mb-2 block" style={{ marginTop: "0.75rem" }}>
                          Seller Name
                        </Label>
                        <Input
                          type="text"
                          id="seller"
                          defaultValue="Chelsea"
                          className="bg-black/40 border-white/20 text-white"
                          style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                        />
                      </div>
                      <div className="mb-4">
                        <Label htmlFor="phone" className="text-white/70 mb-2 block" style={{ marginTop: "0.75rem" }}>
                          Phone Number
                        </Label>
                        <Input
                          type="text"
                          id="phone"
                          defaultValue="778-650-0509"
                          className="bg-black/40 border-white/20 text-white"
                          style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                        />
                      </div>
                      <div className="mb-4">
                        <Label htmlFor="seller-notes" className="text-white/70 mb-2 block" style={{ marginTop: "0.75rem" }}>
                          Additional Notes
                        </Label>
                        <Input
                          type="text"
                          id="seller-notes"
                          defaultValue="Call in the afternoon"
                          className="bg-black/40 border-white/20 text-white"
                          style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                        />
                      </div>
                      <div className="text-end">
                        <button className="save-btn bg-[#b388ff] hover:bg-[#b388ff]/80 text-white px-6 py-2 rounded-full font-semibold flex items-center gap-2 mx-auto md:mx-0">
                          <Check className="h-4 w-4" />
                          CONFIRM SELECTION
                        </button>
                      </div>
                    </div>
                  </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Payment */}
              <AccordionItem value="flush-collapseSeven" className="border-b border-white/20">
                <AccordionTrigger className="text-white hover:no-underline px-4 md:px-6 [&>svg]:hidden group">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>Payment</span>
                    <div className="flex items-center gap-2">
                      {isPaymentFilled() && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      <ChevronDown className="h-5 w-5 text-white/70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-4" style={{ backgroundColor: "#222023" }}>
                  <div className="flex flex-wrap">
                    <div className="w-full md:w-6/12 mb-4">
                      <Label htmlFor="cardnumber" className="text-white/70 mb-2 block" style={{ marginTop: "0.75rem" }}>
                        Card Number*
                      </Label>
                      <Input
                        id="cardnumber"
                        type="text"
                        required
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        onChange={handleCardNumberChange}
                        onBlur={handleCardNumberBlur}
                        className={`bg-black/40 border-white/20 text-white ${cardNumberError ? "border-red-500" : ""}`}
                        style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                      />
                      {cardNumberError && (
                        <p className="text-red-500 text-sm mt-1">{cardNumberError}</p>
                      )}
                    </div>
                    <div className="w-full md:w-3/12 mb-4">
                      <Label htmlFor="expirydate" className="text-white/70 mb-2 block" style={{ marginTop: "0.75rem" }}>
                        Exp Date*
                      </Label>
                      <Input
                        type="text"
                        id="expirydate"
                        placeholder="MM/YY"
                        maxLength={5}
                        onChange={handleExpiryDateChange}
                        onBlur={handleExpiryDateBlur}
                        required
                        className={`bg-black/40 border-white/20 text-white ${expiryDateError ? "border-red-500" : ""}`}
                        style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                      />
                      {expiryDateError && (
                        <p className="text-red-500 text-sm mt-1">{expiryDateError}</p>
                      )}
                    </div>
                    <div className="w-full md:w-3/12 mb-4">
                      <Label htmlFor="cvv" className="text-white/70 mb-2 block" style={{ marginTop: "0.75rem" }}>
                        CVV*
                      </Label>
                      <Input
                        type="text"
                        id="cvv"
                        required
                        className="bg-black/40 border-white/20 text-white"
                        style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                      />
                    </div>
                    <div className="w-full md:w-6/12 mb-4">
                      <Label htmlFor="countryname" className="text-white/70 mb-2 block" style={{ marginTop: "0.75rem" }}>
                        Country
                      </Label>
                      <Select defaultValue="canada">
                        <SelectTrigger className="bg-black/40 border-white/20 text-white" style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="canada">Canada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full md:w-6/12 mb-4">
                      <Label htmlFor="postalcode" className="text-white/70 mb-2 block" style={{ marginTop: "0.75rem" }}>
                        Postal Code
                      </Label>
                      <Input
                        type="text"
                        name="postalcode"
                        id="postalcode"
                        required
                        className="bg-black/40 border-white/20 text-white"
                        style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                      />
                    </div>
                    <div className="w-full md:w-6/12 mb-4">
                      <Label htmlFor="holdername" className="text-white/70 mb-2 block" style={{ marginTop: "0.75rem" }}>
                        Card Holder Name*
                      </Label>
                      <Input
                        type="text"
                        name="holdername"
                        id="holdername"
                        required
                        className="bg-black/40 border-white/20 text-white"
                        style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                      />
                    </div>
                    <div className="w-full md:w-6/12 mb-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="savecarddetails"
                          className="h-4 w-4 rounded border border-white/40 bg-black/60"
                          style={{ accentColor: "#b388ff" }}
                        />
                        <Label htmlFor="savecarddetails" className="text-white/70">
                          Save card details
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap">
                    <div className="w-full md:w-6/12 pt-2">
                      <img src={cardImg} width="120" alt="Accepted cards" />
                    </div>
                  </div>
                  <div className="text-end mt-4">
                    <button className="save-btn bg-[#b388ff] hover:bg-[#b388ff]/80 text-white px-6 py-2 rounded-full font-semibold flex items-center gap-2 mx-auto md:mx-0">
                      <Check className="h-4 w-4" />
                      SAVE
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Right Sidebar - Order Summary (3 columns on desktop) */}
          <div className="w-full md:w-3/12 p-0" style={{ backgroundColor: "#463953" }}>
            <aside className="px-3 pt-3 pb-6">
              <div>
                <h4 className="text-white pt-8 mb-4">Your Order</h4>
                {(listingAddress || listingSize) && (
                  <div className="card mb-4 mt-4 shadow-none bg-black/40 border border-white/20 rounded-lg">
                    <div className="card-body p-3">
                      {listingAddress && (
                        <>
                          <p className="mb-0 text-white/70 text-sm">Listing Address</p>
                          <p className="text-sm text-white mb-2">{listingAddress}</p>
                        </>
                      )}
                      {listingSize && (
                        <>
                          <p className="mb-0 text-white/70 text-sm">Approximate Size</p>
                          <p className="text-sm text-white mb-0">{listingSize}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Category Sections - Only show categories with selected items */}
              {categories
                .filter((category) => {
                  const categoryItems = orderItems.filter(item => 
                    item.category.toLowerCase() === category.name.toLowerCase()
                  );
                  return categoryItems.length > 0;
                })
                .map((category) => {
                  const categoryItems = orderItems.filter(item => 
                    item.category.toLowerCase() === category.name.toLowerCase()
                  );
                  
                  return (
                    <div key={category.name}>
                      <div className="price-section mb-4">
                        <h6 className="text-white mb-3 capitalize">{category.name}</h6>
                        {categoryItems.map((item, idx) => (
                          <div key={idx} className="flex item justify-between mb-2">
                            <div className="text-white/70 text-sm">{item.name}</div>
                            <div className="flex items-center">
                              <span className="me-2 text-white text-sm">${item.price.toFixed(2)}</span>
                              <span 
                                onClick={() => removeOrderItem(item.category, item.name)}
                                className="remove-icon text-white/70 cursor-pointer hover:text-white"
                              >
                                &times;
                              </span>
                            </div>
                          </div>
                        ))}
                        {categoryItems.some(item => item.date) && (
                          <div className="mt-3">
                            <small className="text-white/70">Preferred Date</small>
                            <br />
                            <span className="text-orange-400 text-sm font-semibold">
                              {categoryItems.find(item => item.date)?.date || "To be selected"}
                            </span>
                          </div>
                        )}
                      </div>
                      <hr className="border-white/20 my-4" />
                    </div>
                  );
                })}

              {/* Total */}
              <div className="text-end total mb-4">
                <span className="text-white/70">EST. TOTAL</span>
                &nbsp;&nbsp;
                <span className="text-white font-bold text-lg">${calculateTotal().toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-end pb-3 mb-4">
                <span className="text-white/70 text-xs text-end">
                  Final price will be invoiced upon completed services
                </span>
              </div>
              <div className="mb-4 additional">
                <Textarea
                  rows={5}
                  placeholder="Additional notes about your order..."
                  className="bg-black/40 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              <div className="mb-4">
                <button 
                  onClick={handleSubmitOrder}
                  disabled={submittingOrder}
                  className="btn btn-custom w-full text-white px-6 py-3 rounded-full font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#302639" }}
                >
                  {submittingOrder ? "Submitting..." : "Book appointment"}
                </button>
              </div>
            </aside>
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
