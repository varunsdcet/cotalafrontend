const API_ORIGIN = "https://cotala.com/newcotala24/webapi2025dec/api/";
const USE_API_PROXY = false;
const BASE_URL = import.meta.env.DEV && USE_API_PROXY ? "/cotala-api/" : API_ORIGIN;

export const STRIPE_TEST_MODE = false;
export const STRIPE_TEST_PUBLISHABLE_KEY =
  "pk_test_51N2urcSEGxiAYHo20hdV3ZfwgVG1SbNa83dWx2PaHVze2ka2wZS0P2mg5o9wgTvLFhwWLxjDEA7nB34YVRLRrpio00Ndi9mGbi";

// Local storage helpers (needed for user_id retrieval)
const TOKEN_KEY = "cotala_token";
const USER_ID_KEY = "cotala_user_id";
const USER_KEY = "cotala_user";

export function getUserIdFromStorage(): string | null {
  const direct = localStorage.getItem(USER_ID_KEY);
  if (direct) return direct;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as {
      user_id?: string | number;
      id?: string | number;
      customerid?: string | number;
      agent?: string | number;
    };
    const id = user.user_id || user.id || user.customerid || user.agent;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

async function getJson<TResponse>(path: string, includeUserId: boolean = true): Promise<TResponse> {
  const headers: HeadersInit = {};
  
  // For GET requests that need user_id, convert to POST with user_id in body
  // (since GET requests cannot have a body)
  if (includeUserId) {
    const user_id = getUserIdFromStorage();
    if (user_id) {
      // Convert to POST with user_id in body
      const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id }),
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      return res.json() as Promise<TResponse>;
    }
  }

  // Regular GET request without user_id
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  return res.json() as Promise<TResponse>;
}

async function postJson<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  includeUserId: boolean = true
): Promise<TResponse> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  let requestBody = body;
  
  if (includeUserId) {
    const user_id = getUserIdFromStorage();
    if (user_id) {
      // Add user_id to request body
      requestBody = {
        ...(body as object),
        user_id,
      } as TBody;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as TResponse;
  } catch {
    throw new Error(`Request failed with status ${res.status}`);
  }
}

// Types are based on the shapes you described; adjust if backend differs.
export interface LoginPayload {
  realtor_id: string;
  password: string;
}

export interface SignupPayload {
  region: string;
  realter_id: string;
  email: string;
  username: string;
  password: string;
}

export interface ForgotPasswordPayload {
  realter_id: string;
}

export interface ApiAuthResponse {
  status: boolean;
  msg?: string;
  token?: string;
  userdetails?: unknown;
  list?: unknown[];
}

export function loginCheckUser(body: LoginPayload) {
  // Backend path inferred from your description: "check-user"
  return postJson<ApiAuthResponse, LoginPayload>("verify/check-user", body, false);
}

export function getRegion() {
  // Region / country list should be fetched via GET
  // No token required - used on register/settings page for region selection
  return getJson<ApiAuthResponse>("get-region", false);
}

export function signupVerify(body: SignupPayload) {
  // "new-signup" endpoint
  return postJson<ApiAuthResponse, SignupPayload>("new-signup", body, false);
}

export function forgotPassword(body: ForgotPasswordPayload) {
  // "forget-password" endpoint
  return postJson<ApiAuthResponse, ForgotPasswordPayload>("forget-password", body, false);
}

// Local storage helpers (web replacement for AsyncStorage*)
export function saveAuthToStorage(token?: string, userdetails?: unknown, user_id?: string) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (user_id) {
    localStorage.setItem(USER_ID_KEY, user_id);
  }
  if (userdetails) {
    localStorage.setItem(USER_KEY, JSON.stringify(userdetails));
    // Try to extract user_id from userdetails if not provided
    if (!user_id && userdetails) {
      try {
        const user = userdetails as any;
        const extractedUserId = user.user_id || user.id || user.customerid || user.agent;
        if (extractedUserId) {
          localStorage.setItem(USER_ID_KEY, String(extractedUserId));
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }
}

export function clearAuthFromStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_KEY);
}

