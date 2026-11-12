'use strict';
/**
 * GEO visibility preview engine.
 *
 * For a brand + category it builds buyer-style questions, samples live AI
 * answers through the production KHAAN.SI answer pipeline (POST /api/ask,
 * field `q`), then checks whether the brand appears in the answer text and
 * which known competitors appear instead.
 *
 * Honesty rules (project-wide):
 * - Results are always labeled with engine + sampled_at.
 * - If live sampling fails, we fall back to a clearly labeled snapshot demo
 *   with a fictional brand — never silent fake "live" data.
 */

const KHAAN_ASK_URL = process.env.KHAAN_ASK_URL || 'https://khaan.si/api/ask';
const SAMPLE_TIMEOUT_MS = Number(process.env.PREVIEW_TIMEOUT_MS || 45000);

const CATEGORIES = {
  'ai-video': {
    label: 'AI video tools',
    questions: [
      'What is the best AI video generator in 2026?',
      'Which AI video tool is best for making marketing videos?',
      'What AI tools can turn text into professional videos?',
      'What is the best AI avatar video maker for businesses?',
      'Which AI video generator do creators recommend most?',
    ],
    competitors: ['Runway', 'Pictory', 'Synthesia', 'HeyGen', 'OpusClip', 'Kling', 'Pika', 'Luma', 'InVideo', 'Fliki'],
  },
  'ai-chatbots': {
    label: 'AI chatbots',
    questions: [
      'What is the best AI chatbot for customer support?',
      'Which AI chatbot should a small business put on its website?',
      'What are the top AI chatbots for sales in 2026?',
      'Which website chatbot answers customer questions automatically?',
      'What is the best no-code AI chatbot builder?',
    ],
    competitors: ['Intercom', 'Drift', 'Chatbase', 'Tidio', 'Zendesk', 'Crisp', 'ManyChat', 'Landbot'],
  },
  vpn: {
    label: 'VPN services',
    questions: [
      'What is the best VPN in 2026?',
      'Which VPN is fastest for streaming?',
      'What VPN do privacy experts recommend?',
      'Which VPN works best for travel?',
      'What is the best budget VPN?',
    ],
    competitors: ['NordVPN', 'ExpressVPN', 'Surfshark', 'Proton VPN', 'CyberGhost', 'Mullvad', 'Private Internet Access'],
  },
  'ai-image': {
    label: 'AI image tools',
    questions: [
      'What is the best AI image generator in 2026?',
      'Which AI image tool do designers use most?',
      'What is the best AI logo maker?',
      'Which AI image generator is best for marketing?',
      'What AI tool makes product photos?',
    ],
    competitors: ['Midjourney', 'DALL·E', 'Stable Diffusion', 'Leonardo', 'Ideogram', 'Firefly', 'Canva'],
  },
  custom: { label: 'Custom category', questions: null, competitors: [] },
};

function buildQuestions(categoryKey, brand) {
  const cat = CATEGORIES[categoryKey] || CATEGORIES.custom;
  if (cat.questions) return cat.questions;
  return [
    `What is the best ${'product'} in this category in 2026?`,
    `Which brands lead this category right now?`,
    `What would you recommend instead of ${brand}?`,
    `What are the top-rated options in this category?`,
    `Which is the most popular choice in this category?`,
  ];
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff ]/gi, ' ');
}

function mentions(text, name) {
  if (!name) return false;
  const hay = normalize(text);
  const needle = normalize(name).trim();
  if (!needle) return false;
  return hay.includes(needle);
}

async function askKhaan(question) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SAMPLE_TIMEOUT_MS);
  try {
    const res = await fetch(KHAAN_ASK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: question }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`khaan ask ${res.status}`);
    const raw = await res.text();
    // The production API streams; accept JSON or plain text defensively.
    try {
      const data = JSON.parse(raw);
      return data.answer || data.text || data.result || raw;
    } catch {
      return raw;
    }
  } finally {
    clearTimeout(timer);
  }
}

function snapshotFallback(brand, categoryKey) {
  const demoBrand = 'NotePilot AI';
  const cat = CATEGORIES[categoryKey] || CATEGORIES['ai-video'];
  const questions = (cat.questions || []).slice(0, 5);
  const rows = questions.map((q, i) => ({
    question: q,
    brandMentioned: i === 2,
    competitorsFound: (cat.competitors || []).slice(i % 3, (i % 3) + 2),
  }));
  const hits = rows.filter((r) => r.brandMentioned).length;
  return {
    mode: 'snapshot',
    brand: demoBrand,
    note: `Live sampling is unavailable right now. This is a labeled snapshot walkthrough using the fictional brand "${demoBrand}". Your input was "${brand}".`,
    category: cat.label,
    engine: 'snapshot (KHAAN.SI pipeline offline fallback)',
    sampled_at: new Date().toISOString(),
    summary: { asked: rows.length, mentioned: hits, absent: rows.length - hits },
    rows,
    commentary:
      'In this snapshot the example brand appears in only one sampled answer while established competitors are named repeatedly — the pattern a full multi-engine audit quantifies and then fixes.',
  };
}

async function generatePreview({ brand, url, category }) {
  const categoryKey = CATEGORIES[category] ? category : 'ai-video';
  const cat = CATEGORIES[categoryKey];
  const questions = buildQuestions(categoryKey, brand).slice(0, 5);
  try {
    // Ask all five questions concurrently: serial asks summed to ~60s+ and
    // tripped gateway timeouts on the proxied path. Same semantics — every
    // answer is still a live sample, and any failure still falls back to
    // the labeled snapshot below.
    const answers = await Promise.all(questions.map((q) => askKhaan(q)));
    const rows = questions.map((q, i) => {
      const answer = answers[i];
      const found = (cat.competitors || []).filter((c) => mentions(answer, c));
      return {
        question: q,
        brandMentioned: mentions(answer, brand) || (url ? mentions(answer, url.replace(/^https?:\/\//, '')) : false),
        competitorsFound: found.slice(0, 4),
      };
    });
    const hits = rows.filter((r) => r.brandMentioned).length;
    const rivalCounts = {};
    for (const r of rows) for (const c of r.competitorsFound) rivalCounts[c] = (rivalCounts[c] || 0) + 1;
    const topRivals = Object.entries(rivalCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
    return {
      mode: 'live',
      brand,
      url: url || null,
      category: cat.label,
      engine: 'KHAAN.SI live search + answer pipeline (single engine, single sample)',
      sampled_at: new Date().toISOString(),
      summary: { asked: rows.length, mentioned: hits, absent: rows.length - hits },
      rows,
      commentary:
        hits === 0
          ? `${brand} did not appear in any of the ${rows.length} sampled answers. ${topRivals.length ? `The answers named ${topRivals.join(', ')} instead. ` : ''}That absence — not a lower rank — is what a full GEO audit measures across engines and then fixes.`
          : `${brand} appeared in ${hits} of ${rows.length} sampled answers. ${topRivals.length ? `Competitors named in the same answers: ${topRivals.join(', ')}. ` : ''}A full audit widens this to more engines and question sets, and adds the fix plan.`,
    };
  } catch (err) {
    return snapshotFallback(brand, categoryKey);
  }
}

module.exports = { CATEGORIES, generatePreview };
