const KLAVIYO_KEY = process.env.KLAVIYO_API_KEY || '';
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, props, listId, metric, revision, turnstileToken } = req.body || {};

  if (TURNSTILE_SECRET) {
    if (!turnstileToken) return res.status(400).json({ ok: false, error: 'captcha_missing' });
    try {
      const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: TURNSTILE_SECRET,
          response: turnstileToken,
          remoteip: req.headers['x-forwarded-for'] || ''
        })
      });
      const tsData = await tsRes.json();
      if (!tsData.success) return res.status(400).json({ ok: false, error: 'captcha_failed' });
    } catch (err) {
      console.error('[Turnstile]', err);
      return res.status(500).json({ ok: false, error: 'captcha_error' });
    }
  }

  if (!KLAVIYO_KEY) {
    console.info('[Klaviyo] Mode demo. Payload:', { email, props });
    return res.json({ ok: true, demo: true });
  }

  const rev = revision || '2024-10-15';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Klaviyo-API-Key ${KLAVIYO_KEY}`,
    'revision': rev
  };

  try {
    const tasks = [];

    if (listId) {
      const subBody = {
        data: {
          type: 'profile-subscription-bulk-create-job',
          attributes: {
            profiles: {
              data: [{
                type: 'profile',
                attributes: {
                  email,
                  subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } }
                }
              }]
            }
          },
          relationships: { list: { data: { type: 'list', id: listId } } }
        }
      };
      tasks.push(fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/', {
        method: 'POST', headers, body: JSON.stringify(subBody)
      }));
    }

    const eventBody = {
      data: {
        type: 'event',
        attributes: {
          properties: props || {},
          metric: { data: { type: 'metric', attributes: { name: metric || 'result' } } },
          profile: { data: { type: 'profile', attributes: { email } } }
        }
      }
    };
    console.log('[Klaviyo] Event payload:', JSON.stringify(eventBody, null, 2));
    tasks.push(fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST', headers, body: JSON.stringify(eventBody)
    }));

    const results = await Promise.allSettled(tasks);
    const errors = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && !r.value.ok) {
        const body = await r.value.text().catch(() => '');
        console.error('[Klaviyo] Erreur API', r.value.status, body);
        errors.push({ status: r.value.status, body });
      }
    }
    if (errors.length) return res.json({ ok: false, errors });
    return res.json({ ok: true, results: results.map(r => r.status) });
  } catch (err) {
    console.error('[Klaviyo]', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
