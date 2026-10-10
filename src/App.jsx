import { useState, useEffect, useRef, useCallback } from "react";
import { SITE, CREDENTIALS, FOCUS, PHOTOS, GALLERY, SERVICES, ROOF_SERVICES, ABOUT, FAQS } from "./config.js";
import { PROJECT_TYPES } from "../shared/projectTypes.js";
import { EMPTY_FORM, RULES, validateForm, limitField, buildPayload, submitInquiry } from "./lib/inquiry.js";

/* ── Colors ── */
const BG = "#080C14", SRF = "#0D1321", RAISED = "#111827", PANEL = "#1A2234";
const BLUE = "#3B82F6", BLUEHI = "#60A5FA", BLUELO = "rgba(59,130,246,0.10)";
const AMBER = "#F59E0B", RED = "#EF4444";
const WHITE = "#F9FAFB", MID = "#9CA3AF", MUTED = "#828A98", FAINT = "#828A98";
const BORDER = "rgba(255,255,255,0.06)", BAC = "rgba(59,130,246,0.28)";
const NAV_H = 64;

const photo = (name, small) => "/photos/" + name + (small ? "-sm" : "") + ".webp";
const telHref = "tel:" + SITE.phone.replace(/[^\d+]/g, "");
const mailHref = "mailto:" + SITE.email;

/* ── Hooks ── */
function useReveal() {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") { setVis(true); return; }
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); ob.disconnect(); } }, { threshold: 0.06, rootMargin: "0px 0px -16px 0px" });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return [ref, vis];
}

function useScrolled() {
  const [sc, setSc] = useState(false);
  useEffect(() => {
    const f = () => { const over = window.scrollY > 40; setSc((p) => (p === over ? p : over)); };
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return sc;
}

function useToasts() {
  const [list, setList] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setList((p) => [...p, { id, msg, type }]);
    setTimeout(() => setList((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);
  return [list, add];
}

function go(id) {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - NAV_H, behavior: "smooth" });
}

/* ── Atoms ── */
function Rv({ children, d = 0, sx = {} }) {
  const [ref, vis] = useReveal();
  return <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(22px)", transition: `opacity .65s ${d}s ease,transform .65s ${d}s ease`, ...sx }}>{children}</div>;
}

function Eyebrow({ children }) {
  return <div style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", marginBottom: "1rem" }}>
    <span style={{ display: "inline-block", width: 24, height: 2, background: "linear-gradient(90deg,#3B82F6,#60A5FA)", borderRadius: 1 }} />
    <span style={{ fontSize: ".66rem", fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: BLUEHI }}>{children}</span>
  </div>;
}

function SH({ children, sx = {} }) {
  return <h2 style={{ fontWeight: 800, fontSize: "clamp(1.85rem,4vw,2.9rem)", color: WHITE, letterSpacing: "-.03em", lineHeight: 1.08, ...sx }}>{children}</h2>;
}

function Tag({ children, v = "blue" }) {
  const colors = { blue: { bg: "rgba(59,130,246,.12)", color: "#93C5FD", b: "rgba(59,130,246,.25)" }, red: { bg: "rgba(239,68,68,.1)", color: "#FCA5A5", b: "rgba(239,68,68,.25)" }, amber: { bg: "rgba(245,158,11,.1)", color: "#FCD34D", b: "rgba(245,158,11,.25)" } };
  const c = colors[v] || colors.blue;
  return <span style={{ display: "inline-block", fontSize: ".6rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", borderRadius: 4, padding: ".14rem .5rem", background: c.bg, color: c.color, border: `1px solid ${c.b}` }}>{children}</span>;
}

function Btn({ onClick, href, v = "pri", type = "button", children, disabled = false, sx = {} }) {
  const [hov, setHov] = useState(false);
  const isPri = v === "pri";
  const s = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: ".5rem", padding: ".8rem 1.75rem", borderRadius: 8, fontWeight: 600, fontSize: ".9rem", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, transition: "all .2s ease", background: isPri ? (hov && !disabled ? BLUEHI : BLUE) : "transparent", color: isPri ? BG : hov ? WHITE : MID, border: isPri ? "none" : `1px solid ${hov ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.1)"}`, boxShadow: isPri ? (hov && !disabled ? "0 0 32px rgba(59,130,246,.5)" : "0 0 14px rgba(59,130,246,.18)") : "none", transform: hov && !disabled ? "translateY(-1px)" : "none", textDecoration: "none", ...sx };
  const h = { style: s, onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false) };
  if (href) return <a href={href} {...h}>{children}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} {...h}>{children}</button>;
}

function Divider() {
  return <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)" }} />;
}

