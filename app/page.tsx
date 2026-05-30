'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const PRODUCE = [
  { cls: 'pc-fruits',  emoji: '🍋', name: 'Seasonal Fruits',    tag: 'Tree-Fresh',    desc: 'Mangoes, guavas, papayas, bananas — harvested at peak ripeness and delivered same day.' },
  { cls: 'pc-veggies', emoji: '🥦', name: 'Fresh Vegetables',   tag: 'Chemical-Free', desc: 'Tomatoes, brinjal, okra, bitter gourd — grown without synthetic chemicals or pesticides.' },
  { cls: 'pc-leafy',   emoji: '🥬', name: 'Leafy Greens',       tag: 'Organic',       desc: 'Spinach, fenugreek, coriander — tender, nutrient-rich leaves picked fresh every morning.' },
  { cls: 'pc-root',    emoji: '🥕', name: 'Root Vegetables',    tag: 'Soil-Rich',     desc: 'Carrots, beetroot, sweet potato, radish — deep-rooted in mineral-rich organic soil.' },
  { cls: 'pc-herbs',   emoji: '🌿', name: 'Herbs & Medicinal',  tag: 'Natural',       desc: 'Tulsi, curry leaves, lemongrass, ginger — traditional varieties grown the natural way.' },
  { cls: 'pc-exotic',  emoji: '🍈', name: 'Exotic & Rare',      tag: 'Limited',       desc: 'Dragon fruit, starfruit, jackfruit — specialty crops grown with care and patience.' },
];

const WHY = [
  { icon: '🌱', title: 'Zero Chemicals',        desc: 'No synthetic fertilisers, pesticides, or hormones. Only natural compost and organic inputs.' },
  { icon: '💧', title: 'Natural Water Source',  desc: 'Crops irrigated from bore-well and rainwater harvesting — pure from the ground up.' },
  { icon: '☀️', title: 'Sun-Ripened Always',    desc: 'Nothing is artificially ripened. Every fruit and vegetable matures on the plant, naturally.' },
  { icon: '🔄', title: 'Seasonal Rotation',     desc: 'Crops rotate seasonally to restore soil health and maintain nutritional quality year-round.' },
  { icon: '📦', title: 'Farm to Your Door',     desc: 'Harvested, sorted, and dispatched on the same day. Zero cold-storage intermediaries.' },
  { icon: '👨‍🌾', title: '15 Years of Expertise', desc: 'Since 2010, our farmers have honed traditional techniques passed down through generations.' },
];

const CROPS = [
  { cls: 'crop-bajra',     emoji: '🌾', name: 'Pearl Millet', local: 'Bajra',    desc: 'Drought-resistant staple grain cultivated across our drylands, rich in iron and fibre.' },
  { cls: 'crop-wheat',     emoji: '🌿', name: 'Wheat',        local: 'Ghau',     desc: 'High-yield wheat varieties grown in cooler months, milled locally for wholesome flour.' },
  { cls: 'crop-cotton',    emoji: '🌸', name: 'Cotton',       local: 'Kapas',    desc: 'Premium-quality cotton bolls cultivated on well-drained soil for superior fibre yield.' },
  { cls: 'crop-castor',    emoji: '🌱', name: 'Castor',       local: 'Erandi',   desc: 'High oil-content castor beans grown for industrial and medicinal applications.' },
  { cls: 'crop-coriander', emoji: '🌿', name: 'Coriander',    local: 'Dhana',    desc: 'Aromatic coriander seeds and leaves — a staple herb across Indian kitchens.' },
  { cls: 'crop-groundnut', emoji: '🥜', name: 'Groundnut',    local: 'Mungfali', desc: 'Nutrient-rich peanuts grown in sandy loam soil, harvested for oil and direct use.' },
];

