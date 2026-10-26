const { XMLParser, XMLValidator } = require('fast-xml-parser');

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 8000;
const CACHE_SECONDS = 300;

function jsonError(res, status, code, message) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-EPG-Error-Code', code);
  res.status(status).json({ error: { code, message } });
}

function isAllowedSource(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { return null; }
  const allowedHosts = (process.env.EPG_ALLOWED_HOSTS || '')
    .split(',').map(host => host.trim().toLowerCase()).filter(Boolean);
  if (url.protocol !== 'https:' || url.username || url.password || !allowedHosts.includes(url.hostname.toLowerCase())) return null;
  return url;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'METHOD_NOT_ALLOWED', 'Gunakan metode GET.');
  }

  const rawUrl = process.env.EPG_SOURCE_URL;
  if (!rawUrl) return jsonError(res, 503, 'EPG_NOT_CONFIGURED', 'Sumber EPG belum dikonfigurasi oleh pengelola.');
  const sourceUrl = isAllowedSource(rawUrl);
  if (!sourceUrl) return jsonError(res, 503, 'EPG_SOURCE_NOT_ALLOWED', 'Host sumber EPG tidak ada dalam EPG_ALLOWED_HOSTS atau URL bukan HTTPS yang aman.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(sourceUrl.href, {
      method: 'GET',
      headers: { Accept: 'application/xml, text/xml;q=0.9' },
      redirect: 'error',
      signal: controller.signal,
    });

    if (!upstream.ok) {
      const status = upstream.status === 404 ? 404 : (upstream.status >= 500 ? 502 : 502);
      return jsonError(res, status, upstream.status === 404 ? 'UPSTREAM_404' : 'UPSTREAM_HTTP_ERROR', `Sumber EPG menjawab HTTP ${upstream.status}.`);
    }

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json') || contentType.includes('text/html')) {
      return jsonError(res, 502, 'UPSTREAM_NOT_XML', 'Sumber EPG mengembalikan HTML/JSON, bukan XMLTV.');
    }

    const declaredLength = Number(upstream.headers.get('content-length') || 0);
    if (declaredLength > MAX_BYTES) return jsonError(res, 413, 'EPG_TOO_LARGE', 'File EPG melebihi batas 5 MB.');
    if (!upstream.body) return jsonError(res, 502, 'EMPTY_RESPONSE', 'Sumber EPG tidak mengirim isi respons.');

    const reader = upstream.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel().catch(() => {});
        return jsonError(res, 413, 'EPG_TOO_LARGE', 'File EPG melebihi batas 5 MB.');
      }
      chunks.push(Buffer.from(value));
    }
    const xml = Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '');
    const validation = XMLValidator.validate(xml, { allowBooleanAttributes: false });
    if (validation !== true) return jsonError(res, 502, 'INVALID_XML', 'Sumber EPG berisi XML yang tidak valid.');

    let parsed;
    try {
      parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', processEntities: true, trimValues: true }).parse(xml);
    } catch {
      return jsonError(res, 502, 'INVALID_XML', 'XML EPG tidak dapat diparse.');
    }
    const tv = parsed && parsed.tv;
    if (!tv || !tv.channel || !tv.programme) {
      return jsonError(res, 502, 'INVALID_XMLTV', 'XML valid, tetapi bukan XMLTV dengan elemen channel dan programme.');
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).send(xml);
  } catch (error) {
    if (error && error.name === 'AbortError') return jsonError(res, 504, 'UPSTREAM_TIMEOUT', 'Sumber EPG melewati batas waktu 8 detik.');
    if (error && (error.cause?.code === 'ENOTFOUND' || error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNRESET')) {
      return jsonError(res, 502, 'UPSTREAM_NETWORK_ERROR', 'Server tidak dapat terhubung ke sumber EPG.');
    }
    return jsonError(res, 502, 'UPSTREAM_FETCH_ERROR', 'Pengambilan EPG gagal di server. Periksa URL sumber dan akses sumbernya.');
  } finally {
    clearTimeout(timer);
  }
};