export function hasAuthToken(): boolean {
  return !!getUserIdFromStorage();
}

// Order-related API interfaces
/** Dashboard `getMyListings` may return `url2` (broker logo); home persists it for feature-listing. */
export const COTALA_MY_LISTINGS_URL2_KEY = "cotala_my_listings_url2";

export interface MyListingsResponse {
  status: boolean;
  message?: string;
  imagepath?: string;
  /** Broker / office logo URL (same source as home-2 `setDynamicLogo`). */
  url2?: string | null;
  tours?: Array<{
    tourid: string | number;
    address: string;
    city: string;
    multipleimages?: string[];
    [key: string]: unknown;
  }>;
  upcomingservice?: UpcomingService[];
}

export interface PhotographerResponse {
  status: boolean;
  message?: string;
  list?: Array<{
    fname: string;
    lname: string;
    image: string;
    bio: string;
    total_years: number | string;
    multipleimages?: string[];
  }>;
}

export interface CategoryResponse {
  status: boolean;
  msg?: string;
  message?: string;
  list?: Array<{
    name: string;
    image: string;
  }>;
}

export interface SubCategoryNewPayload {
  category: string[];
  homesize: string;
}

export interface SubCategoryNewResponse {
  status: boolean;
  message?: string;
  list?: {
    [key: string]: Array<{
      id: string | number;
      name: string;
      is_selected?: string;
      addon?: Array<{
        id: string | number;
        name: string;
        is_selected?: string;
      }>;
    }>;
  };
}

export interface SubCategoryAddonPayload {
  category: string[];
  homesize: string;
}

export interface SubCategoryAddonResponse {
  status: boolean;
  message?: string;
  list?: Array<{
    id: string | number;
    name: string;
    type: string;
  }>;
}

export interface DateTimeSlotsPayload {
  date: string; // Format: YYYY-MM-DD
}

export interface DateTimeSlotsResponse {
  status: boolean;
  message?: string;
  timeSlots?: Array<{
    slotStart: string;
    slotEnd: string;
  }>;
}

export interface ServiceArrayItem {
  service: string | number;
  qty: number;
  rush: "yes" | "no";
  type: string;
  rush_option: string;
  name: string;
  totalamount: string | number;
  customer_preferred?: string; // "alltime", "seller", or date string
  customer_preferred_datestarttime?: string; // Format: "2018-06-19 16:18:32"
  customer_preferred_dateendtime?: string; // Format: "2018-06-19 16:18:32"
}

export interface TotalAmountCalculatePayload {
  servicearray: ServiceArrayItem[];
}

export interface TotalAmountCalculateResponse {
  status: boolean;
  message?: string;
  paymentgatewayamount?: number | string;
  totalamount?: number | string;
  servicearray?: Array<{
    service: string | number;
    qty: number;
    rush: string;
    type: string;
    rush_option: string;
    name: string;
    totalamount: string | number;
  }>;
}

export interface AddOrderPayload {
  address: string;
  amount: number;
  cardnumber: string;
  city: string;
  cvv: string;
  date: string;
  time: string;
  end_time: string;
  expirydate: string;
  holdername: string;
  homesize: string;
  is_same_date: boolean;
  lotsize: string;
  notes: string;
  photographer: string;
  savecarddetails: boolean;
  servicearray: ServiceArrayItem[];
  total: number;
  tour_id?: string | number;
}

export interface AddOrderResponse {
  status: boolean;
  message?: string;
  [key: string]: unknown;
}

// Order-related API functions
export function getMyListings() {
  // my-listings is a POST API
  return postJson<MyListingsResponse, Record<string, never>>("my-listings", {});
}

export function getPhotographer() {
  return getJson<PhotographerResponse>("photographer");
}

export function getCategory() {
  // Category API is GET without token
  return getJson<CategoryResponse>("catgeory", false);
}

