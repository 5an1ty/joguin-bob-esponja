package app.snakesponja;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URLConnection;

/** Offline WebView shell. Only packaged assets are served; no native JS bridge. */
public class MainActivity extends Activity {
    private WebView web;
    private FrameLayout root;
    private View fullView;
    private WebChromeClient.CustomViewCallback fullCallback;
    private static final String ORIGIN = "https://appassets.androidplatform.net/";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        // Keep Android system bars outside the game on Android 15 edge-to-edge.
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            root.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setMediaPlaybackRequiresUserGesture(true);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !request.getUrl().toString().startsWith(ORIGIN);
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (!url.startsWith(ORIGIN)) return empty();
                String path = request.getUrl().getPath();
                if (path == null || path.contains("..")) return empty();
                if (path.equals("/")) path = "/index.html";
                String mime = URLConnection.guessContentTypeFromName(path);
                if (path.endsWith(".js")) mime = "application/javascript";
                if (path.endsWith(".css")) mime = "text/css";
                if (path.endsWith(".svg")) mime = "image/svg+xml";
                if (path.endsWith(".mp3")) mime = "audio/mpeg";
                try { return new WebResourceResponse(mime, "UTF-8", getAssets().open(path.substring(1))); }
                catch (IOException error) { return empty(); }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullView != null) { callback.onCustomViewHidden(); return; }
                fullView = view; fullCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(-1, -1));
                getWindow().getDecorView().setSystemUiVisibility(5894);
            }
            @Override public void onHideCustomView() { leaveFullscreen(); }
        });
        web.loadUrl(ORIGIN);
    }
    private WebResourceResponse empty() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0]));
    }
    private void leaveFullscreen() {
        if (fullView == null) return;
        root.removeView(fullView); fullView = null;
        getWindow().getDecorView().setSystemUiVisibility(0);
        if (fullCallback != null) { fullCallback.onCustomViewHidden(); fullCallback = null; }
    }
    @Override public void onBackPressed() {
        if (fullView != null) { leaveFullscreen(); return; }
        web.evaluateJavascript("if(typeof paused!=='undefined'&&!paused&&!over&&!document.getElementById('game').classList.contains('hidden'))togglePause()", null);
        new AlertDialog.Builder(this).setTitle("Sair do jogo?")
            .setMessage("Seu recorde e personagens desbloqueados ficam salvos.")
            .setNegativeButton("Continuar", (dialog, which) -> {})
            .setPositiveButton("Sair", (dialog, which) -> finish()).show();
    }
    @Override protected void onPause() {
        web.evaluateJavascript("if(typeof paused!=='undefined'&&!paused&&!over&&!document.getElementById('game').classList.contains('hidden'))togglePause()", null);
        web.evaluateJavascript("if(typeof musicaAtual!=='undefined'&&musicaAtual)musicaAtual.pause()", null);
        web.onPause(); web.pauseTimers(); super.onPause();
    }
    @Override protected void onResume() { super.onResume(); if (web != null) { web.resumeTimers(); web.onResume(); web.evaluateJavascript("if(typeof tocarMusica==='function')tocarMusica()", null); } }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
