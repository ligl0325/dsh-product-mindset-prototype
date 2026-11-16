# 会议一体机大屏原型模板参考

> 本文件为 AI 生成会议一体机（100 寸触控大屏）原型时的参考素材。所有代码均为单文件 HTML 内联写法，无外部依赖，可直接保存为 .html 运行。

---

## 会议一体机完整模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920, initial-scale=1">
  <title>会议大屏</title>
  <style>
    :root {
      --primary: #3b82f6; --primary-light: #dbeafe; --success: #22c55e; --warning: #f59e0b;
      --danger: #ef4444; --info: #6366f1; --bg: #0f172a; --card-bg: #1e293b;
      --text: #f1f5f9; --text-secondary: #94a3b8; --border: #334155; --accent: #3b82f6; --radius: 12px;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; width: 100vw; height: 100vh; background: linear-gradient(135deg, var(--bg) 0%, #1a1a2e 100%); color: var(--text); overflow: hidden; display: flex; flex-direction: column; }
    .header-bar { height: 70px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: space-between; padding: 0 32px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .header-title { font-size: 24px; font-weight: 700; }
    .header-clock { font-size: 28px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .header-status { display: flex; align-items: center; gap: 8px; font-size: 20px; color: var(--text-secondary); }
    .status-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--success); }
    .main-content { flex: 1; padding: 24px 32px; overflow: hidden; }
    .grid-2x2 { display: grid; grid-template-columns: repeat(2,1fr); grid-template-rows: repeat(2,1fr); gap: 20px; height: 100%; }
    .grid-3x2 { display: grid; grid-template-columns: repeat(3,1fr); grid-template-rows: repeat(2,1fr); gap: 20px; height: 100%; }
    .grid-4x2 { display: grid; grid-template-columns: repeat(4,1fr); grid-template-rows: repeat(2,1fr); gap: 20px; height: 100%; }
    .metric-card { background: var(--card-bg); border-radius: var(--radius); padding: 28px 32px; border-top: 4px solid var(--accent); display: flex; flex-direction: column; justify-content: center; }
    .metric-card .number { font-size: 72px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .metric-card .unit { font-size: 24px; margin-left: 4px; }
    .metric-card .label { font-size: 22px; color: var(--text-secondary); margin-top: 8px; }
    .metric-card .trend { font-size: 20px; margin-top: 8px; font-weight: 500; }
    .trend-up { color: var(--success); } .trend-down { color: var(--danger); }
    .info-module { background: var(--card-bg); border-radius: var(--radius); padding: 24px 28px; overflow: hidden; }
    .info-module .title { font-size: 28px; font-weight: 700; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
    .info-module .content-area { font-size: 22px; line-height: 1.8; color: var(--text-secondary); }
    .progress-ring { width: 140px; height: 140px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .progress-ring .ring-value { font-size: 40px; font-weight: 700; z-index: 1; }
    .timeline { display: flex; align-items: flex-start; padding: 20px 0; }
    .timeline-node { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
    .timeline-node::after { content: ''; position: absolute; top: 12px; left: 50%; right: -50%; height: 3px; background: var(--border); }
    .timeline-node:last-child::after { display: none; }
    .timeline-dot { width: 24px; height: 24px; border-radius: 50%; background: var(--border); z-index: 1; }
    .timeline-dot.active { background: var(--primary); box-shadow: 0 0 16px var(--primary); }
    .timeline-dot.done { background: var(--success); }
    .timeline-label { font-size: 20px; margin-top: 10px; text-align: center; color: var(--text-secondary); }
    .avatar-grid { display: flex; flex-wrap: wrap; gap: 20px; }
    .avatar-item { display: flex; flex-direction: column; align-items: center; width: 80px; }
    .avatar-circle { width: 64px; height: 64px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; }
    .avatar-circle.offline { background: var(--border); color: var(--text-secondary); }
    .avatar-name { font-size: 18px; margin-top: 6px; text-align: center; color: var(--text-secondary); }
    .countdown-row { display: flex; align-items: center; justify-content: center; gap: 12px; }
    .digit-box { width: 80px; height: 120px; background: var(--card-bg); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 96px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .digit-colon { font-size: 96px; font-weight: 800; color: var(--text-secondary); }
    .split-screen { display: grid; gap: 0; height: 100%; }
    .split-2 { grid-template-columns: 1fr 2px 1fr; } .split-3 { grid-template-columns: 1fr 2px 1fr 2px 1fr; }
    .split-sep { background: var(--border); } .split-panel { padding: 20px 24px; overflow-y: auto; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 24px; font-weight: 600; padding: 8px 24px; border-radius: 40px; }
    .badge-live { background: var(--danger); color: #fff; } .badge-pause { background: var(--warning); color: #000; } .badge-done { background: var(--success); color: #fff; }
    .bottom-bar { height: 80px; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; gap: 16px; padding: 0 32px; border-top: 1px solid var(--border); flex-shrink: 0; }
    .bar-btn { height: 56px; min-width: 160px; border-radius: 12px; border: 2px solid transparent; font-size: 24px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .bar-btn:active { transform: scale(0.96); }
    .bar-btn.primary { background: var(--primary); color: #fff; } .bar-btn.outline { background: transparent; color: var(--primary); border-color: var(--primary); } .bar-btn.ghost { background: transparent; color: var(--text-secondary); border-color: var(--border); }
    .fullscreen-btn { position: fixed; top: 16px; right: 16px; z-index: 999; width: 48px; height: 48px; border-radius: 8px; background: rgba(0,0,0,0.5); color: var(--text); border: 1px solid var(--border); cursor: pointer; font-size: 22px; display: flex; align-items: center; justify-content: center; }
    .toast-container { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 8px; }
    .toast { padding: 16px 32px; border-radius: 12px; font-size: 22px; font-weight: 600; color: #fff; box-shadow: 0 8px 30px rgba(0,0,0,0.3); animation: toastIn 0.3s ease-out, toastOut 0.3s ease-in 3.7s forwards; }
    .toast-success { background: var(--success); } .toast-warning { background: var(--warning); color: #000; } .toast-error { background: var(--danger); } .toast-info { background: var(--info); }
    @keyframes toastIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes toastOut { from { opacity: 1; } to { opacity: 0; transform: translateY(-12px); } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .animate-in { animation: fadeInUp 0.4s ease-out; }
    .view { display: none; height: 100%; } .view.active { display: flex; flex-direction: column; }
  </style>
</head>
<body>
  <button class="fullscreen-btn" onclick="toggleFullscreen()" title="全屏">&#x26F6;</button>
  <header class="header-bar">
    <div class="header-title">智能会议室 A1</div>
    <div class="header-clock" id="clock">--:--:--</div>
    <div class="header-status"><span class="status-dot"></span> 已连接</div>
  </header>
  <main class="main-content" id="mainContent"><!-- 在此插入视图 --></main>
  <footer class="bottom-bar">
    <button class="bar-btn primary" onclick="showToast('操作成功','success')">开始会议</button>
    <button class="bar-btn outline" onclick="showToast('已暂停','warning')">暂停</button>
    <button class="bar-btn ghost" onclick="switchView('welcome')">返回首页</button>
  </footer>
  <div class="toast-container" id="toastContainer"></div>
  <script>
    function switchView(id) { document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active');}); var t=document.getElementById(id); if(t) t.classList.add('active'); }
    function toggleFullscreen() { if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }
    function updateClock() { var n=new Date(),p=function(v){return String(v).padStart(2,'0');}; document.getElementById('clock').textContent=p(n.getHours())+':'+p(n.getMinutes())+':'+p(n.getSeconds()); }
    setInterval(updateClock,1000); updateClock();
    var _cdTimer=null;
    function startCountdown(seconds,displayId) { clearInterval(_cdTimer); var r=seconds,el=document.getElementById(displayId); function tick(){var mm=String(Math.floor(r/60)).padStart(2,'0'),ss=String(r%60).padStart(2,'0'); if(el) el.textContent=mm+':'+ss; if(r<=0){clearInterval(_cdTimer);showToast('时间到！','warning');} r--;} tick(); _cdTimer=setInterval(tick,1000); }
    function animateNumber(id,from,to,dur) { var el=document.getElementById(id),st=performance.now(); dur=dur||800; function step(ts){var p=Math.min((ts-st)/dur,1),v=Math.round(from+(to-from)*p); if(el) el.textContent=v.toLocaleString(); if(p<1) requestAnimationFrame(step);} requestAnimationFrame(step); }
    function showToast(msg,type) { type=type||'info'; var c=document.getElementById('toastContainer'),t=document.createElement('div'); t.className='toast toast-'+type; t.textContent=msg; c.appendChild(t); setTimeout(function(){if(t.parentNode) t.parentNode.removeChild(t);},4000); }
    document.addEventListener('touchstart',function(e){},{passive:true});
    document.addEventListener('touchend',function(e){},{passive:true});
  </script>
</body>
</html>
```

---

## 页面切换与交互逻辑

以下函数已含在模板中，参数说明：

- **switchView(viewId)** — 切换 `.view` 视图，移除所有 `.active` 后给目标添加
- **toggleFullscreen()** — 进入/退出全屏 kiosk 模式
- **startCountdown(seconds, displayId)** — 倒计时，到 0 自动停止并 showToast
- **updateClock()** — 每秒刷新 HH:MM:SS 时钟
- **animateNumber(elementId, from, to, duration)** — 平滑数字过渡（默认 800ms）
- **showToast(message, type)** — 大屏 Toast（22px，3 米可视），type: success/warning/error/info
- 触控：touchstart/touchend passive 监听器，可扩展触控交互

---

## 页面类型模板

### 数据看板 (Dashboard)

```html
<!-- 3x2 网格：上排3个大指标 + 下排图表/活动列表/设备状态 -->
<div id="dashboard" class="view active"><div class="grid-3x2" style="height:100%">
  <div class="metric-card" style="border-top-color:var(--primary)"><div class="number" style="color:var(--primary)">128<span class="unit">人</span></div><div class="label">今日参会人数</div><div class="trend trend-up">&#8593; 12%</div></div>
  <div class="metric-card" style="border-top-color:var(--success)"><div class="number" style="color:var(--success)">96<span class="unit">%</span></div><div class="label">会议室利用率</div><div class="trend trend-up">&#8593; 5%</div></div>
  <div class="metric-card" style="border-top-color:var(--warning)"><div class="number" style="color:var(--warning)">14<span class="unit">场</span></div><div class="label">今日会议场次</div><div class="trend trend-down">&#8595; 2场</div></div>
  <div class="info-module"><div class="title">实时数据</div><div class="content-area"><!-- 图表占位 --></div></div>
  <div class="info-module"><div class="title">最近活动</div><div class="content-area"><p>14:30 产品评审会 — 进行中</p><p>13:00 周例会 — 已结束</p><p>10:00 客户接待 — 已结束</p></div></div>
  <div class="info-module"><div class="title">设备状态</div><div class="content-area"><p>投屏: 正常</p><p>麦克风: 正常</p><p>摄像头: 在线</p></div></div>
</div></div>
```

### 会议议程 (Agenda)

```html
<div id="agenda" class="view">
  <div class="info-module" style="margin-bottom:20px">
    <div class="title">产品评审会 — 议程</div>
    <div class="timeline">
      <div class="timeline-node"><div class="timeline-dot done"></div><div class="timeline-label">开场致辞</div></div>
      <div class="timeline-node"><div class="timeline-dot done"></div><div class="timeline-label">数据汇报</div></div>
      <div class="timeline-node"><div class="timeline-dot active"></div><div class="timeline-label" style="color:var(--text);font-weight:700">方案评审</div></div>
      <div class="timeline-node"><div class="timeline-dot"></div><div class="timeline-label">自由讨论</div></div>
      <div class="timeline-node"><div class="timeline-dot"></div><div class="timeline-label">总结收尾</div></div>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:24px;justify-content:center;">
    <div class="avatar-circle" style="width:80px;height:80px;font-size:32px;">李</div>
    <div><div style="font-size:28px;font-weight:700;">李明 — 产品总监</div><div style="font-size:22px;color:var(--text-secondary)">当前议题：方案评审</div></div>
    <div id="agendaTimer" style="font-size:48px;font-weight:800;color:var(--primary);margin-left:auto;">15:00</div>
  </div>
</div>
```

### 任务看板 (Task Board)

```html
<div id="taskboard" class="view">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;height:100%;">
    <div style="background:var(--card-bg);border-radius:var(--radius);padding:20px;">
      <div style="font-size:24px;font-weight:700;margin-bottom:16px;">待办 <span style="background:var(--border);padding:2px 12px;border-radius:20px;font-size:18px;">3</span></div>
      <div style="background:var(--bg);border-radius:8px;padding:16px;border-left:4px solid var(--danger);">
        <div style="font-size:24px;font-weight:600;">完成竞品分析报告</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
          <div class="avatar-circle" style="width:32px;height:32px;font-size:14px;">王</div>
          <span style="font-size:18px;color:var(--text-secondary);">王芳</span>
          <span class="status-badge" style="font-size:16px;padding:2px 12px;background:var(--danger);color:#fff;">紧急</span>
        </div>
        <div style="font-size:18px;color:var(--text-secondary);margin-top:8px;">截止: 03-20</div>
      </div>
    </div>
    <div style="background:var(--card-bg);border-radius:var(--radius);padding:20px;">
      <div style="font-size:24px;font-weight:700;">进行中 <span style="background:var(--primary);padding:2px 12px;border-radius:20px;font-size:18px;color:#fff;">2</span></div>
    </div>
    <div style="background:var(--card-bg);border-radius:var(--radius);padding:20px;">
      <div style="font-size:24px;font-weight:700;">已完成 <span style="background:var(--success);padding:2px 12px;border-radius:20px;font-size:18px;color:#fff;">5</span></div>
    </div>
  </div>
</div>
```

### 倒计时/计时器 (Timer)

```html
<div id="timer" class="view" style="align-items:center;justify-content:center;">
  <div style="text-align:center;">
    <div class="progress-ring" style="width:280px;height:280px;background:conic-gradient(var(--primary) 75%,var(--border) 75%);margin:0 auto;">
      <div style="width:240px;height:240px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center;">
        <div id="timerDisplay" style="font-size:72px;font-weight:800;">15:00</div>
      </div>
    </div>
    <div style="font-size:32px;color:var(--text-secondary);margin-top:20px;">茶歇时间</div>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:32px;">
      <button class="bar-btn primary" onclick="startCountdown(900,'timerDisplay')">开始</button>
      <button class="bar-btn outline" onclick="clearInterval(_cdTimer)">暂停</button>
      <button class="bar-btn ghost" onclick="document.getElementById('timerDisplay').textContent='15:00'">重置</button>
    </div>
  </div>
</div>
```

### 欢迎屏/签到屏 (Welcome)

```html
<div id="welcome" class="view" style="align-items:center;justify-content:center;text-align:center;">
  <div>
    <div style="font-size:64px;font-weight:800;margin-bottom:12px;">欢迎参加产品评审会</div>
    <div style="font-size:28px;color:var(--text-secondary);margin-bottom:40px;">2024年3月15日 14:00 — 16:00 | 会议室 A1 | 主持人：张总</div>
    <div class="avatar-grid" style="justify-content:center;max-width:900px;margin:0 auto;">
      <div class="avatar-item"><div class="avatar-circle">张</div><div class="avatar-name">张总</div></div>
      <div class="avatar-item"><div class="avatar-circle">李</div><div class="avatar-name">李明</div></div>
      <div class="avatar-item"><div class="avatar-circle">王</div><div class="avatar-name">王芳</div></div>
      <div class="avatar-item"><div class="avatar-circle offline">赵</div><div class="avatar-name">赵强</div></div>
    </div>
  </div>
</div>
```

---

## 组件代码片段

### 大号指标卡片
```html
<div class="metric-card" style="border-top-color:var(--success)">
  <div class="number" id="metric1" style="color:var(--success)">1,286</div>
  <div class="unit" style="font-size:24px;color:var(--text-secondary)">人次</div>
  <div class="label">本月会议参与</div>
  <div class="trend trend-up">&#8593; 18.5% 较上月</div>
</div>
<!-- 数字刷新：animateNumber('metric1', 0, 1286, 1000) -->
```

### 环形进度指示器
```html
<div style="text-align:center">
  <div class="progress-ring" style="background:conic-gradient(var(--success) 0% 72%,var(--warning) 72% 90%,var(--danger) 90% 100%);">
    <div style="width:110px;height:110px;border-radius:50%;background:var(--card-bg);display:flex;align-items:center;justify-content:center;"><span class="ring-value">72%</span></div>
  </div>
  <div style="font-size:20px;color:var(--text-secondary);margin-top:8px;">完成率</div>
</div>
```

### 时间轴节点
```html
<div class="timeline">
  <div class="timeline-node"><div class="timeline-dot done"></div><div class="timeline-label">已完成</div></div>
  <div class="timeline-node"><div class="timeline-dot active"></div><div class="timeline-label">进行中</div></div>
  <div class="timeline-node"><div class="timeline-dot"></div><div class="timeline-label">待开始</div></div>
</div>
```

### 参会人头像网格
```html
<div class="avatar-grid">
  <div class="avatar-item"><div class="avatar-circle">张</div><div class="avatar-name">张三</div></div>
  <div class="avatar-item"><div class="avatar-circle offline">李</div><div class="avatar-name">李四</div></div>
</div>
<!-- 已签到：默认；未签到：添加 .offline 类 -->
```

### 超大倒计时
```html
<div class="countdown-row">
  <div class="digit-box">1</div><div class="digit-box">5</div><div class="digit-colon">:</div><div class="digit-box">0</div><div class="digit-box">0</div>
</div>
```

### 底部操作栏
```html
<footer class="bottom-bar">
  <button class="bar-btn primary">开始会议</button>
  <button class="bar-btn outline">共享屏幕</button>
  <button class="bar-btn outline">白板</button>
  <button class="bar-btn ghost">结束会议</button>
</footer>
```

### 分屏布局
```html
<div class="split-screen split-2" style="height:100%;">
  <div class="split-panel"><!-- 左侧 --></div><div class="split-sep"></div><div class="split-panel"><!-- 右侧 --></div>
</div>
<!-- 3列用 .split-3 -->
```

---

## 配色方案预设

替换 `:root` 中 CSS 变量即可换肤：

| 方案 | --bg | --card-bg | --accent | 说明 |
|------|------|-----------|----------|------|
| **商务深蓝**（默认） | `#0f172a` | `#1e293b` | `#3b82f6` | 暗色蓝，适合大多数会议室 |
| **科技暗色** | `#0a0a0f` | `#181825` | `#8b5cf6` | 纯黑+紫，科技感强 |
| **明亮专业** | `#f8fafc` | `#ffffff` | `#2563eb` | 浅色，文字改 `#1e293b` |
| **会议绿** | `#0f1f17` | `#1a2e22` | `#22c55e` | 绿色调，适合生态主题 |

```css
/* 科技暗色 */ :root { --bg:#0a0a0f; --card-bg:#181825; --accent:#8b5cf6; --text:#f1f5f9; --text-secondary:#a1a1aa; --border:#27272a; }
/* 明亮专业 */ :root { --bg:#f8fafc; --card-bg:#ffffff; --accent:#2563eb; --text:#1e293b; --text-secondary:#64748b; --border:#e2e8f0; }
/* 会议绿 */   :root { --bg:#0f1f17; --card-bg:#1a2e22; --accent:#22c55e; --text:#f1f5f9; --text-secondary:#86efac; --border:#2d4a38; }
```

---

## 会议大屏适配注意事项

- **视口单位**：优先 `vw`/`vh`，确保 86/100/110 寸屏自适应缩放
- **最小字号**：所有可见内容不低于 `20px`，3 米距离外清晰可读
- **触控目标**：按钮最小 `80x80px`，适配站立触控
- **高对比度**：亮色文字+深色背景在会议室效果最佳
- **动画节制**：仅数据刷新/数字过渡用动画，避免分散注意力
- **分辨率测试**：尽量在 3840x2160 目标设备上验证
- **环境光**：暗色主题减少刺眼，多数会议室更合适
- **全屏 API**：`requestFullscreen()` 实现 kiosk 式展示
- **常驻信息**：时钟和连接状态始终在顶部栏，不随视图切换消失
- **横屏固定**：16:9 横屏，无需竖屏适配
