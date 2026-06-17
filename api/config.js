module.exports = (req, res) => {
  res.json({ turnstileSitekey: process.env.TURNSTILE_SITEKEY || '' });
};
