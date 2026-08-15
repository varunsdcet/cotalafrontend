import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { getDesignJobOptions } from "@/lib/api";
import PortalFooter from "@/components/portal/PortalFooter";
import brochureImg from "@/pages/images/brochure.png";
import cardsImg from "@/pages/images/business-cards.png";
import magazineImg from "@/pages/images/listing-magazine-1.jpeg";
import sheetImg from "@/pages/images/p-2.jpg";
import cardImg from "@/pages/images/card.png";

type DesignProduct = {
  id: number | string;
  name?: string;
  class?: string;
  description?: string;
  image_url?: string;
  image?: string;
  productimage?: string;
  [key: string]: unknown;
};

const CATEGORY_COLORS = ["purple", "blue", "green"] as const;

const FALLBACK_PRODUCTS: DesignProduct[] = [
  { id: 19, name: "Oversized Feature Sheet | 01", class: "Feature Sheets", image: sheetImg },
  { id: "fs-2", name: "Oversized Feature Sheet | 02", class: "Feature Sheets", image: sheetImg },
  { id: "fs-3", name: "Oversized Feature Sheet | 03", class: "Feature Sheets", image: sheetImg },
  { id: "fs-4", name: "Oversized Feature Sheet | 04", class: "Feature Sheets", image: magazineImg },
  { id: "fs-5", name: "Oversized Feature Sheet | 05", class: "Feature Sheets", image: sheetImg },
  { id: "pc-1", name: 'Post Card 8.5"x5.5" | 01', class: "Post Cards", image: brochureImg },
  { id: "pc-2", name: 'Post Card 8.5"x5.5" | 02', class: "Post Cards", image: magazineImg },
  { id: "pc-3", name: 'Post Card 8.5"x5.5" | 03', class: "Post Cards", image: sheetImg },
  { id: "pc-4", name: 'Post Card 8.5"x5.5" | 04', class: "Post Cards", image: brochureImg },
  { id: "pc-5", name: 'Post Card 8.5"x5.5" | 05', class: "Post Cards", image: magazineImg },
  { id: "pc-6", name: 'Post Card 8.5"x5.5" | 06', class: "Post Cards", image: brochureImg },
  { id: "dk-1", name: "Door Knockers 01", class: "Door Knockers", image: cardImg },
  { id: "dk-2", name: "Door Knockers 02", class: "Door Knockers", image: cardsImg },
  { id: "dk-3", name: "Door Knockers 03", class: "Door Knockers", image: cardImg },
  { id: "dk-4", name: "Door Knockers 04", class: "Door Knockers", image: cardsImg },
  { id: "bc-1", name: "Business Cards | 01", class: "Business Cards", image: cardsImg },
  { id: "bc-2", name: "Business Cards | 02", class: "Business Cards", image: cardImg },
  { id: "gc-1", name: "Greeting Cards | 01", class: "Greeting Cards", image: magazineImg },
  { id: "fl-1", name: "Flyers | 01", class: "Flyers", image: brochureImg },
  { id: "fl-2", name: "Flyers | 02", class: "Flyers", image: sheetImg },
];

function asProductList(value: unknown): DesignProduct[] {
  if (Array.isArray(value)) return value as DesignProduct[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.products)) return record.products as DesignProduct[];
    if (Array.isArray(record.list)) return record.list as DesignProduct[];
    return Object.values(record).flatMap((item) => (Array.isArray(item) ? (item as DesignProduct[]) : []));
  }
  return [];
}

function productImage(product: DesignProduct | undefined, index: number) {
  const fromApi = product?.image_url || product?.image || product?.productimage;
  if (typeof fromApi === "string" && fromApi.trim() && !/logo1\.png/i.test(fromApi)) return fromApi;
  const name = `${product?.class || ""} ${product?.name || ""}`.toLowerCase();
  if (name.includes("feature") || name.includes("sheet")) return sheetImg;
  if (name.includes("business")) return cardsImg;
  if (name.includes("door")) return cardImg;
  if (name.includes("post")) return brochureImg;
  if (name.includes("flyer") || name.includes("greeting")) return magazineImg;
  return [sheetImg, cardsImg, magazineImg, brochureImg, cardImg][index % 5];
}

