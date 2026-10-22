// Resolve somente um APK publicado; o fallback sempre leva às releases reais.
(async () => {
  const button = document.getElementById('download');
  const status = document.getElementById('downloadStatus');
  try {
    const response = await fetch('https://api.github.com/repos/5an1ty/joguin-bob-esponja/releases/latest', {signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('Release indisponível');
    const release = await response.json();
    const apk = release.assets?.find(asset => /\.apk$/i.test(asset.name) && asset.state === 'uploaded');
    if (!apk || !apk.browser_download_url?.startsWith('https://github.com/5an1ty/joguin-bob-esponja/releases/download/')) throw new Error('APK indisponível');
    button.href = apk.browser_download_url;
    status.textContent = `${release.tag_name} · APK para Android · ${(apk.size / 1048576).toFixed(1)} MB`;
  } catch {
    status.textContent = 'APK ainda não confirmado. O botão abre as releases; enquanto isso, você pode jogar no navegador.';
  }
})();