export function getSubCategoryNew(body: SubCategoryNewPayload) {
  return postJson<SubCategoryNewResponse, SubCategoryNewPayload>("sub-catgeory-new", body);
}

export function getSubCategoryAddon(body: SubCategoryAddonPayload) {
  return postJson<SubCategoryAddonResponse, SubCategoryAddonPayload>("sub-catgeory-addon", body);
}

export function getDateTimeSlots(body: DateTimeSlotsPayload) {
  return postJson<DateTimeSlotsResponse, DateTimeSlotsPayload>("datetime-slots", body);
}

export function calculateTotalAmount(body: TotalAmountCalculatePayload) {
  return postJson<TotalAmountCalculateResponse, TotalAmountCalculatePayload>("total-amount-calculate", body);
}

export function addOrder(body: AddOrderPayload) {
  return postJson<AddOrderResponse, AddOrderPayload>("add-order", body);
}

// Profile API – agency is nested inside user_profile in response
export interface AgencyDetails {
  id?: number;
  code?: string;
  name?: string;
  phone?: string;
  address?: string;
  street?: string;
  city?: string;
  province?: string;
  postal?: string;
  email?: string;
  url?: string;
  [key: string]: unknown;
}

export interface UserProfile {
  id: number;
  status: string;
  username: string;
  name: string;
  salutation?: string;
  email: string;
  adminemail?: string;
  phone?: string;
  cell?: string;
  adminphone?: string;
  url?: string;
  joined?: string;
  unit?: string;
  street?: string;
  city?: string;
  province?: string;
  postal?: string;
  instagram?: string;
  twitter?: string;
  social?: string;
  shipping?: string;
  shippingnote?: string;
  pref_photos?: string;
  standardpackagefiltered?: Array<{
    id: number;
    name: string;
    qty?: string;
  }>;
  agencydetails?: AgencyDetails;
  [key: string]: unknown;
}

export interface GetProfileResponse {
  status: boolean;
  message?: string;
  user_profile?: UserProfile;
}

export function getProfile() {
  // user/get-profile is a POST API with user_id in body
  return postJson<GetProfileResponse, Record<string, never>>("user/get-profile", {});
}

/** Partial profile update — send only keys that changed (avoids unique-email validation on unchanged fields). */
export interface UpdateProfileResponse {
  status?: boolean;
  message?: string;
  msg?: string;
  errors?: Record<string, string[]>;
}

export function updateProfile(partialFields: Record<string, string>) {
  return postJson<UpdateProfileResponse, Record<string, string>>("profile/update", partialFields, true);
}

// My Orders API
export interface TourDetails {
  tourid: number;
  orderid: string;
  numpics: number;
  numpans: number;
  unit: string;
  address: string;
  city: string;
  postal: string;
  subarea: string;
  agent: string;
  customerid: number;
  listingagent: string;
  colisted: string;
  agent2: string;
  description: string;
  siteinfluences: string;
  complex: string;
  beds: string;
  baths: string;
  sqft: string;
  floors: string;
  style: string;
  type: string;
  highres: string;
  YouTube: string;
  video: string;
  videodownload: string;
  floorplan: string;
  floorplanorientation: string;
  floorplan3D: string;
  status: string;
  price: string;
  taxes: string;
  built: string;
  age: string;
  mls: string;
  lot: string;
  maint: string;
  music: string;
  photographer: string;
  videographer: string;
  measuretech: string;
  processed: string;
  created: string;
  size_as_serviced: string | null;
  inactivedate: string | null;
  sendtomls: string;
  MlsPhotoStatus: string;
  MlsFloorplanStatus: string;
  sentby: string;
  MlsPicks: string;
  MlsPicksSent: string;
  calPicks: string;
  notified: string;
  notesPhotographer: string;
  k: string;
}

