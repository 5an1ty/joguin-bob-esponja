package app.snakesponja;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;

/** Exercises a real WebView fullscreen request with trusted touch input. */
public class FullscreenSmoke extends Instrumentation {
    private Activity activity;
    private WebView web;
    @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
    private String js(String source) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> answer = new AtomicReference<>();
        runOnMainSync(() -> web.evaluateJavascript(source, value -> { answer.set(value); latch.countDown(); }));
        if (!latch.await(10, TimeUnit.SECONDS)) throw new AssertionError("JavaScript timed out");
        return answer.get();
    }
    private WebView findWeb(View view) {
        if (view instanceof WebView) return (WebView)view;
        if (view instanceof ViewGroup) for (int i=0; i<((ViewGroup)view).getChildCount(); i++) {
            WebView found = findWeb(((ViewGroup)view).getChildAt(i)); if(found != null) return found;
        }
        return null;
    }
    private void tap(String selector) throws Exception {
        JSONArray point = new JSONArray(js("(()=>{const r=document.querySelector('"+selector+"').getBoundingClientRect();return [(r.x+r.width/2)*devicePixelRatio,(r.y+r.height/2)*devicePixelRatio]})()"));
        int[] origin = new int[2]; runOnMainSync(() -> web.getLocationOnScreen(origin));
        float x=(float)point.getDouble(0)+origin[0], y=(float)point.getDouble(1)+origin[1];
        long now=SystemClock.uptimeMillis();
        sendPointerSync(MotionEvent.obtain(now,now,MotionEvent.ACTION_DOWN,x,y,0));
        sendPointerSync(MotionEvent.obtain(now,now+80,MotionEvent.ACTION_UP,x,y,0));
        SystemClock.sleep(1500);
    }
    private void verify(String name) throws Exception {
        if(!"true".equals(js("document.fullscreenElement===game"))) throw new AssertionError("Native fullscreen not active: "+name);
        if(!"true".equals(js("(()=>{let r=game.getBoundingClientRect();return Math.abs(r.width-innerWidth)<2&&Math.abs(r.height-innerHeight)<2})()"))) throw new AssertionError("Game does not fill viewport");
        runOnMainSync(() -> {
            ViewGroup content=activity.findViewById(android.R.id.content);
            View root=content.getChildAt(0);
            if(root.getPaddingTop()!=0||root.getPaddingBottom()!=0||root.getPaddingLeft()!=0||root.getPaddingRight()!=0) throw new AssertionError("System bar padding remains");
            View full=((ViewGroup)root).getChildAt(((ViewGroup)root).getChildCount()-1);
            if(full.getWidth()!=root.getWidth()||full.getHeight()!=root.getHeight()) throw new AssertionError("Fullscreen native surface leaves margins");
        });
        Bitmap shot=getUiAutomation().takeScreenshot();
        File file=new File(getTargetContext().getExternalFilesDir(null),name+".png");
        try(FileOutputStream out=new FileOutputStream(file)){shot.compress(Bitmap.CompressFormat.PNG,100,out);}
    }
    @Override public void onStart() {
        Bundle result=new Bundle();
        try {
            Intent intent=new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity=startActivitySync(intent);
            runOnMainSync(() -> web=findWeb(activity.findViewById(android.R.id.content)));
            for(int i=0;i<30;i++){if("true".equals(js("typeof startGame==='function'&&typeof mobileControlMode!=='undefined'")))break;SystemClock.sleep(500);}
            js("localStorage.setItem('bobSnakeDragLearned','true');startGame();clearTimeout(timer);fullscreenBtn.scrollIntoView({block:'center'});true");
            SystemClock.sleep(500);tap("#fullscreenBtn");tap("[data-orientation=portrait]");
            verify("fullscreen-portrait");
            runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
            SystemClock.sleep(2000);js("clearTimeout(timer)");verify("fullscreen-landscape");
            js("document.exitFullscreen();true");SystemClock.sleep(1500);
            if(!"true".equals(js("!document.fullscreenElement"))) throw new AssertionError("Fullscreen exit failed");
            result.putString("stream","FULLSCREEN_SMOKE_OK: portrait, landscape, viewport, native insets and exit\n");
            finish(Activity.RESULT_OK,result);
        } catch(Throwable error) {
            result.putString("stream","FULLSCREEN_SMOKE_FAILED: "+error+"\n");finish(Activity.RESULT_CANCELED,result);
        }
    }
}
