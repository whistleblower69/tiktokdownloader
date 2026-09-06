/**
 * TikFlow Elite — Client Application Logic
 * Interactive video preview, instant CDN copy, local download history, accordion FAQ & auto-download stream.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const urlInput = document.getElementById('url-input');
  const btnPaste = document.getElementById('btn-paste');
  const btnClear = document.getElementById('btn-clear');
  const btnSubmit = document.getElementById('btn-submit');
  const btnSpinner = btnSubmit.querySelector('.spinner');
  const btnText = btnSubmit.querySelector('.btn-text');
  
  const resultCard = document.getElementById('result-card');
  const resThumb = document.getElementById('res-thumb');
  const resVideo = document.getElementById('res-video');
  const btnPlayPreview = document.getElementById('btn-play-preview');
  const resAvatar = document.getElementById('res-avatar');
  const resNickname = document.getElementById('res-nickname');
  const resUsername = document.getElementById('res-username');
  const resDesc = document.getElementById('res-desc');
  const resDuration = document.getElementById('res-duration');

  const btnDlNoWm = document.getElementById('btn-dl-nowm');
  const btnDlServer2 = document.getElementById('btn-dl-server2');
  const btnDlMp3 = document.getElementById('btn-dl-mp3');
  const btnDlCover = document.getElementById('btn-dl-cover');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const copyLinkText = document.getElementById('copy-link-text');
  const btnReset = document.getElementById('btn-reset');
  const adSlot2 = document.getElementById('ad-slot-2');
  const toast = document.getElementById('toast');

  // History Elements
  const historyPanel = document.getElementById('history-panel');
  const historyGrid = document.getElementById('history-grid');
  const historyCounter = document.getElementById('history-counter');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const navHistoryLink = document.getElementById('nav-history-link');

  // Active state
  let currentItem = null;

  // Initialize UI components
  initHistory();
  initAccordion();

  // Input change / typing events
  urlInput.addEventListener('input', () => {
    btnClear.style.display = urlInput.value.trim() ? 'block' : 'none';
  });

  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    btnClear.style.display = 'none';
    urlInput.focus();
  });

  // Paste from clipboard button
  btnPaste.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          urlInput.value = text.trim();
          btnClear.style.display = 'block';
          showToast('Link eingefügt', 'info');
          if (isValidTikTokUrl(text.trim())) {
            handleDownload();
          }
        }
      } else {
        urlInput.focus();
        showToast('Drücke Strg+V zum Einfügen', 'info');
      }
    } catch (err) {
      urlInput.focus();
      showToast('Drücke Strg+V zum Einfügen', 'info');
    }
  });

  // Global paste shortcut listener (Ctrl+V anywhere on the page)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      if (document.activeElement !== urlInput) {
        urlInput.focus();
      }
    }
    if (e.key === 'Escape' && resultCard.style.display !== 'none') {
      resetView();
    }
  });

  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDownload();
    }
  });

  btnSubmit.addEventListener('click', handleDownload);
  btnReset.addEventListener('click', resetView);

  // Play Video Preview inside card
  btnPlayPreview.addEventListener('click', () => {
    if (!currentItem || !currentItem.nowm_url) return;
    resThumb.style.display = 'none';
    btnPlayPreview.style.display = 'none';
    resVideo.src = currentItem.nowm_url;
    resVideo.style.display = 'block';
    resVideo.play().catch(e => console.log('Autoplay blocked', e));
  });

  // Copy Direct CDN Link
  btnCopyLink.addEventListener('click', async () => {
    if (!currentItem || !currentItem.nowm_url) return;
    try {
      await navigator.clipboard.writeText(currentItem.nowm_url);
      copyLinkText.textContent = '✓ Link kopiert!';
      showToast('Direkter Video-Link kopiert!', 'success');
      setTimeout(() => {
        copyLinkText.textContent = 'CDN Link kopieren';
      }, 2500);
    } catch (err) {
      showToast('Konnte Link nicht kopieren', 'error');
    }
  });

  // Direct Download Actions
  btnDlNoWm.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentItem && currentItem.nowm_url) {
      triggerFileDownload(currentItem.nowm_url, 'tiktok_no_watermark.mp4');
      saveToHistory(currentItem);
    }
  });

  btnDlServer2.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentItem) {
      const url = currentItem.hd_url || currentItem.nowm_url;
      triggerFileDownload(url, 'tiktok_hd_video.mp4');
      saveToHistory(currentItem);
    }
  });

  btnDlMp3.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentItem && currentItem.music_url) {
      triggerFileDownload(currentItem.music_url, 'tiktok_audio.mp3');
      saveToHistory(currentItem);
    }
  });

  btnDlCover.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentItem && currentItem.cover) {
      triggerFileDownload(currentItem.cover, 'tiktok_cover.jpg');
    }
  });

  // Clear History
  btnClearHistory.addEventListener('click', () => {
    localStorage.removeItem('tikflow_history');
    initHistory();
    showToast('Verlauf gelöscht', 'info');
  });

  function resetView() {
    resultCard.style.display = 'none';
    if (adSlot2) adSlot2.style.display = 'none';
    resVideo.pause();
    resVideo.src = '';
    resVideo.style.display = 'none';
    resThumb.style.display = 'block';
    btnPlayPreview.style.display = 'flex';
    urlInput.value = '';
    btnClear.style.display = 'none';
    currentItem = null;
    urlInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function isValidTikTokUrl(url) {
    return /(tiktok\.com|douyin\.com|v\.douyin\.com)/i.test(url);
  }

  function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3800);
  }

  function setLoading(loading) {
    btnSubmit.disabled = loading;
    if (loading) {
      if (btnSpinner) btnSpinner.style.display = 'block';
      if (btnText) btnText.textContent = 'Extrahieren...';
    } else {
      if (btnSpinner) btnSpinner.style.display = 'none';
      if (btnText) btnText.textContent = 'Download';
    }
  }

  /**
   * Automatic Direct File Download Trigger
   * Forces browser to download the file directly via /api/stream proxy or client blob
   */
  async function triggerFileDownload(mediaUrl, defaultFilename) {
    if (!mediaUrl || mediaUrl === '#') {
      showToast('Download-Link nicht verfügbar', 'error');
      return;
    }

    showToast('Download startet... (bitte kurz warten)', 'info');

    const cleanTitle = (currentItem?.title || 'tiktok_video')
      .replace(/[^\w\d_\-äöüÄÖÜß]/g, '_')
      .substring(0, 35);
    const ext = defaultFilename.substring(defaultFilename.lastIndexOf('.'));
    const finalFilename = `${cleanTitle}${ext}`;

    // 1. Direct Blob Download in client browser (fast, saves file directly, zero serverless payload limit)
    try {
      const res = await fetch(mediaUrl);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 4000);
        showToast('Download erfolgreich gespeichert!', 'success');
        return;
      }
    } catch (e) {
      console.warn('Direct blob fetch blocked by CORS, opening direct link...', e);
    }

    // 2. Direct browser link trigger fallback
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.target = '_blank';
    link.setAttribute('download', finalFilename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 500);
  }

  /**
   * Multi-Tier TikTok Extraction Resolver
   */
  async function resolveTikTokVideo(targetUrl) {
    // 1. Try local serverless endpoint
    if (window.location.protocol.startsWith('http')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        
        const res = await fetch(`/api/download?url=${encodeURIComponent(targetUrl)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.data) {
            return json.data;
          }
        }
      } catch (e) {
        console.warn('Local API failed or timed out, trying direct gateways...', e);
      }
    }

    // 2. Direct Browser Gateway: TikWM API
    try {
      const tikwmUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}&hd=1`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(tikwmUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json && json.code === 0 && json.data) {
          const d = json.data;
          return {
            title: d.title || 'TikTok Video',
            cover: d.cover || d.origin_cover || '',
            duration: d.duration || 0,
            author: {
              nickname: d.author?.nickname || 'TikTok User',
              unique_id: d.author?.unique_id || 'tiktok',
              avatar: d.author?.avatar || ''
            },
            nowm_url: d.play ? (d.play.startsWith('http') ? d.play : `https://www.tikwm.com${d.play}`) : '',
            hd_url: d.hdplay ? (d.hdplay.startsWith('http') ? d.hdplay : `https://www.tikwm.com${d.hdplay}`) : (d.play ? (d.play.startsWith('http') ? d.play : `https://www.tikwm.com${d.play}`) : ''),
            music_url: d.music ? (d.music.startsWith('http') ? d.music : `https://www.tikwm.com${d.music}`) : ''
          };
        }
      }
    } catch (e) {
      console.warn('TikWM direct gateway failed, trying Tiklydown...', e);
    }

    // 3. Direct Browser Gateway: Tiklydown API
    try {
      const tiklyUrl = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(targetUrl)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(tiklyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
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
      }
    } catch (e) {
      console.warn('Tiklydown direct gateway failed...', e);
    }

    throw new Error('Video konnte nicht gefunden oder extrahiert werden. Bitte prüfe den Link.');
  }

  function displayResult(item) {
    currentItem = item;

    // Reset media player
    resVideo.pause();
    resVideo.src = '';
    resVideo.style.display = 'none';
    resThumb.style.display = 'block';
    btnPlayPreview.style.display = 'flex';

    // Populate metadata
    resThumb.src = item.cover || 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22260%22%20viewBox%3D%220%200%20200%20260%22%3E%3Crect%20fill%3D%22%2314171f%22%20width%3D%22200%22%20height%3D%22260%22%2F%3E%3Ctext%20fill%3D%22%236b7280%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%3EVideo%20Vorschau%3C%2Ftext%3E%3C%2Fsvg%3E';
    resAvatar.src = item.author?.avatar || 'https://www.tiktok.com/favicon.ico';
    resNickname.textContent = item.author?.nickname || 'TikTok Creator';
    resUsername.textContent = item.author?.unique_id ? `@${item.author.unique_id}` : '@tiktok';
    resDesc.textContent = item.title || 'Keine Beschreibung vorhanden';

    if (item.duration) {
      const mins = Math.floor(item.duration / 60);
      const secs = (item.duration % 60).toString().padStart(2, '0');
      resDuration.textContent = `${mins}:${secs}`;
      resDuration.style.display = 'block';
    } else {
      resDuration.style.display = 'none';
    }

    // Toggle MP3 button
    if (item.music_url) {
      btnDlMp3.style.display = 'flex';
    } else {
      btnDlMp3.style.display = 'none';
    }

    // Toggle Cover button
    if (item.cover) {
      btnDlCover.style.display = 'flex';
    } else {
      btnDlCover.style.display = 'none';
    }

    // Display result card
    resultCard.style.display = 'block';
    if (adSlot2) adSlot2.style.display = 'block';

    setTimeout(() => {
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);

    showToast('Video bereit zum Download', 'success');
  }

  async function handleDownload() {
    const rawUrl = urlInput.value.trim();
    if (!rawUrl) {
      showToast('Bitte füge zuerst einen TikTok Link ein!', 'error');
      urlInput.focus();
      return;
    }

    if (!isValidTikTokUrl(rawUrl)) {
      showToast('Ungültiger Link! Bitte gib einen echten TikTok-Link ein.', 'error');
      return;
    }

    setLoading(true);

    try {
      const item = await resolveTikTokVideo(rawUrl);
      displayResult(item);
    } catch (err) {
      console.error('Download error:', err);
      showToast(err.message || 'Fehler beim Laden des Videos.', 'error');
    } finally {
      setLoading(false);
    }
  }

  /* History Management */
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem('tikflow_history') || '[]');
    } catch {
      return [];
    }
  }

  function saveToHistory(item) {
    if (!item || !item.nowm_url) return;
    const history = getHistory();
    // Prevent duplicate entries
    const filtered = history.filter(h => h.nowm_url !== item.nowm_url && h.title !== item.title);
    filtered.unshift({
      title: item.title || 'TikTok Video',
      cover: item.cover || '',
      nickname: item.author?.nickname || 'Creator',
      author: item.author,
      duration: item.duration || 0,
      nowm_url: item.nowm_url,
      hd_url: item.hd_url,
      music_url: item.music_url,
      date: new Date().toLocaleDateString('de-DE')
    });
    // Keep max 6 items
    const sliced = filtered.slice(0, 6);
    localStorage.setItem('tikflow_history', JSON.stringify(sliced));
    initHistory();
  }

  function initHistory() {
    const history = getHistory();
    historyCounter.textContent = history.length;

    if (history.length === 0) {
      historyPanel.style.display = 'none';
      return;
    }

    historyPanel.style.display = 'block';
    historyGrid.innerHTML = '';

    history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <img src="${item.cover || ''}" class="history-thumb" alt="Thumbnail">
        <div class="history-info">
          <div class="history-name">${item.title}</div>
          <div class="history-author">@${item.author?.unique_id || 'tiktok'}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        displayResult(item);
      });
      historyGrid.appendChild(card);
    });
  }

  /* Accordion FAQ */
  function initAccordion() {
    const triggers = document.querySelectorAll('.accordion-trigger');
    triggers.forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.accordion-item');
        const isActive = item.classList.contains('active');
        
        // Close all
        document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
        
        if (!isActive) {
          item.classList.add('active');
        }
      });
    });
  }
});