export interface UpcomingService {
  id: number;
  invoice: string;
  po: string;
  customer: string;
  billto: string;
  billto2: string;
  billto3: string;
  billto4: string;
  status: string;
  split: string;
  sales: string;
  datecreated: string;
  datecompleted: string | null;
  datebilled: string | null;
  datelastemailed: string | null;
  timessent: number;
  datepaid: string | null;
  transactionID: string;
  subtotal: string;
  gst: string;
  pst: string;
  total: string;
  balance: string;
  notes: string;
  summary: string;
  recurring: string;
  k: string;
  schedule_date: string | null;
  bookdattimestamp: number;
  schedule_time: string | null;
  schedule_endtime: string | null;
  schedule_datetime?: string | null;
  is_same_date: string;
  technician: string | null;
  google_event_id: string | null;
  tourdetails: TourDetails;
}

export interface MyOrderResponse {
  status: boolean;
  upcomingservice?: UpcomingService[];
}

export interface MyOrderPayload {
  user_id: string;
}

export function getMyOrders(body: MyOrderPayload) {
  return postJson<MyOrderResponse, MyOrderPayload>("my-order", body, false);
}

// Order Details API
export interface ServiceDetails {
  id: number;
  name: string;
  frontendtitle: string;
  popup: string;
  code: string;
  makeshell: string;
  renews: string;
  sqft_min: string;
  sqft_max: string;
  timetocomplete: number;
  timetocomplete_1000sf: number | null;
  turnaround: string | null;
  description: string;
  defaultstatus: string;
  dept: string;
  type: string;
  category: string;
  display_category: string;
  calendartag: string | null;
  nullify: string | null;
  combo: string | null;
  internal: string;
  fulfillment: string | null;
  printaddons: string;
  pricingmodel: string;
  base: string;
  cpu: string;
  basecpu: string;
  ppu: string;
  tax: string;
  status: string;
  standard: string;
  premium: string;
  productimage: string;
}

export interface OrderServiceTourDetails {
  tourid: number;
  orderid: string;
  numpics: number;
  numpans: number;
  unit: string;
  address: string;
  city: string;
  postal: string;
  subarea: string;
  agent: string;
  customerid: number;
  listingagent: string;
  colisted: string;
  agent2: string;
  description: string;
  siteinfluences: string;
  complex: string | null;
  beds: string;
  baths: string;
  sqft: string;
  floors: string;
  style: string;
  type: string;
  highres: string;
  YouTube: string;
  video: string;
  videodownload: string;
  floorplan: string;
  floorplanorientation: string;
  floorplan3D: string;
  status: string;
  price: string;
  taxes: string;
  built: string;
  age: string;
  mls: string;
  lot: string;
  maint: string;
  music: string;
  photographer: string;
  videographer: string;
  measuretech: string;
  processed: string;
  created: string;
  size_as_serviced: string | null;
  inactivedate: string | null;
  sendtomls: string;
  MlsPhotoStatus: string;
  MlsFloorplanStatus: string;
  sentby: string;
  MlsPicks: string;
  MlsPicksSent: string;
  calPicks: string;
  notified: string;
  notesPhotographer: string;
  k: string;
}

export interface OrderService {
  id: number;
  orderid: number;
  tourid: string;
  printjobid: string;
  service: string;
  created: string;
  duedate: string | null;
  datecompleted: string;
  description: string;
  qty: string;
  notes: string;
  videofiles: string;
  status: string;
  version: string;
  rush: string;
  renews: string;
  technician: string;
  technician2: string;
  technician3: string;
  technician4: string;
  operator: string;
  sales: string;
  rate: string;
  price: string;
  gst: string;
  pst: string;
  total: string;
  cost: string;
  payment_deduct: number;
  card_point_log: string | null;
  payment_deduct_amount: string;
  rush_option: string | null;
  FloatingStart: string | null;
  google_start_date: string | null;
  google_end_date: string | null;
  customer_preferred: string | null;
  customer_preferred_datestarttime: string | null;
  customer_preferred_dateendtime: string | null;
  servicedetails: ServiceDetails;
  tourdetails: OrderServiceTourDetails;
}

