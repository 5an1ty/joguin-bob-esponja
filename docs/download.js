// Mantém o APK confirmado como fallback e procura a maior versão publicada.
(async () => {
  const button = document.getElementById('download');
  const status = document.getElementById('downloadStatus');
  try {
    const response = await fetch('https://api.github.com/repos/5an1ty/joguin-bob-esponja/releases?per_page=30', {signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('Release indisponível');
    const releases = await response.json();
    const release = releases.filter(item => !item.draft && !item.prerelease && /^android-\d+$/.test(item.tag_name) && item.assets?.some(asset => /\.apk$/i.test(asset.name) && asset.state === 'uploaded'))
      .sort((a, b) => Number(b.tag_name.slice(8)) - Number(a.tag_name.slice(8)))[0];
    if (!release) throw new Error('APK indisponível');
    const apk = release.assets?.find(asset => /\.apk$/i.test(asset.name) && asset.state === 'uploaded');
    if (!apk || !apk.browser_download_url?.startsWith('https://github.com/5an1ty/joguin-bob-esponja/releases/download/')) throw new Error('APK indisponível');
    button.href = apk.browser_download_url;
    status.textContent = `${release.tag_name} · Android 8+ · APK de teste · ${(apk.size / 1048576).toFixed(1)} MB`;
  } catch {
    status.textContent = 'Android 8+ · APK de teste · 28 MB. Download da versão confirmada disponível.';
  }
})();