function Check({ size = 16, sw = 2.5 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>;
}

function Toasts({ list }) {
  return <div className="tw" role="status" aria-live="polite">
    {list.map((t) => <div key={t.id} style={{ background: RAISED, border: `1px solid ${t.type === "error" ? "rgba(239,68,68,.35)" : "rgba(59,130,246,.35)"}`, borderRadius: 10, padding: ".85rem 1.1rem", display: "flex", alignItems: "center", gap: ".7rem", fontSize: ".9rem", color: WHITE, maxWidth: 340, pointerEvents: "all", boxShadow: "0 8px 32px rgba(0,0,0,.6)", animation: "toast .3s ease forwards" }}>
      <span style={{ color: t.type === "error" ? RED : BLUE, flexShrink: 0 }} aria-hidden="true">{t.type === "error" ? "!" : "✓"}</span>
      {t.msg}
    </div>)}
  </div>;
}

function CallBar() {
  return <aside aria-label="Call us" className="call-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "linear-gradient(90deg,#3B82F6,#2563EB)", alignItems: "center", justifyContent: "center", padding: ".95rem 1rem calc(.95rem + env(safe-area-inset-bottom))", gap: ".65rem", boxShadow: "0 -4px 24px rgba(59,130,246,.3)" }}>
    <a href={telHref} style={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>📞 Call Now · {SITE.phone}</a>
  </aside>;
}

/* ── Nav ── */
const NLINKS = [{ label: "Services", id: "services" }, { label: "Our Work", id: "work" }, { label: "Roofing", id: "roofing" }, { label: "About", id: "about" }, { label: "Frequently Asked Questions", id: "faq" }];

function Nav() {
  const sc = useScrolled();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!e.target.closest("#nav")) setOpen(false); };
    const k = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("click", h); document.removeEventListener("keydown", k); };
  }, [open]);
  const nav = (id) => { setOpen(false); go(id); };
  const solid = sc || open;
  return <nav id="nav" aria-label="Main" style={{ position: "fixed", inset: "0 0 auto 0", zIndex: 100, background: solid ? "rgba(8,12,20,.94)" : "transparent", backdropFilter: solid ? "blur(24px)" : "none", WebkitBackdropFilter: solid ? "blur(24px)" : "none", borderBottom: `1px solid ${solid ? BORDER : "transparent"}`, transition: "all .3s ease" }}>
    <div style={{ width: "min(1200px,94vw)", marginInline: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: sc ? ".8rem 0" : "1.1rem 0", transition: "padding .3s" }}>
      <button onClick={() => nav("hero")} aria-label={SITE.company + " — back to top"} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
        <div style={{ fontWeight: 900, fontSize: "clamp(.88rem,2.6vw,1.05rem)", letterSpacing: "-.03em", color: WHITE, lineHeight: 1.1 }}><span style={{ color: BLUE }}>SOUTH TEXAS</span> CONSTRUCTION</div>
        <div style={{ fontSize: ".56rem", fontWeight: 700, letterSpacing: ".22em", color: MUTED, textTransform: "uppercase", marginTop: 4 }}><span style={{ color: WHITE }}>By Design</span> · Healthcare · Commercial · Roofing</div>
      </button>
      <div className="desk" style={{ display: "flex", alignItems: "center", gap: ".1rem" }}>
        {NLINKS.map((l) => <NL key={l.id} label={l.label} onClick={() => nav(l.id)} />)}
        <Btn onClick={() => nav("contact")} sx={{ marginLeft: "1.25rem", padding: ".55rem 1.25rem", fontSize: ".82rem" }}>Get an Estimate</Btn>
      </div>
      <button className="mob" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} style={{ display: "none", flexDirection: "column", gap: 5, padding: 10, background: "none", border: "none", cursor: "pointer" }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ display: "block", width: 22, height: 2, background: WHITE, borderRadius: 1, transition: "all .25s", transform: open ? (i === 0 ? "translateY(7px) rotate(45deg)" : i === 2 ? "translateY(-7px) rotate(-45deg)" : "none") : "none", opacity: open && i === 1 ? 0 : 1 }} />)}
      </button>
    </div>
    {open && <div style={{ background: SRF, borderTop: `1px solid ${BORDER}`, animation: "dn .2s ease" }}>
      {NLINKS.map((l) => <ML key={l.id} label={l.label} onClick={() => nav(l.id)} />)}
      <button onClick={() => nav("contact")} style={{ display: "block", width: "100%", textAlign: "left", padding: "1rem 6vw", fontSize: ".95rem", fontWeight: 700, color: BLUEHI, background: "none", border: "none", cursor: "pointer" }}>Get an Estimate →</button>
    </div>}
  </nav>;
}
function NL({ label, onClick }) {
  const [h, s] = useState(false);
  return <button onClick={onClick} style={{ background: "none", border: "none", padding: ".5rem .75rem", cursor: "pointer", fontSize: ".86rem", fontWeight: 500, color: h ? WHITE : MID, transition: "color .2s" }} onMouseEnter={() => s(true)} onMouseLeave={() => s(false)}>{label}</button>;
}
function ML({ label, onClick }) {
  return <button onClick={onClick} style={{ display: "block", width: "100%", textAlign: "left", padding: "1rem 6vw", fontSize: ".95rem", fontWeight: 500, color: WHITE, background: "none", border: "none", borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}>{label}</button>;
}

/* ── Hero ── */
function Hero() {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 80); return () => clearTimeout(t); }, []);
  const tr = (d) => `opacity .8s ${d}s ease,transform .8s ${d}s ease`;
  return <section id="hero" style={{ minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden", background: BG, paddingTop: "5rem" }}>
    <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
      <img src={photo(PHOTOS.hero)} alt="" fetchpriority="high" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.38 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg,rgba(8,12,20,.97) 0%,rgba(8,12,20,.86) 45%,rgba(8,12,20,.55) 100%)" }} />
      <div style={{ position: "absolute", inset: "auto 0 0 0", height: 200, background: "linear-gradient(to bottom,transparent,#080C14)" }} />
      <div style={{ position: "absolute", top: -120, left: -120, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,.13) 0%,transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -80, right: -80, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,158,11,.07) 0%,transparent 70%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.014) 1px,transparent 1px)", backgroundSize: "64px 64px" }} />
    </div>
    <div style={{ position: "relative", zIndex: 1, width: "min(1200px,94vw)", marginInline: "auto", padding: "3rem 0 7rem" }}>
      <div style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(12px)", transition: tr(0.05), marginBottom: "2rem" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", background: BLUELO, border: "1px solid rgba(59,130,246,.22)", borderRadius: 100, padding: ".35rem .9rem .35rem .5rem" }}>
          <span style={{ background: BLUE, borderRadius: "50%", width: 6, height: 6, display: "inline-block" }} />
          <span style={{ fontSize: ".68rem", fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: BLUEHI }}>Texas Statewide — Established {SITE.founded}</span>
        </span>
      </div>
      <h1 style={{ fontWeight: 900, fontSize: "clamp(3rem,9vw,7rem)", lineHeight: 0.94, letterSpacing: "-.04em", marginBottom: "2rem", opacity: on ? 1 : 0, transform: on ? "none" : "translateY(20px)", transition: tr(0.12) }}>
        <span style={{ display: "block", color: WHITE }}>Built for Healthcare.</span>
        <span style={{ display: "block", background: "linear-gradient(110deg,#3B82F6 0%,#60A5FA 45%,#F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Trusted Across Texas.</span>
      </h1>
      <p style={{ fontSize: "clamp(1rem,1.8vw,1.15rem)", color: MID, maxWidth: "50ch", lineHeight: 1.75, marginBottom: "2.75rem", opacity: on ? 1 : 0, transition: tr(0.22) }}>
        The Contractor nursing homes, assisted living facilities, and commercial properties rely on — phased renovations in occupied buildings, plus our own roofing crews, anywhere in Texas.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", opacity: on ? 1 : 0, transition: tr(0.3) }}>
        <Btn onClick={() => go("contact")} sx={{ padding: ".95rem 2.25rem", fontSize: ".98rem", fontWeight: 700 }}>Request an Estimate</Btn>
        <Btn href={telHref} v="out" sx={{ padding: ".95rem 1.75rem", fontSize: ".98rem" }}>Call {SITE.phone}</Btn>
      </div>
    </div>
  </section>;
}

/* ── Cert strip ── */
function CertStrip() {
  return <>
    <Divider />
    <div style={{ background: SRF, padding: ".9rem 0" }}>
      <div className="ci wrap">
        {[...CREDENTIALS, ...FOCUS].map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: ".45rem", fontSize: ".7rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: MID, whiteSpace: "nowrap" }}>
          <Check size={10} sw={3} />{c}
        </div>)}
      </div>
    </div>
    <Divider />
  </>;
}

