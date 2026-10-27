import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { initDb, savePlan, getPlanById, getRecentPlans, getDbStatus } from './db/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory caches to speed up requests & protect against external API rate limits
const cache = {
  countries: null,
  holidays: new Map()
};

// Curated high-quality backup activities for fallback if Bored API is unreachable
const fallbackActivities = [
  { activity: "Host a themed potluck dinner with friends", type: "social", participants: 4, price: 0.2, accessibility: "Few to no challenges" },
  { activity: "Explore a nearby nature trail or botanical garden", type: "recreational", participants: 2, price: 0, accessibility: "Few to no challenges" },
  { activity: "Organize a board game or tabletop RPG tournament", type: "social", participants: 4, price: 0.05, accessibility: "Few to no challenges" },
  { activity: "Bake traditional festival cookies or pastries together", type: "cooking", participants: 2, price: 0.15, accessibility: "Few to no challenges" },
  { activity: "Have an outdoor picnic and acoustic music session", type: "music", participants: 3, price: 0.1, accessibility: "Few to no challenges" },
  { activity: "Visit a local history or contemporary art museum", type: "education", participants: 2, price: 0.2, accessibility: "Few to no challenges" },
  { activity: "Volunteer at an animal shelter or community food bank", type: "charity", participants: 2, price: 0, accessibility: "Minor challenges" },
  { activity: "Make a scrapbook or photo album celebrating past holidays", type: "diy", participants: 1, price: 0.15, accessibility: "Few to no challenges" },
  { activity: "Stargaze at a nearby scenic lookout point with hot cocoa", type: "relaxation", participants: 2, price: 0.05, accessibility: "Few to no challenges" },
  { activity: "Plan a community movie marathon with popcorn and trivia", type: "social", participants: 5, price: 0.1, accessibility: "Few to no challenges" }
];

// Fallback countries list in case Nager.Date API is temporarily down
const fallbackCountries = [
  { countryCode: "US", name: "United States" },
  { countryCode: "GB", name: "United Kingdom" },
  { countryCode: "IN", name: "India" },
  { countryCode: "CA", name: "Canada" },
  { countryCode: "AU", name: "Australia" },
  { countryCode: "DE", name: "Germany" },
  { countryCode: "FR", name: "France" },
  { countryCode: "JP", name: "Japan" },
  { countryCode: "BR", name: "Brazil" },
  { countryCode: "SG", name: "Singapore" }
];

// Special gazetted holiday fallback for India or 204 responses from Nager.Date
const fallbackIndianHolidays = [
  { date: "2026-01-26", localName: "Republic Day", name: "Republic Day", countryCode: "IN", fixed: true, global: true, types: ["Public", "National"] },
  { date: "2026-03-04", localName: "Holi", name: "Holi (Festival of Colors)", countryCode: "IN", fixed: false, global: true, types: ["Public", "Gazetted"] },
  { date: "2026-03-21", localName: "Eid-ul-Fitr", name: "Eid-ul-Fitr", countryCode: "IN", fixed: false, global: true, types: ["Public", "Gazetted"] },
  { date: "2026-04-03", localName: "Good Friday", name: "Good Friday", countryCode: "IN", fixed: false, global: true, types: ["Public", "Gazetted"] },
  { date: "2026-08-15", localName: "Independence Day", name: "Independence Day", countryCode: "IN", fixed: true, global: true, types: ["Public", "National"] },
  { date: "2026-08-27", localName: "Milad-un-Nabi", name: "Milad-un-Nabi", countryCode: "IN", fixed: false, global: true, types: ["Public", "Gazetted"] },
  { date: "2026-10-02", localName: "Mahatma Gandhi Jayanti", name: "Mahatma Gandhi's Birthday", countryCode: "IN", fixed: true, global: true, types: ["Public", "National"] },
  { date: "2026-10-20", localName: "Dussehra", name: "Vijaya Dashami (Dussehra)", countryCode: "IN", fixed: false, global: true, types: ["Public", "Gazetted"] },
  { date: "2026-11-08", localName: "Diwali", name: "Diwali (Festival of Lights)", countryCode: "IN", fixed: false, global: true, types: ["Public", "Gazetted"] },
  { date: "2026-11-24", localName: "Guru Nanak Jayanti", name: "Guru Nanak Jayanti", countryCode: "IN", fixed: false, global: true, types: ["Public", "Gazetted"] },
  { date: "2026-12-25", localName: "Christmas", name: "Christmas Day", countryCode: "IN", fixed: true, global: true, types: ["Public", "Gazetted"] }
];

