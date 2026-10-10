/* ════════════════════════════════════════════════════════════════
   EDIT THIS FILE. Everything the site says lives here.
   After editing, run:  npm run check   (flags anything unconfirmed)
   ════════════════════════════════════════════════════════════════ */

export const SITE = {
  company: "South Texas Construction By Design",
  tagline: "Building Dreams. Creating Reality.",
  phone: "(210) 367-6648",
  email: "jrduran75@yahoo.com",      // shown on the site; form inquiries go to TO_EMAIL in Vercel
  founded: 2005,                     // ← CONFIRM: year founded (drives "Est." and "Years in Texas")
  serviceArea: "All of Texas · Based in South Texas",
  responseNote: "We reply within 1 business day",
};

// Real credentials only. Texas has no state GC license and no state roofing
// license, so don't list one. Examples if true: "RCAT Licensed Roofing Contractor",
// "Fully Insured", "OSHA 30 Trained". Leave [] to show nothing.
export const CREDENTIALS = [];

// What they do — shown in the strip under the hero.
export const FOCUS = ["Healthcare Renovation", "Commercial Construction", "Roofing", "Occupied-Facility Work", "Statewide Service"];

// Photos live in public/photos/. Each has a full size (name.webp) and a small one (name-sm.webp).
export const PHOTOS = {
  hero: "atrium-scaffold",
  about: "pavilion",
  roofing: "historic-roof",
};

export const GALLERY = [
  { photo: "atrium-scaffold", caption: "Multi-story atrium renovation with full interior scaffold" },
  { photo: "common-room", caption: "Common area remodel — new drywall, lighting, and finishes" },
  { photo: "window-replacement", caption: "Window replacement in an occupied room, furniture wrapped and protected" },
  { photo: "entrance-concrete", caption: "New concrete at a facility entrance" },
  { photo: "new-construction", caption: "New construction — framing, insulation, and ceiling grid" },
  { photo: "vaulted-ceiling", caption: "Vaulted ceiling, beams, and loft build-out" },
  { photo: "atrium-interior", caption: "Atrium wall and finish work from the scaffold" },
  { photo: "window-prep", caption: "Old window out, opening cleaned and prepped" },
  { photo: "concrete-pour", caption: "Pumped concrete pour on site" },
];

export const SERVICES = [
  { title: "Resident Room Renovations", tag: "Most Requested", desc: "Flooring, walls, windows, lighting, and accessibility upgrades done in phases, so residents stay in place." },
  { title: "ADA Bathroom Upgrades", tag: "Code Critical", desc: "Roll-in showers, grab bars, comfort-height fixtures, and slip-resistant floors built to ADA and Texas HHSC standards." },
  { title: "Dining and Common Areas", tag: null, desc: "Dining rooms and activity spaces rebuilt with new drywall, lighting, and finishes." },
  { title: "Commercial Build-Outs", tag: null, desc: "Offices, retail, medical clinics, and restaurants — tenant improvements and finish-outs." },
  { title: "Nurses Stations and Clinical Spaces", tag: "Specialized", desc: "Nursing stations, medication rooms, and clinical support spaces built for staff workflow and patient safety." },
  { title: "New Commercial Construction", tag: null, desc: "Ground-up commercial buildings — site work, concrete, framing, and finish-out." },
];

export const ROOF_SERVICES = [
  { title: "Commercial Re-Roofing", desc: "TPO, modified bitumen, and metal systems installed to code with permit documentation." },
  { title: "Healthcare Facility Roofing", desc: "Re-roofs on occupied nursing homes and ALFs, coordinated with interior work." },
  { title: "Storm Damage and Emergency Repair", desc: "Emergency tarping, insurance documentation, and full restoration after hail or wind." },
  { title: "Historic and Residential Roofing", desc: "Deck repair, shingle, metal, and tile replacement on homes and older buildings." },
];

export const ABOUT = {
  heading: "Built for the Places People Live and Heal.",
  body: "Nursing homes and assisted living facilities can't shut down for a remodel. We plan around residents and staff, seal off work areas, and keep the building running while we build.",
  bullets: [
    "Phased scheduling — residents stay in place",
    "Work areas sealed and furnishings protected",
    "Permits, inspections, and closeout handled",
    "In-house roofing division",
    "Healthcare, commercial, and residential projects",
  ],
};

export const FAQS = [
  { q: "Do residents have to leave during renovations?", a: "No. We work in phases, seal off each work area, and coordinate with your staff so the rest of the building keeps running." },
  { q: "Can you work around our state survey?", a: "Yes. Tell us your survey window and we'll schedule the work around it." },
  { q: "Do you handle permits and inspections?", a: "Yes. We pull the permits, coordinate with the local inspectors, and manage everything through closeout." },
  { q: "Do you serve all of Texas or just South Texas?", a: "All of Texas. Our crews travel to the project." },
  { q: "How fast can you respond to storm damage?", a: "Call us. We get the roof covered, document damage for your insurance claim, and handle the repair." },
  { q: "What happens after I send the form?", a: "We call or email you within one business day to talk through the project and set up a site visit for an estimate." },
];
