# 嵌入式/小屏设备原型模板参考

## 嵌入式/小屏完整模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<!-- viewport 按设备选择: 嵌入式 width=320 | 手表 width=240 | 手环 width=128 -->
<meta name="viewport" content="width=320, initial-scale=1, user-scalable=no">
<title>嵌入式原型</title>
<style>
:root {
  --primary:#60a5fa; --success:#4ade80; --warning:#fbbf24;
  --danger:#f87171; --info:#60a5fa; --offline:#6b7280;
  --bg:#0a0a0a; --text:#e5e5e5; --text-secondary:#9ca3af;
  --card-bg:#1a1a1a; --border:#333;
}
*{margin:0;padding:0;box-sizing:border-box}
body{width:320px;height:240px;background:var(--bg);color:var(--text);
  font-family:-apple-system,"Helvetica Neue",sans-serif;
  overflow:hidden;display:flex;flex-direction:column;user-select:none}
/* 状态栏 22px */
.status-bar{height:22px;display:flex;align-items:center;justify-content:space-between;
  padding:0 8px;font-size:11px;color:var(--text-secondary);background:rgba(255,255,255,.03);flex-shrink:0}
.status-bar .left,.status-bar .right{display:flex;gap:4px;align-items:center}
.status-bar .right{gap:6px}
.status-dot{width:6px;height:6px;border-radius:50%;background:var(--success)}
/* 主内容区 */
.main-content{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;
  align-items:center;justify-content:center}
/* 底部软键栏 40px */
.soft-keys{height:40px;display:flex;border-top:1px solid var(--border);flex-shrink:0}
.soft-keys button{flex:1;background:none;border:none;color:var(--primary);font-size:13px;
  font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;min-height:48px}
.soft-keys button:active{background:rgba(96,165,250,.15)}
.soft-keys button+button{border-left:1px solid var(--border)}
/* 大号数字 48-72px */
.big-number{font-family:"Courier New",monospace;font-size:56px;font-weight:700;
  color:var(--primary);text-align:center;line-height:1}
.big-number .unit{font-size:18px;color:var(--text-secondary);margin-left:4px}
.big-number .label{display:block;font-size:12px;color:var(--text-secondary);
  font-family:sans-serif;margin-top:4px;font-weight:400}