/* ── Services ── */
function Services() {
  return <section id="services" style={{ background: BG, padding: "clamp(4.5rem,9vw,8rem) 0" }}>
    <div className="wrap">
      <Rv>
        <Eyebrow>Healthcare and Commercial</Eyebrow>
        <SH sx={{ marginBottom: ".75rem" }}>Remodeling Services</SH>
        <p style={{ color: MID, fontSize: "1rem", maxWidth: "54ch", lineHeight: 1.8, marginBottom: "3rem" }}>Phased renovations in occupied buildings and full commercial build-outs — done to code and on schedule.</p>
      </Rv>
      <div className="sg">{SERVICES.map((s, i) => <SvcCard key={s.title} s={s} d={i * 0.06} />)}</div>
    </div>
  </section>;
}

function hideBrokenImg(e) { e.currentTarget.style.display = "none"; }

function SvcCard({ s, d }) {
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal();
  const tv = s.tag === "Code Critical" ? "red" : s.tag === "Specialized" ? "amber" : "blue";
  return <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(22px)", transition: `opacity .65s ${d}s ease,transform .65s ${d}s ease` }}>
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ position: "relative", background: RAISED, border: `1px solid ${hov ? BAC : BORDER}`, borderRadius: 14, padding: "1.6rem 1.5rem", height: "100%", overflow: "hidden", transition: "all .25s ease", transform: hov ? "translateY(-4px)" : "none", boxShadow: hov ? "0 20px 40px rgba(0,0,0,.45)" : "none" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#3B82F6,#F59E0B)", opacity: hov ? 1 : 0.35, transition: "opacity .25s" }} />
      {s.tag && <div style={{ marginBottom: ".85rem" }}><Tag v={tv}>{s.tag}</Tag></div>}
      <h3 style={{ fontWeight: 700, fontSize: "1.05rem", color: hov ? BLUEHI : WHITE, marginBottom: ".55rem", transition: "color .25s" }}>{s.title}</h3>
      <p style={{ fontSize: ".92rem", color: MID, lineHeight: 1.7 }}>{s.desc}</p>
    </div>
  </div>;
}

