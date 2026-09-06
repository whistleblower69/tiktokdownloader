/**
 * TikFlow Serverless API Endpoint (/api/download)
 * Deployed for 100% Free on Vercel Serverless (Node.js)
 * Resolves TikTok video links to direct no-watermark MP4 streams & MP3 audio.
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: 'Bitte gib eine gültige TikTok-URL an.'
    });
  }

  try {
    // 1. Primary High-Speed Provider: TikWM API
    const tikwmResult = await resolveTikWM(url);
    if (tikwmResult) {
      return res.status(200).json({
        success: true,
        source: 'tikwm',
        data: tikwmResult
      });
    }

    // 2. Secondary Provider Fallback: Tiklydown
    const tiklyResult = await resolveTiklydown(url);
    if (tiklyResult) {
      return res.status(200).json({
        success: true,
        source: 'tiklydown',
        data: tiklyResult
      });
    }

    // 3. Tertiary Provider Fallback: SSSTik IO
    const ssstikResult = await resolveSSSTik(url);
    if (ssstikResult) {
      return res.status(200).json({
        success: true,
        source: 'ssstik',
        data: ssstikResult
      });
    }

    return res.status(422).json({
      success: false,
      message: 'Video konnte nicht extrahiert werden. Möglicherweise ist das Video privat oder gelöscht.'
    });

  } catch (error) {
    console.error('API Handler Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Interner Server-Fehler beim Abrufen des Videos.'
    });
  }
}

/**
 * TikWM Provider Resolver
 */
async function resolveTikWM(tiktokUrl) {
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}&hd=1`;
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.code === 0 && data.data) {
      const d = data.data;
      return {
        title: d.title || 'TikTok Video',
        cover: d.cover || d.origin_cover || '',
        duration: d.duration || 0,
        author: {
          nickname: d.author?.nickname || 'TikTok User',
          unique_id: d.author?.unique_id || 'user',
          avatar: d.author?.avatar || ''
        },
        nowm_url: d.play ? (d.play.startsWith('http') ? d.play : `https://www.tikwm.com${d.play}`) : '',
        hd_url: d.hdplay ? (d.hdplay.startsWith('http') ? d.hdplay : `https://www.tikwm.com${d.hdplay}`) : '',
        music_url: d.music ? (d.music.startsWith('http') ? d.music : `https://www.tikwm.com${d.music}`) : ''
      };
    }
  } catch (e) {
    console.error('TikWM Error:', e.message);
  }
  return null;
}

/**
 * Tiklydown Provider Resolver
 */
async function resolveTiklydown(tiktokUrl) {
  try {
    const apiUrl = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(tiktokUrl)}`;
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) return null;

    const json = await response.json();
    if (json && (json.video || json.images)) {
      return {
        title: json.title || 'TikTok Video',
        cover: json.video?.cover || '',
        duration: 0,
        author: {
          nickname: json.author?.name || 'TikTok User',
          unique_id: json.author?.unique_id || 'tiktok',
          avatar: json.author?.avatar || ''
        },
        nowm_url: json.video?.noWatermark || json.video?.watermark || '',
        hd_url: json.video?.noWatermark || '',
        music_url: json.music?.play_url || ''
      };
    }
  } catch (e) {
    console.error('Tiklydown Error:', e.message);
  }
  return null;
}

/**
 * SSSTik Provider Resolver Fallback
 */
async function resolveSSSTik(tiktokUrl) {
  try {
    const homeRes = await fetch('https://ssstik.io/en', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });

    const homeHtml = await homeRes.text();
    const setCookieHeader = homeRes.headers.get('set-cookie') || '';
    const cookie = setCookieHeader.split(';')[0] || '';

    const tokenMatch = homeHtml.match(/s_token\s*=\s*'([^']+)'/) || homeHtml.match(/name="tt"\s+value="([^"]+)"/);
    const ttToken = tokenMatch ? tokenMatch[1] : '0';

    const bodyParams = new URLSearchParams();
    bodyParams.append('id', tiktokUrl);
    bodyParams.append('locale', 'en');
    bodyParams.append('tt', ttToken);

    const postRes = await fetch('https://ssstik.io/abc?url=dl', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://ssstik.io/en',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookie,
        'HX-Request': 'true',
        'HX-Trigger': '_gcaptcha_pt',
        'HX-Target': 'target',
        'HX-Current-URL': 'https://ssstik.io/en'
      },
      body: bodyParams.toString(),
      signal: AbortSignal.timeout(7000)
    });

    const postHtml = await postRes.text();

    const dlMatches = [...postHtml.matchAll(/href="([^"]+)"[^>]*class="[^"]*download[^"]*"/gi)];
    const urls = dlMatches.map(m => m[1]);

    if (urls.length > 0) {
      const titleMatch = postHtml.match(/<p class="maintext[^>]*>([^<]+)<\/p>/i);
      const avatarMatch = postHtml.match(/<img class="result_author"[^>]+src="([^"]+)"/i);

      return {
        title: titleMatch ? titleMatch[1].trim() : 'TikTok Video',
        cover: avatarMatch ? avatarMatch[1] : '',
        duration: 0,
        author: {
          nickname: 'TikTok Creator',
          unique_id: 'tiktok',
          avatar: avatarMatch ? avatarMatch[1] : ''
        },
        nowm_url: urls[0],
        hd_url: urls[1] || urls[0],
        music_url: urls.find(u => u.includes('.mp3') || u.includes('music')) || ''
      };
    }
  } catch (e) {
    console.error('SSSTik Fallback Error:', e.message);
  }
  return null;
}