export interface OrderDetailsData {
  id: number;
  invoice: string;
  po: string;
  customer: string;
  billto: string;
  billto2: string;
  billto3: string;
  billto4: string;
  status: string;
  split: string;
  sales: string;
  datecreated: string;
  datecompleted: string | null;
  datebilled: string | null;
  datelastemailed: string | null;
  timessent: number;
  datepaid: string | null;
  transactionID: string;
  subtotal: string;
  gst: string;
  pst: string;
  total: string;
  balance: string;
  notes: string;
  summary: string;
  recurring: string;
  k: string;
  schedule_date: string | null;
  bookdattimestamp: number;
  schedule_time: string | null;
  schedule_endtime: string | null;
  is_same_date: string | null;
  technician: string | null;
  google_event_id: string | null;
  mediashell: string;
}

export interface OrderDetailsResponse {
  status: boolean;
  order: OrderDetailsData;
  orderservice: OrderService[];
}

export interface OrderDetailsPayload {
  id: string | number;
  user_id: string;
}

export function getOrderDetails(body: OrderDetailsPayload) {
  return postJson<OrderDetailsResponse, OrderDetailsPayload>("order-details", body, false);
}

// Listing Details API
export interface ListingDetailsAgent {
  id: number;
  status: string;
  username: string;
  name: string;
  email: string;
  /** Sheet / tour branding from account (listing-details). */
  bgColour?: string;
  textColour?: string;
  /** Large headshot image URL (not the `headshot` yes/no flag). */
  coverimage?: string;
  headshot_url?: string;
  url?: string;
  [key: string]: unknown;
}

export interface ListingDetailsTour {
  tourid: number;
  orderid: string;
  numpics: number;
  numpans: number;
  address: string;
  city: string;
  postal: string;
  subarea: string;
  agent: string;
  mls: string;
  status: string;
  multipleimages?: string[];
  floorplanarray?: string[] | { pdf?: string; image1?: string; image2?: string; image3?: string; [key: string]: unknown };
  video?: string;
  videodownload?: string;
  YouTube?: string;
  virtual_tour?: string;
  [key: string]: unknown;
}

export interface ListingDetailsResponse {
  status: boolean;
  tour?: ListingDetailsTour;
  agent?: ListingDetailsAgent;
}

export interface ListingDetailsPayload {
  tourid: string | number;
  user_id: string;
}

export function getListingDetails(body: ListingDetailsPayload) {
  return postJson<ListingDetailsResponse, ListingDetailsPayload>("listing-details", body, false);
}

// Listing search by MLS or address (listingwithmlx2)
export interface ListingWithMlx2Payload {
  user_id: string;
  mls_or_address: string;
  page?: number;
}

export interface ListingWithMlx2Tour {
  tourid: number;
  orderid: string;
  numpics: number;
  address: string;
  city: string;
  mls: string;
  status: string;
  created?: string;
  multipleimages?: string[];
  [key: string]: unknown;
}

export interface ListingWithMlx2Agent {
  id: number;
  status: string;
  username: string;
  name: string;
  email: string;
  [key: string]: unknown;
}

export interface ListingWithMlx2Response {
  status: boolean;
  tours?: ListingWithMlx2Tour[];
  imagepath?: string;
  agent?: ListingWithMlx2Agent;
}

export function listingWithMlx2(body: ListingWithMlx2Payload) {
  return postJson<ListingWithMlx2Response, ListingWithMlx2Payload>("user/listingwithmlx2", body, false);
}

// Tour Statistics API
export interface TourStatsGraphData {
  labels: string[];
  data: string[];
}

export interface TourStatsResponse {
  status: boolean;
  onlinesince?: string;
  totalhits?: string;
  avgtotalhits?: string;
  bestday?: string;
  averageFirstWeek?: string;
  firstWeekViews?: string;
  weekly_graph?: TourStatsGraphData;
  monthly_graph?: TourStatsGraphData;
  three_month_graph?: TourStatsGraphData;
  six_month_graph?: TourStatsGraphData;
}

export interface TourStatsPayload {
  tourid: string | number;
  user_id: string;
}

