const express = require('express');
const path = require('path');
require('dotenv').config();

// dynamic import of fetch for Node versions without global fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;
const KLAVIYO_KEY = process.env.KLAVIYO_API_KEY || '';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/klaviyo', async (req, res) => {
  const { email, props, listId, metric, revision } = req.body || {};
  // If no server key is provided, operate in demo mode (log only)
  if (!KLAVIYO_KEY || KLAVIYO_KEY === 'XXXXXX') {
    console.info('[Server Klaviyo] Mode demo — clé manquante. Payload:', { email, props });
    return res.json({ ok: true, demo: true });
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (revision) headers.revision = revision;
    const tasks = [];

    if (listId) {
      const body = { data: { type: 'subscription', attributes: {
        profile: { data: { type: 'profile', attributes: { email, subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } } } } },
      }, relationships: { list: { data: { type: 'list', id: listId } } } } };
      tasks.push(fetch(`https://a.klaviyo.com/client/subscriptions/?company_id=${encodeURIComponent(KLAVIYO_KEY)}`, {
        method: 'POST', headers, body: JSON.stringify(body)
      }));
    }

    const eventBody = { data: { type: 'event', attributes: {
      properties: props || {},
      metric: { data: { type: 'metric', attributes: { name: metric || 'result' } } },
      profile: { data: { type: 'profile', attributes: { email } } }
    } } };
    tasks.push(fetch(`https://a.klaviyo.com/client/events/?company_id=${encodeURIComponent(KLAVIYO_KEY)}`, {
      method: 'POST', headers, body: JSON.stringify(eventBody)
    }));

    const results = await Promise.allSettled(tasks);
    return res.json({ ok: true, results: results.map(r => r.status) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(PORT, () => console.log(`App running at http://localhost:${PORT}`));
