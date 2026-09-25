import { LuHouse, LuChevronRight, LuPlay, LuHeart, LuUsers, LuZap, LuShield, LuMail, LuCheck, LuInfo, LuFileText, LuLock, LuCookie, LuActivity, LuClock, LuSparkles, LuQuote, LuCode, LuServer, LuDatabase } from 'react-icons/lu'
import { useUser } from './UserContext.jsx'
import './App.css'

const TOPICS = {
  'about': {
    icon: LuHeart,
    eyebrow: 'Company',
    title: 'About TYELA',
    tagline: 'Movie night, together — even when you are apart.',
    paragraphs: [
      'TYELA started with a simple problem: movie nights with the people you love should not end just because you live in different cities. We built a watch party that keeps everyone on the same frame, in the same moment, no matter where they are.',
      'Today TYELA powers synchronized watch nights for couples and friend groups around the world. One person presses play, everyone watches together — pause for popcorn, talk in the side chat, and never race ahead of each other again.',
    ],
    bullets: [
      { icon: LuZap, heading: 'Frame-perfect sync', text: 'Play, pause and seek happen for everyone at the same instant.' },
      { icon: LuShield, heading: 'Private by design', text: 'Join with private room codes — no public profiles, no data selling.' },
      { icon: LuHeart, heading: 'Made for movie nights', text: 'Live chat, emoji reactions and a cozy side-by-side experience.' },
    ],
    cta: 'Start watching',
  },
  'careers': {
    icon: LuSparkles,
    eyebrow: 'Company',
    title: 'Careers',
    tagline: 'Build the best movie night on the internet.',
    paragraphs: [
      'We are a small, remote-first team obsessed with latency, empathy and great popcorn. We build real-time infrastructure and product experiences that feel warm and human.',
      'If you love crafting low-latency systems, sharp product design, or just moving pixels and packets fast, we would love to hear from you.',
    ],
    bullets: [
      { icon: LuClock, heading: 'Remote-first', text: 'Work from anywhere. Async writing, focused deep work.' },
      { icon: LuUsers, heading: 'Small and senior', text: 'Every hire moves the needle — no bureaucracy.' },
      { icon: LuMail, heading: 'Open roles', text: 'Engineering, Design, Growth. See Contact to say hi.' },
    ],
    cta: 'Say hello',
  },
  'pricing': {
    icon: LuZap,
    eyebrow: 'Product',
    title: 'Pricing',
    tagline: 'Free to fall in love with. Simple when you grow.',
    paragraphs: [
      'TYELA is free for couples and small groups. If you need bigger rooms, higher quality streams or custom branding, we keep one simple upgrade path — no confusing tiers, no per-seat math.',
    ],
    bullets: [
      { icon: LuCheck, heading: 'Free — forever', text: 'Couple watch parties, group rooms up to 6 friends, live chat and reactions.' },
      { icon: LuSparkles, heading: 'TYELA Plus', text: 'Bigger groups, crystal-clear playback, custom avatars and themes.' },
      { icon: LuShield, heading: 'Teams', text: 'For communities and creators. Custom rooms, analytics and priority sync.' },
    ],
    cta: 'Get started',
  },
  'contact': {
    icon: LuMail,
    eyebrow: 'Company',
    title: 'Contact',
    tagline: 'We usually reply within one business day.',
    paragraphs: [
      'Questions, feedback or partnership ideas? Send us a note. For support, mention the room code or account email and we will get back to you fast.',
    ],
    bullets: [
      { icon: LuMail, heading: 'Support', text: 'hello@tyela.app' },
      { icon: LuUsers, heading: 'Community', text: 'Join the TYELA community server for tips and movie night ideas.' },
      { icon: LuFileText, heading: 'Press', text: 'Media kits, logos and story requests — press@tyela.app' },
    ],
    cta: 'Start watching',
  },
  'privacy': {
    icon: LuLock,
    eyebrow: 'Legal',
    title: 'Privacy',
    tagline: 'Your movie nights are yours.',
    paragraphs: [
      'We collect only what is needed to run a watch party: your account info, room codes you create, and what is playing. We do not sell personal data, and we never show your activity to anyone outside your rooms.',
      'You can export or delete your data at any time from your profile. We keep connection metadata only as long as needed to keep your sessions healthy.',
    ],
    bullets: [
      { icon: LuUsers, heading: 'Room-scoped', text: 'Presence and chat are visible only to members of your room.' },
      { icon: LuLock, heading: 'Encrypted in transit', text: 'All traffic is TLS-secured between your device and our servers.' },
      { icon: LuCheck, heading: 'Your control', text: 'Export or delete your account whenever you like.' },
    ],
    cta: 'Back to home',
  },
  'terms': {
    icon: LuFileText,
    eyebrow: 'Legal',
    title: 'Terms of Service',
    tagline: 'Fair, short, and written for humans.',
    paragraphs: [
      'By using TYELA you agree to keep things civil: respect other viewers, do not share access to rooms people did not invite you into, and do not use the service for anything illegal.',
      'You own the content of your chats and watch history. We may improve the service and change features over time, and we will tell you before any policy that matters to you changes.',
    ],
    bullets: [
      { icon: LuShield, heading: 'Your responsibility', text: 'Keep your account credentials safe and room codes private.' },
      { icon: LuCheck, heading: 'No guarantees', text: 'We aim for 99.9% uptime but services can have hiccups — as can the internet.' },
      { icon: LuInfo, heading: 'Questions?', text: 'Anything unclear, just contact us.' },
    ],
    cta: 'Back to home',
  },
  'cookies': {
    icon: LuCookie,
    eyebrow: 'Legal',
    title: 'Cookie Policy',
    tagline: 'Small bites only. Nothing creepy.',
    paragraphs: [
      'We use a few cookies to keep you signed in and to remember your preferences between visits. We keep them light and never use third-party ad trackers.',
    ],
    bullets: [
      { icon: LuCheck, heading: 'Essential', text: 'Session tokens so you stay logged in across the app.' },
      { icon: LuClock, heading: 'Preferences', text: 'Remember your theme, mode and recent session.' },
      { icon: LuInfo, heading: 'No ads', text: 'We do not run third-party advertising or sell browsing data.' },
    ],
    cta: 'Back to home',
  },
  'press': {
    icon: LuActivity,
    eyebrow: 'Company',
    title: 'Press',
    tagline: 'Stories, logo and guidelines for media.',
    paragraphs: [
      'TYELA is reinventing how couples and friends watch movies together. For interviews, logos and fact sheets, reach out to press@tyela.app.',
    ],
    bullets: [
      { icon: LuFileText, heading: 'Media kit', text: 'Logos in every format, brand guidelines and product screenshots.' },
      { icon: LuMail, heading: 'Inquiries', text: 'press@tyela.app — we reply within the day.' },
    ],
    cta: 'Start watching',
  },
  'status': {
    icon: LuActivity,
    eyebrow: 'System',
    title: 'System status',
    tagline: 'All systems operational.',
    paragraphs: [
      'Our sync engine, rooms and API are humming along. If something looks off, check back here or contact support with your room code.',
    ],
    bullets: [
      { icon: LuCheck, heading: 'Sync engine', text: 'Operational.' },
      { icon: LuUsers, heading: 'Rooms & chat', text: 'Operational.' },
      { icon: LuZap, heading: 'API', text: 'Operational.' },
    ],
    cta: 'Back to home',
  },
  'sync-engine': {
    icon: LuZap,
    eyebrow: 'Product',
    title: 'Sync engine',
    tagline: 'Frame-perfect, wherever you are.',
    paragraphs: [
      'Every room rides on a server-authoritative clock. Play, pause and seek are broadcast and re-synced over the wire, so an identical frame reaches every screen at the same moment — even with different networks.',
    ],
    bullets: [
      { icon: LuZap, heading: 'Server clock', text: 'One timeline for the whole room, no drift.' },
      { icon: LuShield, heading: 'Reconnects cleanly', text: 'Drop a network and you re-sync instantly when muted back.' },
    ],
    cta: 'Try it',
  },
  'couple-watch': {
    icon: LuHeart,
    eyebrow: 'Product',
    title: 'Couple watch',
    tagline: 'Two screens, one heartbeat.',
    paragraphs: [
      'Generate a private pairing code, have your partner connect, then press play. You watch the same movie with live chat and a shared timeline made for two.',
    ],
    bullets: [
      { icon: LuCheck, heading: 'Private code', text: 'No accounts to search — the code is the invitation.' },
      { icon: LuHeart, heading: 'Together-ness', text: 'Presence dots, notes, and reactions just for the two of you.' },
    ],
    cta: 'Start watching',
  },
  'group-watch': {
    icon: LuUsers,
    eyebrow: 'Product',
    title: 'Group watch',
    tagline: 'The whole crew, in sync.',
    paragraphs: [
      'Host a room, share the code, and up to six friends join your frame-perfect watch party with live chat and emoji reactions.',
    ],
    bullets: [
      { icon: LuUsers, heading: 'Up to 6 friends', text: 'Room codes keep it cozy and private.' },
      { icon: LuZap, heading: 'Shared controls', text: 'Anyone can pause for the group — the host stays in charge.' },
    ],
    cta: 'Host a room',
  },
}