function CarouselRow({
  variant,
  children,
}: {
  variant: "explore" | "templates";
  children: React.ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const amount = variant === "explore" ? 480 : 360;
    rowRef.current?.scrollBy({ left: dir * amount, behavior: "smooth" });
  };
  return (
    <div className={`dj-carousel dj-carousel-${variant}`}>
      <div ref={rowRef} className={`dj-track dj-track-${variant}`}>
        {children}
      </div>
      <button type="button" className="swiper-button-prev" onClick={() => scroll(-1)} aria-label="Previous">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button type="button" className="swiper-button-next" onClick={() => scroll(1)} aria-label="Next">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function DesignJob() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<DesignProduct[]>(FALLBACK_PRODUCTS);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getDesignJobOptions(query);
        const payload = ((data as { data?: unknown }).data || data) as Record<string, unknown>;
        let list = asProductList(payload.products);
        if (!list.length) list = asProductList(payload.grouped);
        if (!list.length) list = asProductList(payload.list);
        if (!list.length) list = asProductList(payload);
        setProducts(list.length ? list : FALLBACK_PRODUCTS);
      } catch (error) {
        console.error("Failed to load design jobs", error);
        setProducts(FALLBACK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [query]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => {
      const hay = `${product.name || ""} ${product.class || ""} ${product.description || ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [products, query]);

  const grouped = useMemo(() => {
    const map: Record<string, DesignProduct[]> = {};
    visible.forEach((product) => {
      const key = product.class || "Other";
      if (!map[key]) map[key] = [];
      map[key].push(product);
    });
    return map;
  }, [visible]);

  const exploreCats = Object.keys(grouped);

  const openProduct = (product: DesignProduct) => {
    const title = `${product.class || ""} ${product.name || ""}`.toLowerCase();
    if (title.includes("feature")) {
      setLocation("/feature-sheet");
      return;
    }
    setLocation("/oversize-feature-sheets");
  };

  return (
    <div className="min-h-screen bg-black text-white design-job-page">
      <div className="hero-section design-job-hero">
        <div className="container mx-auto px-4">
          <h1 className="hero-title">What would you like to design?</h1>
          <form
            className="search-box"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search.trim());
            }}
          >
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="search-btn" aria-label="Search templates">
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      <div className="service-package">
        <div className="container mx-auto px-4 mb-8 pb-10">
          <div className="section">
            <div className="section-title-1">Explore templates</div>
            {loading ? (
              <div className="text-white/60 py-6">Loading templates...</div>
            ) : (
              <CarouselRow variant="explore">
                {exploreCats.map((cat, index) => (
                  <button
                    key={cat}
                    type="button"
                    className={`category-card ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}`}
                    onClick={() => {
                      setSearch(cat);
                      setQuery(cat);
                    }}
                  >
                    <span>{cat}</span>
                    <img src={productImage(grouped[cat]?.[0], index)} alt="" />
                  </button>
                ))}
              </CarouselRow>
            )}
          </div>

          {exploreCats.map((cat) => {
            const items = grouped[cat] || [];
            if (!items.length) return null;
            return (
              <div className="section" key={cat}>
                <div className="section-title-1">{cat}</div>
                <CarouselRow variant="templates">
                  {items.map((product, index) => (
                    <button
                      key={String(product.id)}
                      type="button"
                      className="template-card"
                      onClick={() => openProduct(product)}
                    >
                      <img src={productImage(product, index)} alt={product.name || cat} />
                      <div className="template-info">
                        <div className="template-title">{product.name || `${cat} | 0${index + 1}`}</div>
                        <div className="badge-new">New</div>
                      </div>
                    </button>
                  ))}
                </CarouselRow>
              </div>
            );
          })}
        </div>
      </div>
      <PortalFooter />
    </div>
  );
}