/* ── Our Work (real job photos) ── */
function Work() {
  const [open, setOpen] = useState(null);
  return <section id="work" style={{ background: SRF, padding: "clamp(4.5rem,9vw,8rem) 0" }}>
    <div className="wrap">
      <Rv>
        <Eyebrow>Our Work</Eyebrow>
        <SH sx={{ marginBottom: ".75rem" }}>Real Jobs. Our Crews.</SH>
        <p style={{ color: MID, fontSize: "1rem", maxWidth: "54ch", lineHeight: 1.8, marginBottom: "2.5rem" }}>A look at recent projects. Tap any photo to see it bigger.</p>
      </Rv>
      <div className="gg">
        {GALLERY.map((g, i) => <Rv key={g.photo} d={(i % 3) * 0.06}>
          <GalleryTile g={g} onOpen={() => setOpen(i)} />
        </Rv>)}
      </div>
      <Rv d={0.1} sx={{ marginTop: "2.75rem", display: "flex", justifyContent: "center" }}>
        <Btn onClick={() => go("contact")}>Start Your Project</Btn>
      </Rv>
    </div>
    {open !== null && <Lightbox index={open} setIndex={setOpen} />}
  </section>;
}

function GalleryTile({ g, onOpen }) {
  const [hov, setHov] = useState(false);
  return <button type="button" onClick={onOpen} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} aria-label={"View photo: " + g.caption} className="gtile" style={{ border: `1px solid ${hov ? BAC : BORDER}` }}>
    <img src={photo(g.photo, true)} alt="" loading="lazy" decoding="async" style={{ transform: hov ? "scale(1.05)" : "scale(1)" }} onError={hideBrokenImg} />
    <span className="gcap">{g.caption}</span>
  </button>;
}