const InfoPage = ({ topic, onNavigate }) => {
  const { isLoggedIn } = useUser()
  const data = TOPICS[topic] || TOPICS.about
  const Icon = data.icon

  return (
    <div className="info-page">
      <button className="back-home" onClick={() => onNavigate('')}>
        <LuHouse /> Home
      </button>

      <div className="info-card">
        <span className="info-icon"><Icon size={26} /></span>
        <span className="info-eyebrow">{data.eyebrow}</span>
        <h1>{data.title}</h1>
        <p className="info-tagline">{data.tagline}</p>

        {topic === 'about' && (
          <div className="info-quote">
            <LuQuote size={18} />
            <p>
              TYELA was built because watching movies together shouldn&apos;t mean
              being in the same room. Built with React, Node.js, and MongoDB.
            </p>
          </div>
        )}

        <div className="info-body">
          {data.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <div className="info-bullets">
          {data.bullets.map((bullet, i) => (
            <div className="info-bullet" key={i}>
              <span className="bullet-icon"><bullet.icon size={17} /></span>
              <div>
                <strong>{bullet.heading}</strong>
                <p>{bullet.text}</p>
              </div>
            </div>
          ))}
        </div>

        {topic === 'about' && (
          <div className="info-builtby">
            <span className="builder-avatar">TU</span>
            <div className="builder-meta">
              <span className="builder-label">Built by</span>
              <strong className="builder-name">Tuyife</strong>
              <p className="builder-bio">
                Self-taught web developer based in Ibadan, Nigeria.
              </p>
            </div>
            <div className="builder-tech">
              <span className="tech-chip"><LuCode size={14} /> React</span>
              <span className="tech-chip"><LuServer size={14} /> Node.js</span>
              <span className="tech-chip"><LuDatabase size={14} /> MongoDB</span>
            </div>
          </div>
        )}

        <button className="btn-primary info-cta" onClick={() => onNavigate(isLoggedIn ? 'dashboard' : 'signup')}>
          {data.cta} <LuChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

export default InfoPage