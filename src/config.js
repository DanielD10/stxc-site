/* ════════════════════════════════════════════════════════════════
   EDIT THIS FILE. Everything the site says lives here.
   After editing, run:  npm run check   (flags anything unconfirmed)
   ════════════════════════════════════════════════════════════════ */

export const SITE = {
  company: "South Texas Construction By Design",
  tagline: "Building Dreams. Creating Reality.",
  phone: "(210) 367-6648",
  email: "jrduran75@yahoo.com",      // shown on the site; form inquiries go to TO_EMAIL in Vercel
  founded: 2005,                     // ← CONFIRM: year founded (drives "Established" and "Years in Texas")
  serviceArea: "All of Texas · Based in South Texas",
  responseNote: "We reply within one business day",
};

// Real credentials only. Texas has no state GC license and no state roofing
// license, so don't list one. Examples if true: "RCAT Licensed Roofing Contractor",
// "Fully Insured", "OSHA 30 Trained". Leave [] to show nothing.
export const CREDENTIALS = [];

// What they do — shown in the strip under the hero.
export const FOCUS = ["Healthcare Renovation", "Commercial Construction", "Project Management", "Roofing", "Occupied-Facility Work", "Statewide Service"];

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
  { title: "Assisted Living Facility Renovations", tag: "Specialized", desc: "Resident apartments, hallways, and shared spaces renovated in phases while the community stays open." },
  { title: "Americans with Disabilities Act Bathroom Upgrades", tag: "Code Critical", desc: "Roll-in showers, grab bars, comfort-height fixtures, and slip-resistant floors built to the Americans with Disabilities Act Standards and the Texas Accessibility Standards." },
  { title: "Dining and Common Areas", tag: "Specialized", desc: "Dining rooms and activity spaces rebuilt with new drywall, lighting, and finishes." },
  { title: "Commercial Build-Outs", tag: "Specialized", desc: "Offices, retail, medical clinics, and restaurants — tenant improvements and finish-outs." },
  { title: "New Commercial Construction", tag: "Specialized", desc: "Ground-up commercial buildings — site work, concrete, framing, and finish-out." },
];

export const ROOF_SERVICES = [
  { title: "Commercial Re-Roofing", desc: "Thermoplastic polyolefin, modified bitumen, and metal systems installed to code with permit documentation." },
  { title: "Healthcare Facility Roofing", desc: "Re-roofs on occupied nursing homes and assisted living facilities, coordinated with interior work." },
  { title: "Storm Damage and Emergency Repair", desc: "Emergency tarping, insurance documentation, and full restoration after hail or wind." },
  { title: "Historic and Residential Roofing", desc: "Deck repair, shingle, metal, and tile replacement on homes and older buildings." },
];

// Project management — shown in its own section.
export const MANAGEMENT = {
  heading: "We Can Manage the Whole Job.",
  body: "Have the plans, the budget, or your own crews? Hire us to run the project from start to closeout. You get one point of contact who keeps the schedule, the budget, and every trade on track.",
  items: [
    { title: "Scheduling and Phasing", desc: "A clear schedule built around residents, staff, tenants, and survey dates." },
    { title: "Budget and Cost Control", desc: "Bids, change orders, and invoices reviewed before you pay them." },
    { title: "Subcontractor Coordination", desc: "Hiring, scheduling, and holding every trade to the plan and the code." },
    { title: "Permits and Inspections", desc: "Permits pulled, inspections scheduled, and corrections handled." },
    { title: "Progress Updates", desc: "Regular updates with photos, so you always know where the job stands." },
    { title: "Closeout", desc: "Punch list, final inspections, and warranty paperwork wrapped up." },
  ],
  ways: [
    { title: "We Build It", desc: "Our crews do the work, start to finish." },
    { title: "We Manage It", desc: "You bring the crews or subcontractors. We run the schedule, budget, and trades." },
    { title: "We Do Both", desc: "One team handles the management and the build." },
  ],
};

export const ABOUT = {
  heading: "Built for the Places People Live and Heal.",
  body: "Nursing homes and assisted living facilities can't shut down for a remodel. We plan around residents and staff, seal off work areas, and keep the building running while we build.",
  bullets: [
    "Phased scheduling — residents stay in place",
    "Work areas sealed and furnishings protected",
    "Permits, inspections, and closeout handled",
    "Full project management — schedule, budget, and every trade",
    "In-house roofing division",
    "Healthcare, commercial, and residential projects",
  ],
};

export const FAQS = [
  { q: "Do residents have to leave during renovations?", a: "No. We work in phases, seal off each work area, and coordinate with your staff so the rest of the building keeps running." },
  { q: "Can you work around our state survey?", a: "Yes. Tell us your survey window and we'll schedule the work around it." },
  { q: "Can you manage a project without doing the construction?", a: "Yes. We can manage the whole job — schedule, budget, permits, and every trade — whether our crews build it or yours do." },
  { q: "Do you handle permits and inspections?", a: "Yes. We pull the permits, coordinate with the local inspectors, and manage everything through closeout." },
  { q: "Do you serve all of Texas or just South Texas?", a: "All of Texas. Our crews travel to the project." },
  { q: "How fast can you respond to storm damage?", a: "Call us. We get the roof covered, document damage for your insurance claim, and handle the repair." },
  { q: "What happens after I send the form?", a: "We call or email you within one business day to talk through the project and set up a site visit for an estimate." },
];