// --- API Endpoints ---

// Health & Neon DB status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: getDbStatus()
  });
});

app.get('/api/db/status', (req, res) => {
  res.json(getDbStatus());
});

// 1. Nager.Date API: Available Countries
app.get('/api/countries', async (req, res) => {
  if (cache.countries) {
    return res.json({ success: true, source: 'cache', data: cache.countries });
  }

  try {
    const response = await fetch('https://date.nager.at/api/v3/AvailableCountries', {
      headers: { 'User-Agent': 'HolidayHangoutPlanner/1.0' },
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) {
      throw new Error(`Nager.Date API responded with status ${response.status}`);
    }

    const data = await response.json();
    cache.countries = data;
    return res.json({ success: true, source: 'api', data });
  } catch (err) {
    console.warn('[Nager.Date] Countries fetch failed, using fallback:', err.message);
    return res.json({ success: true, source: 'fallback', data: fallbackCountries });
  }
});

// 1. Nager.Date API: Public Holidays by Year and Country
app.get('/api/holidays', async (req, res) => {
  const country = (req.query.country || 'IN').toUpperCase();
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  if (!/^[A-Z]{2}$/.test(country)) {
    return res.status(400).json({ success: false, error: 'Invalid 2-letter country code.' });
  }

  const cacheKey = `${country}-${year}`;
  if (cache.holidays.has(cacheKey)) {
    return res.json({ success: true, source: 'cache', country, year, data: cache.holidays.get(cacheKey) });
  }

  try {
    if (country === 'IN') {
      cache.holidays.set(cacheKey, fallbackIndianHolidays);
      return res.json({ success: true, source: 'fallback', country, year, data: fallbackIndianHolidays });
    }

    const apiUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`;
    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'HolidayHangoutPlanner/1.0' },
      signal: AbortSignal.timeout(7000)
    });

    if (response.status === 204) {
      // 204 No Content
      return res.json({ success: true, source: 'api', country, year, data: [] });
    }

    if (!response.ok) {
      if (response.status === 404) {
        return res.json({ success: true, source: 'api', country, year, data: [] });
      }
      throw new Error(`Nager.Date API returned ${response.status}`);
    }

    const data = await response.json();
    cache.holidays.set(cacheKey, data);
    return res.json({ success: true, source: 'api', country, year, data });
  } catch (err) {
    console.error(`[Nager.Date] Holidays error for ${country} ${year}:`, err.message);
    return res.status(502).json({
      success: false,
      error: `Could not fetch public holidays for country "${country}" and year ${year}. (${err.message})`,
      country,
      year
    });
  }
});

// 2. Bored API: Activity suggestion
app.get('/api/activity', async (req, res) => {
  const { type, participants } = req.query;

  try {
    let url = 'https://bored-api.appbrewery.com/random';
    if (type && type !== 'all') {
      url = `https://bored-api.appbrewery.com/filter?type=${encodeURIComponent(type)}`;
      if (participants) {
        url += `&participants=${encodeURIComponent(participants)}`;
      }
    } else if (participants) {
      url = `https://bored-api.appbrewery.com/filter?participants=${encodeURIComponent(participants)}`;
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'HolidayHangoutPlanner/1.0' },
      signal: AbortSignal.timeout(6000)
    });

    if (response.ok) {
      const data = await response.json();
      let activityItem = data;

      // When filter returns an array, pick a random item
      if (Array.isArray(data)) {
        if (data.length === 0) {
          // If no match for filter, pick a random from fallback
          activityItem = fallbackActivities[Math.floor(Math.random() * fallbackActivities.length)];
        } else {
          activityItem = data[Math.floor(Math.random() * data.length)];
        }
      }

      return res.json({
        success: true,
        source: 'api',
        data: {
          activity: activityItem.activity,
          type: activityItem.type || type || 'recreational',
          participants: activityItem.participants || parseInt(participants, 10) || 1,
          price: activityItem.price !== undefined ? activityItem.price : 0,
          accessibility: activityItem.accessibility || 'Few challenges',
          link: activityItem.link || ''
        }
      });
    }

    throw new Error(`Bored API returned ${response.status}`);
  } catch (err) {
    console.warn('[Bored API] Upstream fetch failed, returning curated activity:', err.message);
    const filtered = type && type !== 'all'
      ? fallbackActivities.filter(a => a.type === type)
      : fallbackActivities;
    const pool = filtered.length > 0 ? filtered : fallbackActivities;
    const randomFallback = pool[Math.floor(Math.random() * pool.length)];

    return res.json({
      success: true,
      source: 'fallback',
      data: {
        ...randomFallback,
        participants: participants ? parseInt(participants, 10) : randomFallback.participants
      }
    });
  }
});