function Lightbox({ index, setIndex }) {
  const n = GALLERY.length;
  const g = GALLERY[index];
  const closeRef = useRef(null);
  const touchX = useRef(null);
  const prev = useCallback(() => setIndex((i) => (i - 1 + n) % n), [n, setIndex]);
  const next = useCallback(() => setIndex((i) => (i + 1) % n), [n, setIndex]);
  const close = useCallback(() => setIndex(null), [setIndex]);

  useEffect(() => {
    const lastFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current && closeRef.current.focus();
    const onKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
  }, [close, next, prev]);

  const arrow = { position: "absolute", top: "50%", transform: "translateY(-50%)", width: 48, height: 48, borderRadius: "50%", border: "1px solid rgba(255,255,255,.18)", background: "rgba(13,19,33,.8)", color: WHITE, fontSize: "1.3rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

  return <div role="dialog" aria-modal="true" aria-label="Project photo" onClick={close}
    onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
    onTouchEnd={(e) => { if (touchX.current === null) return; const dx = e.changedTouches[0].clientX - touchX.current; touchX.current = null; if (Math.abs(dx) > 50) (dx < 0 ? next : prev)(); }}
    style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(4,7,12,.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 1rem", animation: "scIn .2s ease" }}>
    <button ref={closeRef} type="button" onClick={close} aria-label="Close photo" style={{ position: "fixed", top: "1rem", right: "1rem", width: 46, height: 46, borderRadius: "50%", border: "1px solid rgba(255,255,255,.18)", background: "rgba(13,19,33,.85)", color: WHITE, fontSize: "1.1rem", cursor: "pointer", zIndex: 2 }}>✕</button>
    <figure onClick={(e) => e.stopPropagation()} style={{ margin: 0, maxWidth: "min(1100px,100%)", textAlign: "center" }}>
      <img src={photo(g.photo)} alt={g.caption} style={{ maxWidth: "100%", maxHeight: "78vh", borderRadius: 10, margin: "0 auto", objectFit: "contain" }} />
      <figcaption style={{ marginTop: "1rem", color: MID, fontSize: ".95rem", lineHeight: 1.5 }}>{g.caption} <span style={{ color: MUTED }}>· {index + 1} of {n}</span></figcaption>
    </figure>
    <button type="button" className="lbnav" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous photo" style={{ ...arrow, left: "1rem" }}>←</button>
    <button type="button" className="lbnav" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next photo" style={{ ...arrow, right: "1rem" }}>→</button>
  </div>;
}

/* ── Roofing ── */
function Roofing() {
  return <section id="roofing" style={{ background: BG, padding: "clamp(4.5rem,9vw,8rem) 0" }}>
    <div className="wrap">
      <div className="sp">
        <Rv>
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", height: "min(460px,90vw)", background: RAISED }}>
            <img src={photo(PHOTOS.roofing)} alt="Our crew rebuilding the roof deck on a historic building" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={hideBrokenImg} />
            <div style={{ position: "absolute", left: "1rem", bottom: "1rem", background: "rgba(8,12,20,.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: ".45rem .8rem", fontSize: ".78rem", color: MID }}>Roof deck rebuild on a historic building</div>
          </div>
        </Rv>
        <Rv d={0.1}>
          <Eyebrow>Roofing Division</Eyebrow>
          <SH sx={{ marginBottom: "1rem" }}>Our Own Roofing Crews</SH>
          <div style={{ display: "inline-flex", alignItems: "center", gap: ".6rem", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.22)", borderRadius: 8, padding: ".55rem 1rem", marginBottom: "1.5rem" }}>
            <span aria-hidden="true">⚡</span>
            <span style={{ fontSize: ".82rem", fontWeight: 700, color: "#FCA5A5" }}>Storm damage? Call <a href={telHref} style={{ color: "#FECACA", textDecoration: "underline" }}>{SITE.phone}</a></span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", marginBottom: "2rem" }}>
            {ROOF_SERVICES.map((s) => <div key={s.title} style={{ display: "flex", gap: ".85rem" }}>
              <span style={{ marginTop: 4 }}><Check /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: WHITE, marginBottom: ".2rem" }}>{s.title}</div>
                <div style={{ fontSize: ".92rem", color: MID, lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            </div>)}
          </div>
          <Btn onClick={() => go("contact")}>Get a Roofing Estimate</Btn>
        </Rv>
      </div>
    </div>
  </section>;
}

/* ── About ── */
function About() {
  const yrs = new Date().getFullYear() - SITE.founded;
  return <section id="about" style={{ background: SRF, padding: "clamp(4.5rem,9vw,8rem) 0" }}>
    <div className="wrap">
      <div className="sp sp-rev">
        <Rv d={0.12}>
          <Eyebrow>Why Choose Us</Eyebrow>
          <SH sx={{ marginBottom: "1.25rem" }}>{ABOUT.heading}</SH>
          <p style={{ color: MID, fontSize: "1rem", lineHeight: 1.85, marginBottom: "2rem" }}>{ABOUT.body}</p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: ".75rem", marginBottom: "2.5rem" }}>
            {ABOUT.bullets.map((b) => <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: ".75rem", fontSize: ".98rem", color: WHITE }}>
              <span style={{ marginTop: 3 }}><Check /></span>{b}
            </li>)}
          </ul>
          <Btn onClick={() => go("contact")}>Request an Estimate</Btn>
        </Rv>
        <Rv>
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", height: "min(440px,70vw)", background: RAISED }}>
            <img src={photo(PHOTOS.about)} alt="Our crew framing an outdoor pavilion" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={hideBrokenImg} />
            {yrs > 0 && <div style={{ position: "absolute", bottom: "1.25rem", left: "1.25rem", background: "rgba(8,12,20,.88)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(59,130,246,.28)", borderRadius: 12, padding: ".85rem 1.15rem" }}>
              <div style={{ fontWeight: 900, fontSize: "1.9rem", color: BLUE, lineHeight: 1, letterSpacing: "-.04em" }}>{yrs}+</div>
              <div style={{ fontSize: ".62rem", letterSpacing: ".16em", textTransform: "uppercase", color: MID, marginTop: ".2rem", fontWeight: 600 }}>Years in Texas</div>
            </div>}
          </div>
        </Rv>
      </div>
    </div>
  </section>;
}

/* ── FAQ ── */
function FAQ() {
  const [open, setOpen] = useState(null);
  return <section id="faq" style={{ background: BG, padding: "clamp(5rem,10vw,9rem) 0" }}>
    <div className="wrap">
      <Rv sx={{ marginBottom: "3.5rem" }}>
        <Eyebrow>Common Questions</Eyebrow>
        <SH sx={{ marginBottom: ".75rem" }}>Frequently Asked Questions</SH>
        <p style={{ color: MID, fontSize: "1rem", maxWidth: "50ch", lineHeight: 1.8 }}>What facility administrators usually ask before they call.</p>
      </Rv>
      <div style={{ display: "flex", flexDirection: "column", gap: ".75rem", maxWidth: 820 }}>
        {FAQS.map((faq, i) => {
          const isOpen = open === i;
          return <Rv key={i} d={i * 0.05}>
            <div style={{ background: RAISED, border: `1px solid ${isOpen ? BAC : BORDER}`, borderRadius: 12, overflow: "hidden", transition: "border-color .25s" }}>
              <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} aria-controls={"faq-" + i} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "1.35rem 1.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ fontWeight: 600, fontSize: "1rem", color: isOpen ? BLUEHI : WHITE, transition: "color .25s", lineHeight: 1.4 }}>{faq.q}</span>
                <span aria-hidden="true" style={{ color: BLUE, fontSize: "1.3rem", flexShrink: 0, transition: "transform .25s", transform: isOpen ? "rotate(45deg)" : "none", display: "inline-block" }}>+</span>
              </button>
              {isOpen && <div id={"faq-" + i} style={{ padding: "0 1.5rem 1.35rem", animation: "dn .2s ease" }}>
                <p style={{ fontSize: ".95rem", color: MID, lineHeight: 1.8 }}>{faq.a}</p>
              </div>}
            </div>
          </Rv>;
        })}
      </div>
      <Rv d={0.1} sx={{ marginTop: "3rem" }}>
        <Btn onClick={() => go("contact")}>Still Have Questions? Contact Us</Btn>
      </Rv>
    </div>
  </section>;
}