export function getTourStats(body: TourStatsPayload) {
  return postJson<TourStatsResponse, TourStatsPayload>("user/my-tour-stats", body, false);
}

// User Home / Upcoming Services API
export interface UpcomingServiceTourDetails {
  tourid: number;
  address: string;
  city: string;
  unit?: string;
}

export interface UpcomingServiceItem {
  id: number;
  invoice: string;
  po: string;
  customer: string;
  billto: string;
  status: string;
  schedule_date: string;
  bookdattimestamp?: number;
  schedule_time: string;
  schedule_endtime: string;
  is_same_date: string | null;
  tourdetails: UpcomingServiceTourDetails;
  orderservice?: Array<{
    id: number;
    service: string;
    servicedetails?: {
      name: string;
      frontendtitle?: string;
    };
  }>;
  [key: string]: unknown;
}

export interface UserHomeResponse {
  status: boolean;
  upcomingservice?: UpcomingServiceItem[];
}

export interface UserHomePayload {
  device_id?: string;
  device_token?: string;
  device_type?: string;
  user_id: string;
}

export function getUserHome(body: UserHomePayload) {
  return postJson<UserHomeResponse, UserHomePayload>("user/home", body, false);
}

// Re-order API
export interface ReOrderPayload {
  orderid: string | number;
  user_id: string;
}

export interface ReOrderResponse {
  status: boolean;
  msg?: string;
  new_order_id?: string | number;
  data?: unknown;
}

export function reOrder(body: ReOrderPayload) {
  return postJson<ReOrderResponse, ReOrderPayload>("re-order", body, false);
}

/** Oversize Feature Sheet — `products.print` id (OFS). */
export const OVERSIZE_FEATURE_SHEET_PRINT_PRODUCT_ID = "19";

/** Row from `products.inventory` (stocks array in `product/print-options` response). */
export interface PrintInventoryStockRow {
  id: number;
  name: string;
  description: string;
  class?: string;
  status?: string;
  [key: string]: unknown;
}

/** Row from `products.print` (`productdetail` in API). */
export interface PrintProductRow {
  id: number;
  name: string;
  code: string;
  description: string;
  defaultstock: string;
  optionalstock: string;
  defaultcolour?: string;
  longedge?: string;
  shortedge?: string;
  [key: string]: unknown;
}

export interface PrintProductDetailsData {
  productdetail: PrintProductRow;
  stocks: PrintInventoryStockRow[];
  colours?: string[];
  default_stock?: string;
}

export interface PrintProductDetailsResponse {
  status: boolean;
  data?: PrintProductDetailsData;
  msg?: string;
}

/**
 * Print product + inventory stocks for checkout (matches `products.print` + `products.inventory`).
 * Request body: `{ user_id, prod: "19" }` — product id is fixed for oversize feature sheets.
 */
export function getPrintProductDetails() {
  return postJson<PrintProductDetailsResponse, { prod: string }>(
    "product/print-options",
    { prod: OVERSIZE_FEATURE_SHEET_PRINT_PRODUCT_ID },
    true
  );
}

