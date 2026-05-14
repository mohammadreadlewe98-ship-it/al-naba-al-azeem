export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwRX3-G0t_0B83Vg9vBy3X7nPUUgfAdLJrSaz-lon1oQWBazCG_Xg3pFS-POt6LrCQ6Ew/exec';

  try {
    const params = req.query;
    const url = new URL(APPS_SCRIPT_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch(e) { data = { success: false, message: 'خطأ في الرد' }; }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'خطأ في الخادم: ' + err.message
    });
  }
}
