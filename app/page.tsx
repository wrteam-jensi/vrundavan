import Image from 'next/image';
import './globals.css';

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Farmhouse since 2010</p>
          <h1>Vrundavan Farmhouse</h1>
          <p>Welcome to Vrundavan, a peaceful farmhouse retreat rooted in nature and warm hospitality.</p>
          <div className="stats-grid">
            <div>
              <strong>Established</strong>
              <span>2010</span>
            </div>
            <div>
              <strong>Location</strong>
              <span>Rural retreat</span>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <Image src="/farmlogo.png" alt="Vrundavan Farmhouse Logo" width={420} height={280} priority />
        </div>
      </section>

      <section className="details">
        <h2>About Vrundavan</h2>
        <p>
          Vrundavan Farmhouse opened in 2010 with a vision to combine calm natural living, comfortable farmhouse lodging, and curated family experiences.
        </p>
        <div className="feature-list">
          <article>
            <h3>Homegrown Hospitality</h3>
            <p>A welcoming farmhouse environment that feels like a home away from home.</p>
          </article>
          <article>
            <h3>Natural Surroundings</h3>
            <p>Green fields, quiet mornings, and open skies to refresh and recharge.</p>
          </article>
          <article>
            <h3>Simple Relaxation</h3>
            <p>Outdoor spaces, local produce, and laid-back farmhouse charm.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
