// GridSync Backend — the brain behind the map
// Run: npm install, then npm start, open http://localhost:3000

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===== THE DATA — FPL vs Duke Energy Florida (Miami-Dade focus) =====
// In production this would live in MongoDB Atlas. Kept here for the demo.
const projects = [
  { utility: 'FPL', name: 'Miami Substation Upgrade', lat: 25.7617, lng: -80.1918, start: '2027-03-01', end: '2027-09-01', cost: 2100000 },
  { utility: 'FPL', name: 'Broward Transmission Line', lat: 26.1224, lng: -80.1434, start: '2027-02-15', end: '2027-08-15', cost: 3400000 },
  { utility: 'FPL', name: 'Doral Feeder Expansion', lat: 25.8195, lng: -80.3553, start: '2027-04-01', end: '2027-10-01', cost: 2400000 },
  { utility: 'FPL', name: 'Palm Beach Solar Farm', lat: 26.7056, lng: -80.0364, start: '2027-06-01', end: '2028-01-01', cost: 5200000 },
  { utility: 'FPL', name: 'Keys Resilience Project', lat: 24.5551, lng: -81.78, start: '2027-01-10', end: '2027-07-10', cost: 1800000 },
  { utility: 'FPL', name: 'Fort Myers Grid Modern', lat: 26.6406, lng: -81.8723, start: '2028-02-01', end: '2028-08-01', cost: 2900000 },
  { utility: 'Duke', name: 'Dade Border Upgrade', lat: 25.85, lng: -80.30, start: '2027-03-10', end: '2027-09-10', cost: 1900000 },
  { utility: 'Duke', name: 'Hialeah Substation', lat: 25.8576, lng: -80.2781, start: '2027-05-01', end: '2027-11-01', cost: 2200000 },
  { utility: 'Duke', name: 'Palm Beach North Line', lat: 26.35, lng: -80.08, start: '2027-03-01', end: '2027-09-01', cost: 2800000 },
  { utility: 'Duke', name: 'Tampa Bay Resilience', lat: 27.9506, lng: -82.4572, start: '2027-04-01', end: '2027-10-01', cost: 4100000 },
  { utility: 'Duke', name: 'Daytona Feeder Expansion', lat: 29.2108, lng: -81.0228, start: '2028-03-01', end: '2028-09-01', cost: 1700000 },
  { utility: 'Duke', name: 'Naples Solar Interconnect', lat: 26.142, lng: -81.7948, start: '2027-07-01', end: '2028-01-01', cost: 3300000 },
  { utility: 'Keys Energy', name: 'Key West Substation', lat: 24.5557, lng: -81.7826, start: '2027-03-01', end: '2027-09-01', cost: 1800000 },
  { utility: 'Keys Energy', name: 'Stock Island Feeder', lat: 24.5638, lng: -81.7357, start: '2027-05-01', end: '2027-11-01', cost: 1400000 },
  { utility: 'Keys Energy', name: 'Big Coppitt Upgrade', lat: 24.5972, lng: -81.6617, start: '2028-01-01', end: '2028-06-01', cost: 1200000 },
  { utility: 'Keys Co-op', name: 'Tavernier Line', lat: 25.0097, lng: -80.5128, start: '2027-04-01', end: '2027-10-01', cost: 1600000 },
  { utility: 'Keys Co-op', name: 'Islamorada Tie', lat: 24.9243, lng: -80.6272, start: '2027-06-01', end: '2027-12-01', cost: 2100000 },
  { utility: 'Keys Co-op', name: 'Key Largo Feeder', lat: 25.0865, lng: -80.4473, start: '2028-02-01', end: '2028-08-01', cost: 1900000 },
  { utility: 'Glades Co-op', name: 'Belle Glade Substation', lat: 26.6847, lng: -80.6676, start: '2027-03-15', end: '2027-09-15', cost: 2300000 },
  { utility: 'Glades Co-op', name: 'Clewiston Interconnect', lat: 26.7560, lng: -80.9344, start: '2027-05-01', end: '2027-11-01', cost: 2000000 },
];


// ===== THE BRAIN — overlap = close in space AND time =====
function milesApart(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function datesOverlap(aStart, aEnd, bStart, bEnd) {
  const s1 = new Date(aStart), e1 = new Date(aEnd), s2 = new Date(bStart), e2 = new Date(bEnd);
  const ninetyDays = 90*24*60*60*1000;
  return (s1 <= e2 && s2 <= e1) || Math.abs(s1 - s2) < ninetyDays;
}
function findOverlaps(list) {
  const out = [];
  for (let i = 0; i < list.length; i++) for (let j = i+1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.utility === b.utility) continue; // only cross-utility clashes
    const dist = milesApart(a.lat, a.lng, b.lat, b.lng);
    if (dist < 50 && datesOverlap(a.start, a.end, b.start, b.end))
      out.push({ a, b, dist: Math.round(dist), savings: Math.round((a.cost + b.cost) * 0.15) });
  }
  return out;
}

// ===== API =====
app.get('/api/projects', (req, res) => res.json(projects));

app.get('/api/overlaps', (req, res) => {
  const overlaps = findOverlaps(projects);
  res.json({ overlaps, count: overlaps.length, totalSavings: overlaps.reduce((s,o) => s + o.savings, 0) });
});

// Simulate: "I'm a utility, I want to build HERE on THESE dates — clash?"
app.post('/api/check', (req, res) => {
  const p = req.body;
  const hits = projects
    .filter(q => q.utility !== p.utility && milesApart(p.lat, p.lng, q.lat, q.lng) < 50 && datesOverlap(p.start, p.end, q.start, q.end))
    .map(q => ({ name: q.name, utility: q.utility, start: q.start, end: q.end, dist: Math.round(milesApart(p.lat, p.lng, q.lat, q.lng)) }));
  // Remember it so the timeline view includes it
  projects.push({ utility: p.utility, name: p.name, lat: p.lat, lng: p.lng, start: p.start, end: p.end, cost: 2000000 });
  res.json({ hits, clear: hits.length === 0 });
});

app.post('/api/explain', async (req, res) => {
  const overlaps = findOverlaps(projects);
  if (!overlaps.length) return res.json({ text: 'No overlaps to explain.' });
  const o = overlaps[0];
  if (process.env.GEMINI_KEY && process.env.GEMINI_KEY !== 'your_key_here') {
    try {
      const prompt = `Explain in 3 sentences why these two power grid projects overlapping matters: ${o.a.name} (${o.a.utility}) and ${o.b.name} (${o.b.utility}), ${o.dist} miles apart, both in 2027. Mention cost savings of $${o.savings}.`;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const d = await r.json();
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return res.json({ text });
    } catch (e) { console.log('Gemini failed, using fallback'); }
  }
  res.json({ text: `${o.a.name} and ${o.b.name} are only ${o.dist} miles apart and both scheduled for spring 2027. Coordinating could share specialized crews and equipment, saving ~$${(o.savings/1000).toFixed(0)}k. FERC Order 1920 encourages this exact coordination.` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`⚡ GridSync backend running on http://localhost:${PORT}`));
