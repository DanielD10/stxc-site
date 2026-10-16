// BUILD ONLY. Turns the page into plain HTML at build time (scripts/prerender.js),
// and builds the business details Google reads (structured data).
import { renderToString } from "react-dom/server";
import Root from "./Root.jsx";
import { SITE, SERVICES, ROOF_SERVICES, MANAGEMENT, FAQS, PHOTOS } from "./config.js";

export function render() {
  return renderToString(<Root />);
}

const offer = (name, description) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name, description } });

// schema.org data: who the business is, how to reach it, what it does.
// Only facts that are already on the page.
export function structuredData() {
  const url = SITE.url.replace(/\/$/, "") + "/";
  const business = {
    "@context": "https://schema.org",
    "@type": ["GeneralContractor", "RoofingContractor"],
    "@id": url + "#business",
    name: SITE.company,
    url,
    telephone: "+1-" + SITE.phone.replace(/\D/g, "").replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3"),
    email: SITE.email,
    foundingDate: String(SITE.founded),
    slogan: SITE.tagline,
    description:
      "San Antonio-based healthcare and commercial remodeling Contractor serving all of Texas: phased renovations in occupied nursing homes and assisted living facilities, commercial build-outs, new commercial construction, project management, and an in-house roofing division.",
    image: url + "photos/" + PHOTOS.hero + ".webp",
    // Service-area business: city only, no street address (there's no office to visit).
    address: { "@type": "PostalAddress", addressLocality: SITE.city, addressRegion: "TX", addressCountry: "US" },
    areaServed: [
      { "@type": "City", name: SITE.city + ", Texas" },
      { "@type": "State", name: "Texas" },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Construction services",
      itemListElement: [
        ...SERVICES.map((s) => offer(s.title, s.desc)),
        ...ROOF_SERVICES.map((s) => offer(s.title, s.desc)),
        offer("Project Management", MANAGEMENT.body),
      ],
    },
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return [business, faq];
}