/* 状态指示器 12px圆点 */
.status-indicator{display:flex;align-items:center;gap:6px;font-size:13px}
.status-indicator .dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.dot-green{background:var(--success);box-shadow:0 0 6px var(--success)}
.dot-yellow{background:var(--warning);box-shadow:0 0 6px var(--warning)}
.dot-red{background:var(--danger);box-shadow:0 0 6px var(--danger)}
.dot-blue{background:var(--info);box-shadow:0 0 6px var(--info)}
.dot-gray{background:var(--offline)}
/* 进度条 4-6px */
.progress-bar{width:100%;height:5px;background:#333;border-radius:3px;overflow:hidden}
.progress-bar .fill{height:100%;border-radius:3px;transition:width .4s ease}
.fill-green{background:var(--success)} .fill-yellow{background:var(--warning)} .fill-red{background:var(--danger)}
/* 半圆仪表盘 conic-gradient */
.gauge{width:120px;height:60px;position:relative;
  background:conic-gradient(from .75turn,var(--success) 0deg,var(--warning) 90deg,var(--danger) 150deg,#333 180deg);
  border-radius:120px 120px 0 0;overflow:hidden;display:flex;align-items:flex-end;justify-content:center}
.gauge::after{content:"";position:absolute;width:80px;height:40px;background:var(--bg);
  border-radius:80px 80px 0 0;bottom:0}
.gauge .gauge-value{position:relative;z-index:1;font-size:18px;font-weight:700;margin-bottom:2px}
/* 告警行 */
.alert-row{width:100%;padding:6px 8px;display:flex;align-items:center;gap:6px;
  font-size:12px;border-radius:4px;margin-bottom:4px}
.alert-row.critical{background:rgba(248,113,113,.2);color:var(--danger)}
.alert-row.warn{background:rgba(251,191,36,.15);color:var(--warning)}
.alert-row.ok{background:rgba(74,222,128,.12);color:var(--success)}
.alert-row .alert-time{margin-left:auto;font-size:10px;opacity:.7}
/* 触摸按钮 min 48x48 */
.touch-btn{min-width:48px;min-height:48px;padding:8px 16px;background:var(--primary);
  color:#000;border:none;border-radius:6px;font-size:15px;font-weight:600;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:4px}
.touch-btn:active{opacity:.8} .touch-btn.danger-btn{background:var(--danger)}
/* 数据网格 2列 */
.data-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%}
.data-grid .cell{text-align:center}
.data-grid .cell-label{font-size:11px;color:var(--text-secondary)}
.data-grid .cell-value{font-size:18px;font-weight:600;margin-top:2px}
/* Toast */
.toast{position:fixed;top:28px;left:50%;transform:translateX(-50%);padding:4px 12px;
  border-radius:4px;font-size:12px;background:rgba(0,0,0,.85);color:#fff;z-index:999;
  opacity:0;transition:opacity .3s;pointer-events:none}
.toast.show{opacity:1}
/* 动画 */
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.blink{animation:blink 1s infinite}
@keyframes pulse-bg{0%,100%{opacity:.2}50%{opacity:.4}}
.pulse-bg{animation:pulse-bg 1.5s infinite}
</style>
</head>
<body>
  <div class="status-bar">
    <div class="left"><span class="status-dot"></span><span id="sys-title">系统监控</span></div>
    <div class="right"><span>🔋85%</span><span>📶</span><span id="clock">12:00</span></div>
  </div>
  <div class="main-content" id="screen0">
    <div class="big-number"><span id="mainVal">36.5</span><span class="unit">°C</span>
      <span class="label">核心温度</span></div>
    <div style="width:100%;margin-top:12px"><div class="data-grid">
      <div class="cell"><div class="cell-label">CPU</div><div class="cell-value" id="cpu">42%</div></div>
      <div class="cell"><div class="cell-label">内存</div><div class="cell-value" id="mem">6.2G</div></div>
    </div></div>
  </div>
  <div class="soft-keys">
    <button onclick="action1()">详情</button>
    <button onclick="action2()">切换</button>
    <button onclick="action3()">设置</button>
  </div>
  <div class="toast" id="toast"></div>
<script>
/* 时钟 */
setInterval(function(){var d=new Date();document.getElementById("clock").textContent=
  String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")},1000);
/* 多屏切换 */
var currentScreen=0, totalScreens=3;
function switchScreen(i){
  if(i<0)i=totalScreens-1; if(i>=totalScreens)i=0;
  document.querySelectorAll("[id^=screen]").forEach(function(s){s.style.display="none"});
  var el=document.getElementById("screen"+i); if(el){el.style.display="flex";currentScreen=i}
}
/* 滑动手势：左右=换表盘，上下=翻页，阈值40px */
var sx=0,sy=0;
document.addEventListener("touchstart",function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY});
document.addEventListener("touchend",function(e){
  var dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
  if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>40) switchScreen(currentScreen+(dx<0?1:-1));
  else if(Math.abs(dy)>40) switchScreen(currentScreen+(dy<0?1:-1));
});
/* Toast */
function showStatusToast(msg,type){type=type||"info";var t=document.getElementById("toast");
  var c={info:"var(--info)",success:"var(--success)",warning:"var(--warning)",danger:"var(--danger)"};
  t.textContent=msg;t.style.borderLeft="3px solid "+(c[type]||c.info);
  t.classList.add("show");setTimeout(function(){t.classList.remove("show")},2000)}
/* 更新数据 */
function updateValue(id,v){var el=document.getElementById(id);if(el)el.textContent=v}
function action1(){showStatusToast("查看详情","info")}
function action2(){switchScreen(currentScreen+1)}
function action3(){showStatusToast("打开设置","info")}
</script>
</body>
</html>
```

## 页面切换逻辑

- **switchScreen(index)** — 隐藏所有 `screenN`，显示目标屏幕，支持首尾循环。
- **滑动手势** — `touchstart/end` 算位移差，|dx|>|dy| 为水平（手表换表盘），否则垂直（手环翻页），阈值 40px。
- **showStatusToast(msg, type)** — 顶部 2 秒浮动提示，type: info/success/warning/danger。
- **updateValue(id, value)** — 实时更新元素文本。

## 设备模板变体

### 手表原型 (240x240 圆屏)

```html
<style>
body{width:240px;height:240px;border-radius:50%;overflow:hidden;background:var(--bg);
  display:flex;flex-direction:column;align-items:center;justify-content:center}
.watch-time{font-size:64px;font-family:monospace;font-weight:700;color:var(--text)}
.watch-date{font-size:13px;color:var(--text-secondary);margin-top:4px}
.watch-ring{position:absolute;top:8px;left:8px;right:8px;bottom:8px;border-radius:50%;border:2px solid var(--border)}
.ring-dot{position:absolute;width:6px;height:6px;border-radius:50%;background:var(--success)}
.ring-dot:nth-child(1){top:0;left:50%;transform:translateX(-50%)}
.ring-dot:nth-child(2){right:0;top:50%;transform:translateY(-50%)}
.ring-dot:nth-child(3){bottom:0;left:50%;transform:translateX(-50%)}
.ring-dot:nth-child(4){left:0;top:50%;transform:translateY(-50%)}
</style>
<!-- 圆环 + 4个方位指示点 -->
<div class="watch-ring">
  <span class="ring-dot"></span><span class="ring-dot"></span>
  <span class="ring-dot"></span><span class="ring-dot"></span>
</div>
<div class="watch-time" id="watchTime">14:30</div><!-- 中心大号时间 48-72px -->
<div class="watch-date">周三 · 步数 8,240</div><!-- 底部日期/状态 -->
```

### 手环原型 (128x240 窄长屏)

```html
<style>
body{width:128px;height:240px}
.band-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%}
.band-value{font-size:48px;font-family:monospace;font-weight:700}
.band-label{font-size:11px;color:var(--text-secondary);margin-top:4px}
.band-nav{position:fixed;right:2px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:4px}
.band-nav span{width:3px;height:12px;border-radius:2px;background:#333}
.band-nav span.active{background:var(--primary)}
</style>
<!-- 每屏一个指标，超大数字，极少文字；上下滑动翻页 -->
<div class="band-screen" id="screen0">
  <div class="band-value" style="color:var(--danger)">72</div>
  <div class="band-label">❤️ 心率 BPM</div>
</div>
<div class="band-nav"><span class="active"></span><span></span><span></span></div>
```

### 嵌入式小屏原型 (480x320)

```html
<style>
body{width:480px;height:320px}
.embed-header{height:28px;display:flex;align-items:center;padding:0 12px;background:#111;justify-content:space-between}
.embed-header .sys-name{font-weight:700;font-size:13px}
.embed-header .led{width:8px;height:8px;border-radius:50%;background:var(--success);box-shadow:0 0 4px var(--success)}
.embed-body{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;align-content:start}
.embed-card{background:var(--card-bg);border-radius:6px;padding:10px;text-align:center}
.embed-card .val{font-size:32px;font-family:monospace;font-weight:700}
.embed-card .lbl{font-size:11px;color:var(--text-secondary)}
</style>
<div class="embed-header"><!-- 顶栏：系统名+状态LED -->
  <span class="sys-name">工控终端 PLC-01</span>
  <span style="display:flex;gap:6px;align-items:center">
    <span class="led"></span><span style="font-size:11px">运行中</span></span>
</div>
<div class="embed-body"><!-- 中部主数据：大号读数网格 -->
  <div class="embed-card"><div class="val" style="color:var(--success)">36.5</div><div class="lbl">温度 °C</div></div>
  <div class="embed-card"><div class="val" style="color:var(--info)">1420</div><div class="lbl">转速 RPM</div></div>
  <div class="embed-card"><div class="val" style="color:var(--warning)">78%</div><div class="lbl">负载</div></div>
  <div class="embed-card"><div class="val" style="color:var(--primary)">24.1</div><div class="lbl">电压 V</div></div>
</div>
<!-- 底部软键栏用主模板 .soft-keys，标签可改为 F1/F2/F3 -->
```

### 服务器外带屏原型 (800x480)

```html
<style>
body{width:800px;height:480px}
.srv-summary{height:32px;background:#111;display:flex;align-items:center;padding:0 16px;gap:16px;font-size:12px}
.srv-summary .tag{padding:2px 8px;border-radius:3px;font-size:11px}
.tag-ok{background:rgba(74,222,128,.15);color:var(--success)}
.tag-warn{background:rgba(251,191,36,.15);color:var(--warning)}
.srv-grid{flex:1;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:8px;padding:12px}
.srv-cell{background:var(--card-bg);border-radius:6px;padding:12px;display:flex;flex-direction:column;justify-content:center}
.srv-cell .metric{font-size:36px;font-family:monospace;font-weight:700}
.srv-cell .trend{font-size:12px;margin-top:4px}
.trend-up{color:var(--danger)} .trend-down{color:var(--success)} .trend-stable{color:var(--text-secondary)}
.srv-ticker{height:28px;background:#111;display:flex;align-items:center;padding:0 12px;font-size:11px;color:var(--warning);overflow:hidden}
</style>
<div class="srv-summary"><!-- 状态汇总栏 -->
  <span style="font-weight:700">SRV-RACK-04</span>
  <span class="tag tag-ok">● 运行正常</span>
  <span class="tag tag-warn">⚠ 2 告警</span>
  <span style="margin-left:auto">运行时间: 127天</span>
</div>
<div class="srv-grid"><!-- 3x2 仪表网格，每格：指标+趋势 -->
  <div class="srv-cell"><div class="cell-label">CPU</div><div class="metric" style="color:var(--success)">23%</div><div class="trend trend-down">↓ -5%</div></div>
  <div class="srv-cell"><div class="cell-label">内存</div><div class="metric" style="color:var(--info)">48G</div><div class="trend trend-stable">— 稳定</div></div>
  <div class="srv-cell"><div class="cell-label">磁盘 I/O</div><div class="metric" style="color:var(--warning)">89%</div><div class="trend trend-up">↑ 偏高</div></div>
  <div class="srv-cell"><div class="cell-label">网络</div><div class="metric" style="color:var(--primary)">2.4G</div><div class="trend trend-stable">— 稳定</div></div>
  <div class="srv-cell"><div class="cell-label">温度</div><div class="metric" style="color:var(--success)">42°C</div><div class="trend trend-down">↓ -2°</div></div>
  <div class="srv-cell"><div class="cell-label">进程</div><div class="metric" style="color:var(--text)">384</div><div class="trend trend-stable">— 正常</div></div>
</div>
<div class="srv-ticker">⚠ [14:23] 磁盘 /dev/sda2 超85%&nbsp;&nbsp;⚠ [13:50] 风扇 #3 转速偏低</div>
```

### 安卓平板终端原型 (1024x768)

```html
<style>
body{width:1024px;height:768px;font-size:14px}
.tab-toolbar{height:56px;background:#111;display:flex;align-items:center;padding:0 16px;gap:12px}
.tab-toolbar button{width:48px;height:48px;border:none;background:rgba(255,255,255,.08);
  border-radius:8px;color:var(--text);font-size:20px;cursor:pointer}
.tab-toolbar button:active{background:rgba(255,255,255,.15)}
.tab-toolbar .title{font-size:18px;font-weight:600;margin-left:8px}
.tab-body{flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding:16px;align-content:start}
.tab-card{background:var(--card-bg);border-radius:10px;padding:16px;min-height:80px}
.tab-card .card-title{font-size:13px;color:var(--text-secondary)}
.tab-card .card-value{font-size:28px;font-weight:700;margin-top:6px}
/* 可选：列表+详情分栏 */
.tab-split{flex:1;display:grid;grid-template-columns:320px 1fr}
.tab-list{border-right:1px solid var(--border);overflow-y:auto}
.tab-detail{padding:16px}
</style>
<div class="tab-toolbar"><!-- 工具栏：大图标按钮 -->
  <button>☰</button><span class="title">设备管理</span>
  <button style="margin-left:auto">🔍</button><button>⚙️</button>
</div>
<div class="tab-body"><!-- 触摸优化网格，min 80px 触摸目标 -->
  <div class="tab-card"><div class="card-title">在线设备</div><div class="card-value" style="color:var(--success)">128</div></div>
  <div class="tab-card"><div class="card-title">告警数</div><div class="card-value" style="color:var(--danger)">3</div></div>
  <div class="tab-card"><div class="card-title">今日巡检</div><div class="card-value" style="color:var(--primary)">96%</div></div>
  <div class="tab-card"><div class="card-title">待维护</div><div class="card-value" style="color:var(--warning)">7</div></div>
</div>
```

## 组件代码片段

### 大号数字显示
```html
<div style="text-align:center">
  <span style="font-size:64px;font-family:monospace;font-weight:700;color:var(--primary)">36.5</span>
  <span style="font-size:18px;color:var(--text-secondary)">°C</span>
  <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">核心温度</div>
</div>
```

### 状态指示灯
```html
<!-- 绿=正常 黄=警告 红=故障 蓝=信息 灰=离线；blink类闪烁，pulse-bg脉动 -->
<div class="status-indicator"><span class="dot dot-green"></span> 运行正常</div>
<div class="status-indicator"><span class="dot dot-red blink"></span> 传感器故障</div>
```

### 进度/负载条
```html
<!-- <70% fill-green, 70-90% fill-yellow, >=90% fill-red -->
<div style="display:flex;align-items:center;gap:8px">
  <div class="progress-bar" style="flex:1"><div class="fill fill-green" style="width:45%"></div></div>
  <span style="font-size:12px;width:32px;text-align:right">45%</span>
</div>
```

### 迷你仪表盘
```html
<div class="gauge"><span class="gauge-value">72%</span></div>
<div style="text-align:center;font-size:11px;color:var(--text-secondary);margin-top:2px">CPU 负载</div>
```

### 数据网格
```html
<div class="data-grid">
  <div class="cell"><div class="cell-label">温度</div><div class="cell-value">36.5°C</div></div>
  <div class="cell"><div class="cell-label">湿度</div><div class="cell-value">62%</div></div>
  <div class="cell"><div class="cell-label">气压</div><div class="cell-value">1013hPa</div></div>
  <div class="cell"><div class="cell-label">风速</div><div class="cell-value">2.1m/s</div></div>
</div>
```

### 告警行
```html
<div class="alert-row critical pulse-bg">
  <span>🔴</span> 温度传感器 T3 超过阈值 85°C <span class="alert-time">14:23</span>
</div>
<div class="alert-row warn">
  <span>🟡</span> 风扇 #2 转速低于正常值 <span class="alert-time">13:50</span>
</div>
```

## 配色方案预设

| 方案 | --bg | --text | --primary | 适用 |
|------|------|--------|-----------|------|
| 工业深色（默认） | #0a0a0a | #e5e5e5 | #60a5fa | 嵌入式终端、工控屏 |
| 机房监控 | #0f172a | #e2e8f0 | #38bdf8 | 服务器外带屏、NOC |
| 医疗浅色 | #ffffff | #1e293b | #0d9488 | 医疗平板、床边终端 |
| 工业浅色 | #f1f5f9 | #0f172a | #2563eb | 手持终端、巡检设备 |

将对应色值覆盖到 `:root` CSS 变量即可全局换色。

## 小屏适配注意事项

1. **固定尺寸** — body 设为目标像素尺寸（如 320x240），`overflow:hidden` 禁止滚动。
2. **局部滚动** — 仅 `.main-content` 允许 `overflow-y:auto`。
3. **最小字号 12px** — 主数据 36-72px，辅助信息不低于 12px。
4. **避免精细效果** — 低端屏不支持精细阴影/渐变，用纯色高对比。
5. **高对比** — 避免相近色相，文字与背景亮度差要大。
6. **触摸目标 min 48px** — 戴手套场景增至 56px。
7. **实际像素测试** — 浏览器窗口调为设备实际像素预览。
8. **等宽字体** — 数字用 `monospace` 防数值变化时布局偏移。