/* ── Contact ── */
function Contact({ addToast }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | success | failed
  const startedAt = useRef(Date.now());

  const change = (k, raw) => {
    const v = limitField(k, raw);
    setForm((p) => ({ ...p, [k]: v }));
    if (touched[k] && RULES[k]) setErrors((e) => ({ ...e, [k]: RULES[k](v) }));
  };
  const blur = (k) => {
    setTouched((t) => ({ ...t, [k]: true }));
    if (RULES[k]) setErrors((e) => ({ ...e, [k]: RULES[k](form[k]) }));
  };

  const focusFirst = (errs) => {
    const first = Object.keys(RULES).find((k) => errs[k]);
    const el = first && document.getElementById("fi-" + first);
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (status === "sending") return;
    const errs = validateForm(form);
    setTouched(Object.fromEntries(Object.keys(RULES).map((k) => [k, true])));
    setErrors(errs);
    if (Object.keys(errs).length) { addToast("Please fix the highlighted fields.", "error"); focusFirst(errs); return; }

    setStatus("sending");
    const result = await submitInquiry(buildPayload(form, Date.now() - startedAt.current));
    if (result.ok) { setStatus("success"); addToast("Message sent. We'll be in touch soon."); return; }
    if (result.status === 422 && result.fields) {
      setErrors(result.fields); setStatus("idle");
      addToast(result.error || "Please fix the highlighted fields.", "error"); focusFirst(result.fields); return;
    }
    if (result.status === 429) { setStatus("idle"); addToast(result.error || "Too many messages. Please wait a few minutes or call us.", "error"); return; }
    setStatus("failed");
  };

  const reset = () => { setForm(EMPTY_FORM); setErrors({}); setTouched({}); setStatus("idle"); startedAt.current = Date.now(); };

  const fallbackMail = mailHref + "?subject=" + encodeURIComponent("Project inquiry from " + (form.firstName + " " + form.lastName).trim()) + "&body=" + encodeURIComponent(
    "Name: " + form.firstName + " " + form.lastName + "\nEmail: " + form.email + "\nPhone: " + (form.phone || "N/A") + "\nProject: " + form.projectType + "\n\n" + form.message
  );

  return <section id="contact" style={{ background: SRF, padding: "clamp(5rem,10vw,9rem) 0" }}>
    <div className="wrap ctg">
      <Rv>
        <Eyebrow>Get In Touch</Eyebrow>
        <SH sx={{ marginBottom: "1.1rem" }}>Start Your Project</SH>
        <p style={{ color: MID, fontSize: "1rem", lineHeight: 1.85, marginBottom: "2.5rem" }}>Pre-survey renovation or full commercial build-out — tell us what you need and we'll follow up to set up a site visit and an estimate.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", marginBottom: "2rem" }}>
          {[
            { label: "Phone", val: SITE.phone, href: telHref, icon: "📞" },
            { label: "Email", val: SITE.email, href: mailHref, icon: "✉" },
            { label: "Service Area", val: SITE.serviceArea, href: null, icon: "📍" },
          ].map((r) => <div key={r.label} style={{ display: "flex", alignItems: "flex-start", gap: ".9rem" }}>
            <div aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 10, background: BLUELO, border: "1px solid rgba(59,130,246,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".9rem", flexShrink: 0 }}>{r.icon}</div>
            <div>
              <div style={{ fontSize: ".64rem", letterSpacing: ".14em", textTransform: "uppercase", color: MUTED, marginBottom: ".2rem", fontWeight: 600 }}>{r.label}</div>
              {r.href ? <a href={r.href} style={{ fontSize: "1rem", color: WHITE, fontWeight: 500 }}>{r.val}</a> : <span style={{ fontSize: "1rem", color: WHITE, fontWeight: 500 }}>{r.val}</span>}
            </div>
          </div>)}
        </div>
        <div style={{ background: BLUELO, border: "1px solid rgba(59,130,246,.2)", borderLeft: "3px solid #3B82F6", borderRadius: 10, padding: "1.1rem 1.35rem" }}>
          <p style={{ fontSize: ".88rem", color: MID, lineHeight: 1.75 }}><strong style={{ color: WHITE, fontWeight: 600 }}>Healthcare projects:</strong> We understand Texas Health and Human Services Commission survey timelines. Call us first for pre-survey remediation.</p>
        </div>
      </Rv>

      <Rv d={0.1}>
        <div style={{ background: RAISED, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "clamp(1.5rem,4vw,2.5rem)", position: "relative", overflow: "hidden" }}>
          <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#3B82F6,#F59E0B)" }} />

          {status === "success" && <div role="status" style={{ textAlign: "center", padding: "3rem 1rem", animation: "scIn .4s ease" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: BLUELO, border: "1px solid rgba(59,130,246,.3)", display: "flex", alignItems: "center", justifyContent: "center", marginInline: "auto", marginBottom: "1.5rem" }}><Check size={24} /></div>
            <h3 style={{ fontWeight: 800, fontSize: "1.5rem", color: WHITE, marginBottom: ".6rem" }}>Message Sent</h3>
            <p style={{ color: MID, fontSize: "1rem", lineHeight: 1.75, marginBottom: "2rem" }}>Thanks, {form.firstName}. We'll be in touch within one business day. Need us sooner? Call <a href={telHref} style={{ color: BLUEHI }}>{SITE.phone}</a>.</p>
            <Btn onClick={reset}>Send Another</Btn>
          </div>}

          {status === "failed" && <div role="alert" style={{ textAlign: "center", padding: "2.5rem 1rem", animation: "scIn .4s ease" }}>
            <h3 style={{ fontWeight: 800, fontSize: "1.35rem", color: WHITE, marginBottom: ".6rem" }}>That didn't go through</h3>
            <p style={{ color: MID, fontSize: "1rem", lineHeight: 1.75, marginBottom: "1.75rem" }}>Our form had a hiccup. Your message isn't lost — reach us directly:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem", maxWidth: 320, marginInline: "auto" }}>
              <Btn href={telHref} sx={{ width: "100%" }}>Call {SITE.phone}</Btn>
              <Btn href={fallbackMail} v="out" sx={{ width: "100%" }}>Email Us (message pre-filled)</Btn>
              <Btn onClick={() => setStatus("idle")} v="out" sx={{ width: "100%" }}>Try the Form Again</Btn>
            </div>
          </div>}

          {(status === "idle" || status === "sending") && <form onSubmit={submit} noValidate aria-label="Project inquiry form">
            <h3 style={{ fontWeight: 700, fontSize: "1.15rem", color: WHITE, marginBottom: "1.5rem" }}>Request an Estimate</h3>
            <div className="hp" aria-hidden="true">
              <label htmlFor="fi-website">Leave this field empty</label>
              <input id="fi-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => change("website", e.target.value)} />
            </div>
            <div className="nrow">
              <Field id="firstName" label="First Name" auto="given-name" form={form} errors={errors} change={change} blur={blur} />
              <Field id="lastName" label="Last Name" auto="family-name" form={form} errors={errors} change={change} blur={blur} />
            </div>
            <Field id="email" label="Email Address" type="email" auto="email" ph="you@facility.com" form={form} errors={errors} change={change} blur={blur} />
            <Field id="phone" label="Phone Number" optional type="tel" auto="tel" ph="(210) 555-0123" form={form} errors={errors} change={change} blur={blur} />
            <div style={{ marginBottom: "1rem" }}>
              <FieldLabel id="projectType" label="Project Type" />
              <select id="fi-projectType" name="projectType" className={"fld" + (form.projectType ? "" : " empty") + (errors.projectType ? " err" : "")} value={form.projectType} onChange={(e) => change("projectType", e.target.value)} onBlur={() => blur("projectType")} aria-invalid={!!errors.projectType} aria-describedby={errors.projectType ? "er-projectType" : undefined}>
                <option value="">Select project type</option>
                {PROJECT_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <FieldError id="projectType" errors={errors} />
            </div>
            <Field id="message" label="Project Details" type="textarea" ph="Tell us about your facility, the scope, and any upcoming survey dates..." form={form} errors={errors} change={change} blur={blur} />
            <Btn type="submit" disabled={status === "sending"} sx={{ width: "100%", padding: "1rem", marginTop: ".25rem", fontWeight: 700, fontSize: "1rem" }}>
              {status === "sending" ? <><span aria-hidden="true" style={{ width: 16, height: 16, border: "2px solid rgba(8,12,20,.35)", borderTopColor: BG, borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />Sending…</> : "Send Inquiry"}
            </Btn>
            <p style={{ fontSize: ".75rem", color: MUTED, marginTop: ".85rem", textAlign: "center" }}>{SITE.responseNote}</p>
          </form>}
        </div>
      </Rv>
    </div>
  </section>;
}

function FieldLabel({ id, label, optional }) {
  return <label htmlFor={"fi-" + id} style={{ display: "block", fontSize: ".72rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: MID, marginBottom: ".4rem" }}>
    {label}{optional ? <span style={{ color: MUTED, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}> (optional)</span> : <span style={{ color: BLUEHI }} aria-hidden="true"> *</span>}
  </label>;
}

function FieldError({ id, errors }) {
  if (!errors[id]) return null;
  return <p id={"er-" + id} role="alert" style={{ fontSize: ".8rem", color: "#FCA5A5", marginTop: ".35rem", fontWeight: 500 }}>{errors[id]}</p>;
}

function Field({ id, label, type = "text", auto, ph, optional, form, errors, change, blur }) {
  const common = {
    id: "fi-" + id,
    name: id,
    className: "fld" + (errors[id] ? " err" : ""),
    value: form[id],
    placeholder: ph,
    onChange: (e) => change(id, e.target.value),
    onBlur: () => blur(id),
    "aria-invalid": !!errors[id],
    "aria-describedby": errors[id] ? "er-" + id : undefined,
    "aria-required": !optional,
  };
  return <div style={{ marginBottom: "1rem" }}>
    <FieldLabel id={id} label={label} optional={optional} />
    {type === "textarea"
      ? <textarea {...common} rows={5} />
      : <input {...common} type={type} autoComplete={auto} inputMode={type === "tel" ? "tel" : type === "email" ? "email" : undefined} />}
    <FieldError id={id} errors={errors} />
  </div>;
}

/* ── Footer ── */
function Footer() {
  const yr = new Date().getFullYear();
  const cols = {
    Healthcare: [["Nursing Home Remodels", "services"], ["Assisted Living Renovations", "services"], ["Americans with Disabilities Act Upgrades", "services"], ["Clinical Spaces", "services"], ["New Construction", "services"]],
    Roofing: [["Commercial Re-Roofing", "roofing"], ["Healthcare Roofing", "roofing"], ["Storm and Emergency", "roofing"], ["Residential Roofing", "roofing"]],
    Company: [["Our Work", "work"], ["About", "about"], ["Frequently Asked Questions", "faq"], ["Contact", "contact"]],
  };
  return <footer style={{ background: BG, borderTop: `1px solid ${BORDER}`, padding: "3.5rem 0 6rem" }}>
    <div className="wrap">
      <div className="fg">
        <div>
          <div style={{ fontWeight: 900, fontSize: "1.15rem", letterSpacing: "-.03em", color: WHITE, lineHeight: 1.15, marginBottom: ".75rem" }}><span style={{ color: BLUE }}>SOUTH TEXAS</span> CONSTRUCTION<br />BY DESIGN</div>
          <p style={{ fontSize: ".86rem", color: MID, lineHeight: 1.75, maxWidth: "28ch", marginBottom: "1rem" }}>{SITE.tagline} Healthcare, commercial, and roofing across Texas.</p>
          <p style={{ fontSize: ".86rem", lineHeight: 1.9 }}>
            <a href={telHref} style={{ color: WHITE }}>{SITE.phone}</a><br />
            <a href={mailHref} style={{ color: WHITE }}>{SITE.email}</a>
          </p>
        </div>
        {Object.entries(cols).map(([heading, links]) => <div key={heading}>
          <h4 style={{ fontSize: ".7rem", letterSpacing: ".18em", textTransform: "uppercase", color: MUTED, marginBottom: "1rem", fontWeight: 600 }}>{heading}</h4>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: ".55rem" }}>
            {links.map(([lbl, id]) => <li key={lbl}><button onClick={() => go(id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: ".86rem", color: MID, textAlign: "left" }}>{lbl}</button></li>)}
          </ul>
        </div>)}
      </div>
      <Divider />
      <div style={{ paddingTop: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem" }}>
        <p style={{ fontSize: ".76rem", color: MUTED }}>© {yr} {SITE.company}. All rights reserved.</p>
        <p style={{ fontSize: ".74rem", color: FAINT }}>Established {SITE.founded}{CREDENTIALS.length ? " · " + CREDENTIALS.join(" · ") : ""}</p>
      </div>
    </div>
  </footer>;
}

/* ── App ── */
export default function App() {
  const [toasts, addToast] = useToasts();
  return <div style={{ position: "relative" }}>
    <Nav />
    <main>
      <Hero />
      <CertStrip />
      <Services />
      <Work />
      <Roofing />
      <About />
      <FAQ />
      <Contact addToast={addToast} />
    </main>
    <Footer />
    <CallBar />
    <Toasts list={toasts} />
  </div>;
}