const GALLERY = [
  { cls: 'gi-1', label: 'Morning Harvest' },
  { cls: 'gi-2', label: 'Sun-Ripened Fruits' },
  { cls: 'gi-3', label: 'Green Fields' },
  { cls: 'gi-4', label: 'Fresh Produce' },
  { cls: 'gi-5', label: "Nature's Bounty" },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible');
        }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale').forEach((el) =>
      observer.observe(el)
    );

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* ── Navbar ── */}
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <span className="nav-brand">Vrundavan Farm</span>
        <ul className="nav-links">
          <li><a href="#produce">Our Produce</a></li>
          <li><a href="#crops">Crops</a></li>
          <li><a href="#story">Our Story</a></li>
          <li><a href="#gallery">Gallery</a></li>
          <li><a href="#location">Location</a></li>
          <li><a href="#contact" className="nav-cta">Order Fresh</a></li>
        </ul>
      </nav>

      {/* ── Hero ── */}
      <section className="hero" aria-label="Hero">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="particle p1" />
        <div className="particle p2" />
        <div className="particle p3" />
        <div className="particle p4" />
        <div className="particle p5" />

        <div className="hero-left">
          <p className="hero-eyebrow">Natural Farm Since 2010</p>
          <h1 className="hero-title">
            Straight From<br />
            <span className="hero-title-accent">Farm to Your</span><br />
            Table
          </h1>
          <p className="hero-sub">
            At Vrundavan Farm, we grow fresh fruits and vegetables the way
            nature intended — no chemicals, no shortcuts, just honest soil,
            clean water, and abundant sunshine.
          </p>
          <div className="hero-actions">
            <a href="#contact" className="btn-primary">Order Fresh Produce →</a>
            <a href="#produce" className="btn-outline">See What We Grow</a>
          </div>
        </div>

        <div className="hero-right">
          <div className="logo-stage">
            <div className="logo-glow-ring" />
            <div className="logo-bg-circle" />
            <Image
              src="/farmlogo.png"
              alt="Vrundavan Farm — Natural Fruits & Vegetables"
              width={320}
              height={320}
              priority
              className="logo-img"
            />
          </div>
        </div>

        <div className="scroll-hint" aria-hidden="true">
          <span>Scroll</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="stats-bar" role="region" aria-label="Farm stats">
        {[
          { num: '15+', lbl: 'Years Farming' },
          { num: '40+', lbl: 'Crop Varieties' },
          { num: '12',  lbl: 'Acres of Land' },
          { num: '100%', lbl: 'Chemical-Free' },
        ].map((s, i) => (
          <div key={s.lbl} className={`stat-cell reveal d${i + 1}`}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Produce ── */}
      <section id="produce" className="section produce-section">
        <div className="container">
          <div className="reveal">
            <p className="eyebrow">What We Grow</p>
            <h2 className="sec-title">Fresh from Vrundavan Fields</h2>
            <p className="sec-desc">
              Every crop is grown in clean, chemical-free soil using traditional
              organic methods refined over 15 years of farming.
            </p>
          </div>
          <div className="produce-grid">
            {PRODUCE.map((p, i) => (
              <article key={p.name} className={`produce-card reveal d${(i % 3) + 1}`}>
                <div className={`produce-card-banner ${p.cls}`}>
                  <span>{p.emoji}</span>
                </div>
                <div className="produce-card-body">
                  <h3 className="produce-card-title">{p.name}</h3>
                  <p className="produce-card-desc">{p.desc}</p>
                  <span className="produce-tag">{p.tag}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Natural ── */}
      <section className="section why-section">
        <div className="container">
          <div className="why-header">
            <div>
                <p className="eyebrow eyebrow-gold-light">
                Why Natural Farming
              </p>
              <h2 className="sec-title reveal" style={{ color: 'white', maxWidth: 480 }}>
                The Vrundavan Difference
              </h2>
            </div>
            <p className="sec-desc reveal" style={{ color: 'rgba(255,255,255,.62)' }}>
              We believe food grown in harmony with nature is food that truly nourishes.
              Every practice on our farm reflects that belief.
            </p>
          </div>
          <div className="why-grid">
            {WHY.map((w, i) => (
              <article key={w.title} className={`why-card reveal d${(i % 3) + 1}`}>
                <span className="why-icon">{w.icon}</span>
                <h3 className="why-title">{w.title}</h3>
                <p className="why-desc">{w.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Story ── */}
      <section id="story" className="section story-section">
        <div className="container">
          <div className="story-grid">
            <div className="story-img-stack reveal-left">
              <div className="story-card story-card-main">
                <Image
                  src="/farmlogo.png"
                  alt="Vrundavan Farm"
                  width={300}
                  height={380}
                  style={{ objectFit: 'contain', padding: '24px' }}
                />
              </div>
              <div className="story-card story-card-secondary">
                <div className="story-card-content">
                  <div className="story-card-big">2010</div>
                  <div className="story-card-small">Established</div>
                </div>
              </div>
            </div>

            <div className="story-text reveal-right">
              <p className="eyebrow eyebrow-leaf">Our Story</p>
              <h2 className="sec-title">Rooted in Nature, Grown with Love</h2>
              <p className="sec-desc">
                Vrundavan Farm began in 2010 with a simple conviction — that the
                best food comes from land that is cared for, not exploited. Over
                fifteen years, we have cultivated more than 40 varieties of fruits
                and vegetables on 12 acres of chemical-free land.
              </p>
              <div className="story-points">
                {[
                  { icon: '🌍', title: 'Soil First Approach',    desc: 'We enrich the soil naturally through composting, crop rotation, and bio-fertilisers.' },
                  { icon: '🤝', title: 'Community Rooted',       desc: 'Employing local farmers and supporting sustainable livelihoods in our region.' },
                  { icon: '🌦️', title: 'Climate Adaptive',       desc: 'Seasonal crop planning that works with local weather patterns, not against them.' },
                ].map((pt) => (
                  <div key={pt.title} className="story-point">
                    <div className="story-icon">{pt.icon}</div>
                    <div>
                      <div className="story-point-title">{pt.title}</div>
                      <div className="story-point-desc">{pt.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Crops ── */}
      <section id="crops" className="section crops-section">
        <div className="container">
          <div className="reveal">
            <p className="eyebrow">Agricultural Production</p>
            <h2 className="sec-title">What We Cultivate</h2>
            <p className="sec-desc">
              Our farm produces a diverse range of crops using efficient farming
              practices to ensure quality yield and sustainable agricultural production.
            </p>
          </div>
          <div className="crops-grid">
            {CROPS.map((c, i) => (
              <article key={c.name} className={`crop-card reveal d${(i % 3) + 1}`}>
                <div className={`crop-img-placeholder ${c.cls}`}>
                  <span>{c.emoji}</span>
                  <span className="crop-placeholder-label">Add photo</span>
                </div>
                <div className="crop-card-body">
                  <div className="crop-card-name">{c.name}</div>
                  <div className="crop-card-local">{c.local}</div>
                  <p className="crop-card-desc">{c.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gallery ── */}
      <section id="gallery" className="section gallery-section">
        <div className="container">
          <div className="reveal">
            <p className="eyebrow">Life at the Farm</p>
            <h2 className="sec-title">A Glimpse of Vrundavan</h2>
          </div>
          <div className="gallery-grid">
            {GALLERY.map((g, i) => (
              <div key={g.label} className={`g-card reveal-scale d${i + 1}`}>
                <div className={`g-inner ${g.cls}`}>
                  <span className="g-label">{g.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Location ── */}
      <section id="location" className="section location-section">
        <div className="container">
          <div className="location-grid">
            <div className="reveal-left">
              <p className="eyebrow">Visit Us</p>
              <h2 className="sec-title">Find Vrundavan Farm</h2>
              <p className="sec-desc">
                We are located in Mankuva village. Come visit, see how your food
                is grown, and take home the freshest produce straight from the field.
              </p>
              <div className="loc-details">
                <div className="loc-row">
                  <span className="loc-icon">📍</span>
                  <div>
                    <div className="loc-label">Address</div>
                    <div className="loc-value">Vrundavan Farm, Mankuva, Gujarat, India</div>
                  </div>
                </div>
                <div className="loc-row">
                  <span className="loc-icon">🕗</span>
                  <div>
                    <div className="loc-label">Farm Hours</div>
                    <div className="loc-value">Monday – Saturday, 7:00 AM – 6:00 PM</div>
                  </div>
                </div>
                <div className="loc-row">
                  <span className="loc-icon">📞</span>
                  <div>
                    <div className="loc-label">Phone</div>
                    <div className="loc-value"><a href="tel:+919726726134" style={{ color: 'var(--forest)', fontWeight: 600 }}>+91 97267 26134</a></div>
                  </div>
                </div>
              </div>
              <a
                href="https://maps.google.com/?q=23.200955,69.542667"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ marginTop: '32px', display: 'inline-flex' }}
              >
                Open in Google Maps →
              </a>
            </div>

            <div className="map-wrapper reveal-right">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4770.084985577668!2d69.54266696630644!3d23.200955008689157!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39511957305babf9%3A0x56d39b7c30c8a46b!2sVrundavan%20farm%20mankuva!5e1!3m2!1sen!2sin!4v1780114355886!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Vrundavan Farm location on Google Maps"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="contact" className="cta-section">
        <h2 className="cta-title reveal">Get Fresh Produce Delivered</h2>
        <p className="cta-desc reveal">
          Order directly from Vrundavan Farm — harvested this morning, at your
          door by evening. 100% natural, zero compromise.
        </p>
        <a href="tel:+919726726134" className="btn-dark reveal">📞 +91 97267 26134 — Call to Order</a>
      </section>

      {/* ── Footer ── */}
      <footer>
        <div className="footer-grid">
          <div>
            <div className="footer-brand">Vrundavan Farm</div>
            <p className="footer-tagline">
              Natural fruits and vegetables grown without chemicals since 2010.
              Because real food starts with real farming.
            </p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#produce">Our Produce</a></li>
              <li><a href="#story">Our Story</a></li>
              <li><a href="#gallery">Gallery</a></li>
              <li><a href="#location">Location</a></li>
              <li><a href="#contact">Order Fresh</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              <li><a href="#location">Mankuva, Gujarat, India</a></li>
              <li><a href="tel:+919726726134">+91 97267 26134</a></li>
              <li><a href="mailto:info@vrundavan.com">info@vrundavan.com</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Vrundavan Farm. All rights reserved.</span>
          <span>Grown naturally since 2010</span>
        </div>
      </footer>
    </>
  );
}