// 3. goQR API: Proxy / direct helper
app.get('/api/qr', (req, res) => {
  const { data, size = '240x240' } = req.query;

  if (!data) {
    return res.status(400).json({ success: false, error: 'Query parameter "data" is required.' });
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${encodeURIComponent(size)}&data=${encodeURIComponent(data)}&margin=8&qzone=1`;
  res.redirect(qrUrl);
});

// Plans Management (Neon Postgres / In-Memory Fallback)
app.post('/api/plans', async (req, res) => {
  try {
    const {
      countryCode,
      countryName,
      holidayName,
      holidayDate,
      activity,
      activityType,
      participants,
      price,
      accessibility,
      notes
    } = req.body;

    if (!countryCode || !holidayName || !holidayDate || !activity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required plan fields (countryCode, holidayName, holidayDate, activity).'
      });
    }

    const id = 'hhp_' + crypto.randomBytes(6).toString('hex');
    const plan = await savePlan({
      id,
      countryCode,
      countryName: countryName || countryCode,
      holidayName,
      holidayDate,
      activity,
      activityType,
      participants: parseInt(participants, 10) || 1,
      price: parseFloat(price || 0),
      accessibility,
      notes
    });

    const host = req.get('host');
    const protocol = req.protocol;
    const shareUrl = `${protocol}://${host}/?planId=${id}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`;

    res.status(201).json({
      success: true,
      plan,
      shareUrl,
      qrUrl: qrApiUrl
    });
  } catch (err) {
    console.error('[Plans] Error creating plan:', err);
    res.status(500).json({ success: false, error: 'Failed to create plan.' });
  }
});

app.get('/api/plans', async (req, res) => {
  try {
    const plans = await getRecentPlans(12);
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch plans.' });
  }
});

app.get('/api/plans/:id', async (req, res) => {
  try {
    const plan = await getPlanById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found.' });
    }
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve plan.' });
  }
});

// Single Page Application Fallback for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Holiday Hangout Planner is running!`);
    console.log(`📍 Local URL: http://localhost:${PORT}`);
    console.log(`📡 Integrated APIs:`);
    console.log(`   1. Nager.Date API (Public Holidays)`);
    console.log(`   2. Bored API (Activity Generation)`);
    console.log(`   3. goQR API (QR Code Sharing)`);
    console.log(`🗄️ Database: ${getDbStatus().provider}`);
    console.log(`======================================================\n`);
  });
}

start();