export interface PortalApiResponse<T = unknown> {
  status: boolean;
  msg?: string;
  message?: string;
  data?: T;
  list?: unknown;
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export function getPortalDashboard() {
  return postJson<PortalApiResponse>("dashboard", {});
}

export function getOrderOptions(homesize: string | number) {
  return postJson<PortalApiResponse>("order/options", { homesize: String(homesize) });
}

export function createPortalOrder(body: Record<string, unknown>) {
  return postJson<PortalApiResponse>("order/addneworder", body);
}

export function getPortalOrders(params: { search?: string; status?: string; per_page?: number } = {}) {
  return postJson<PortalApiResponse>("orders", params);
}

export function getPortalOrderDetail(id: string | number) {
  return postJson<PortalApiResponse>("orders/detail", { id });
}

export function getPortalListingDetail(tourid: string | number) {
  return postJson<PortalApiResponse>("listings/detail", { tourid });
}

export function getPortalListings(params: { search?: string; status?: string; per_page?: number } = {}) {
  return postJson<PortalApiResponse>("listings/list", params);
}

export function getPortalProfile() {
  return postJson<PortalApiResponse>("profile/details", {});
}

export function savePortalProfile(fields: Record<string, unknown>) {
  return postJson<PortalApiResponse>("profile/save", fields);
}

export function getPreferenceMasterData() {
  return postJson<PortalApiResponse>("preferences/master-data", {});
}

export function savePortalPreferences(fields: Record<string, unknown>) {
  return postJson<PortalApiResponse>("preferences/save", fields);
}

export function changePortalPassword(current_password: string, password: string) {
  return postJson<PortalApiResponse>("profile/change-password", { current_password, password });
}

export function getDesignJobOptions(search = "") {
  return postJson<PortalApiResponse>("design-jobs/options", { search });
}

export function getProofDetail(id: string | number) {
  return postJson<PortalApiResponse>("proofs/detail", { id });
}

export function approveProof(id: string | number) {
  return postJson<PortalApiResponse>("proofs/approve", { id });
}

export function requestProofChanges(id: string | number, message: string) {
  return postJson<PortalApiResponse>("proofs/request-changes", { id, message });
}

export type PortalListing = {
  tourid: string | number;
  address?: string;
  city?: string;
  unit?: string;
  mls?: string;
  status?: string;
  cover_image?: string;
  full_address?: string;
  multipleimages?: string[];
  [key: string]: unknown;
};

export function listingImage(listing: PortalListing, fallback: string) {
  const photos = listing.multipleimages;
  if (Array.isArray(photos) && typeof photos[0] === "string" && photos[0].trim()) {
    return photos[0].trim();
  }
  if (listing.cover_image && String(listing.cover_image).trim()) {
    return String(listing.cover_image).trim();
  }
  return fallback;
}

export function getStripeConfig() {
  return postJson<PortalApiResponse>("payments/stripe/config", {});
}

export function saveStripeCustomer(stripe_customer_id: string) {
  return postJson<PortalApiResponse>("billing/stripe-customer/save", { stripe_customer_id });
}

export function getStripePaymentMethods() {
  return postJson<PortalApiResponse>("billing/payment-methods", {});
}

export function createStripeSetupIntent(fields: Record<string, unknown> = {}) {
  return postJson<PortalApiResponse>("billing/setup-intent", fields);
}

export function addStripePaymentMethod(
  payment_method_id: string,
  set_default = true,
  extra: Record<string, unknown> = {}
) {
  return postJson<PortalApiResponse>("billing/payment-methods/add", {
    payment_method_id,
    set_default,
    ...extra,
  });
}

export function setDefaultStripePaymentMethod(payment_method_id: string) {
  return postJson<PortalApiResponse>("billing/payment-methods/default", { payment_method_id });
}

export function deleteStripePaymentMethod(payment_method_id: string) {
  return postJson<PortalApiResponse>("billing/payment-methods/delete", { payment_method_id });
}

export function createStripePaymentIntent(order_id: string | number, amount?: number) {
  return postJson<PortalApiResponse>("payments/stripe/intent", {
    order_id,
    ...(amount ? { amount } : {}),
  });
}

export function confirmStripePayment(payment_intent_id: string) {
  return postJson<PortalApiResponse>("payments/stripe/confirm", { payment_intent_id });
}

export function autoChargeStripe(order_id: string | number, payment_method_id?: string, amount?: number) {
  return postJson<PortalApiResponse>("payments/stripe/auto-charge", {
    order_id,
    ...(payment_method_id ? { payment_method_id } : {}),
    ...(amount ? { amount } : {}),
  });
}

export function getPortalListingStats(tourid: string | number) {
  return postJson<PortalApiResponse>("listings/stats", { tourid });
}

export function getPortalListingMedia(tourid: string | number) {
  return postJson<PortalApiResponse>("listings/media", { tourid });
}

