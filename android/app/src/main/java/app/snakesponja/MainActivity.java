package app.snakesponja;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.os.Build;
import android.graphics.Color;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
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
        root.setBackgroundColor(Color.rgb(7, 59, 87));
        getWindow().setStatusBarColor(Color.rgb(7, 59, 87));
        getWindow().setNavigationBarColor(Color.rgb(7, 59, 87));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(7, 59, 87));
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (fullView != null) {
                root.setPadding(0, 0, 0, 0);
            } else {
                root.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
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
                setImmersive(true);
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
        setImmersive(false);
        if (fullCallback != null) { fullCallback.onCustomViewHidden(); fullCallback = null; }
    }
    private void setImmersive(boolean enabled) {
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams params = getWindow().getAttributes();
            params.layoutInDisplayCutoutMode = enabled
                ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT;
            getWindow().setAttributes(params);
        }
        if (enabled) root.setPadding(0, 0, 0, 0);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(!enabled);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                if (enabled) controller.hide(WindowInsets.Type.systemBars());
                else controller.show(WindowInsets.Type.systemBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(enabled
                ? View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                : View.SYSTEM_UI_FLAG_VISIBLE);
        }
        root.requestApplyInsets();
    }
    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && fullView != null) setImmersive(true);
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
