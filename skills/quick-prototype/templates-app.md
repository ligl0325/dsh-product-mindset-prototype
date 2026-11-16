原生 APP 原型模板参考 (iOS / Android)

## APP 原生端完整模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>APP原型 - iOS / Android</title>
<style>
/* ===== CSS Variables ===== */
:root {
  /* iOS 默认配色 */
  --primary: #007aff;
  --primary-rgb: 0,122,255;
  --success: #34c759; --warning: #ff9500; --danger: #ff3b30;
  --info: #8e8e93; --text: #000000; --text-secondary: #8e8e93;
  --bg: #f2f2f7; --card-bg: #ffffff; --card-bg-elevated: #ffffff;
  --separator: rgba(60,60,67,.12);
  --fill: rgba(120,120,128,.12);
  --label-secondary: rgba(60,60,67,.6);
  --label-tertiary: rgba(60,60,67,.3);
  --tab-bar-bg: rgba(249,249,249,.94);
  --nav-bar-bg: rgba(249,249,249,.94);
  --grouped-bg: #f2f2f7;
}
/* Android / Material Design 配色 */
:root.android {
  --primary: #1a73e8;
  --primary-rgb: 26,115,232;
  --success: #0f9d58; --warning: #f4b400; --danger: #db4437;
  --text: #202124; --text-secondary: #5f6368;
  --bg: #fafafa; --card-bg: #ffffff;
  --separator: rgba(0,0,0,.12);
  --fill: rgba(0,0,0,.04);
  --tab-bar-bg: #ffffff;
  --nav-bar-bg: #ffffff;
}

/* ===== Reset & Base ===== */
* { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
body {
  font-family: -apple-system, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "PingFang SC", sans-serif;
  background: var(--bg); color: var(--text); font-size: 15px;
  height: 100vh; overflow: hidden; display: flex; flex-direction: column;
  line-height: 1.47;
}
body.android {
  font-family: "Roboto", "Noto Sans SC", sans-serif;
  font-size: 14px; line-height: 1.5;
}

/* ===== 1. Status Bar (iOS 54px) ===== */
.status-bar {
  height: 54px; background: var(--nav-bar-bg); display: flex;
  align-items: flex-end; justify-content: space-between;
  padding: 0 24px 6px; font-size: 15px; font-weight: 600;
  flex-shrink: 0; position: relative; z-index: 50;
}
.status-bar .time { font-weight: 700; font-size: 15px; }
.status-bar .icons { display: flex; gap: 5px; align-items: center; font-size: 12px; }
.status-bar .notch {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 126px; height: 34px; background: #000; border-radius: 0 0 20px 20px;
}
body.android .status-bar {
  height: 28px; background: var(--primary); color: #fff;
  font-size: 12px; padding: 0 16px; align-items: center;
}
body.android .status-bar .notch { display: none; }

/* ===== 2. iOS Navigation Bar (44px) ===== */
.nav-bar {
  height: 44px; background: var(--nav-bar-bg);
  backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px);
  display: flex; align-items: center; justify-content: center;
  position: relative; flex-shrink: 0; z-index: 40;
  border-bottom: .5px solid var(--separator);
}
.nav-bar .title { font-size: 17px; font-weight: 600; letter-spacing: -.4px; }
.nav-bar .left, .nav-bar .right {
  position: absolute; top: 0; height: 44px; display: flex; align-items: center; gap: 8px;
}
.nav-bar .left { left: 8px; }
.nav-bar .right { right: 16px; }
.nav-bar .back-btn {
  display: flex; align-items: center; gap: 2px; color: var(--primary);
  font-size: 17px; cursor: pointer; border: none; background: none; padding: 8px 4px;
}
.nav-bar .back-btn::before { content: "\2039"; font-size: 28px; line-height: 1; margin-top: -2px; }
.nav-bar .action-btn {
  color: var(--primary); font-size: 17px; cursor: pointer; border: none; background: none; padding: 8px 4px;
}
body.android .nav-bar { display: none; } /* Android 使用 App Bar */

/* ===== 3. Android App Bar (56px, Material) ===== */
.app-bar {
  display: none; height: 56px; background: var(--primary); color: #fff;
  align-items: center; padding: 0 4px; flex-shrink: 0; z-index: 40;
  box-shadow: 0 2px 4px rgba(0,0,0,.15);
}
.app-bar .menu-btn {
  width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
  font-size: 22px; cursor: pointer; border: none; background: none; color: #fff; border-radius: 50%;
}
.app-bar .menu-btn:active { background: rgba(255,255,255,.12); }
.app-bar .title { font-size: 20px; font-weight: 500; margin-left: 8px; flex: 1; }
.app-bar .actions { display: flex; gap: 0; }
.app-bar .actions button {
  width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
  font-size: 20px; cursor: pointer; border: none; background: none; color: #fff; border-radius: 50%;
}
.app-bar .actions button:active { background: rgba(255,255,255,.12); }
body.android .app-bar { display: flex; }

/* ===== 4. Large Title (iOS 34px) ===== */
.large-title {
  font-size: 34px; font-weight: 700; letter-spacing: .37px;
  padding: 0 16px 8px; line-height: 1.2; flex-shrink: 0;
}
body.android .large-title { font-size: 24px; font-weight: 400; letter-spacing: 0; padding: 16px; }

/* ===== 5. Content Area ===== */
.content {
  flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
  padding-bottom: calc(83px + env(safe-area-inset-bottom));
}
.content.no-tab-bar { padding-bottom: 16px; }

/* ===== 6. iOS Grouped List (Settings Style) ===== */
.group-header {
  font-size: 13px; color: var(--label-secondary); text-transform: uppercase;
  letter-spacing: -.08px; padding: 24px 16px 6px; line-height: 1.38;
}
.group-footer {
  font-size: 13px; color: var(--label-secondary); padding: 6px 16px 0; line-height: 1.38;
}
.ios-list { background: var(--card-bg); border-radius: 10px; margin: 0 16px; overflow: hidden; }
.ios-list-item {
  min-height: 44px; display: flex; align-items: center; padding: 11px 16px;
  position: relative; cursor: pointer;
}
.ios-list-item:active { background: var(--fill); }
.ios-list-item + .ios-list-item { border-top: .5px solid var(--separator); }
.ios-list-item .icon {
  width: 29px; height: 29px; border-radius: 6px; display: flex;
  align-items: center; justify-content: center; font-size: 16px;
  margin-right: 12px; flex-shrink: 0; color: #fff;
}
.ios-list-item .item-body { flex: 1; min-width: 0; }
.ios-list-item .item-title { font-size: 17px; line-height: 1.29; }
.ios-list-item .item-subtitle { font-size: 13px; color: var(--label-secondary); margin-top: 2px; }
.ios-list-item .item-value {
  font-size: 17px; color: var(--label-secondary); margin-left: 8px; white-space: nowrap;
}
.ios-list-item .chevron {
  color: rgba(60,60,67,.3); font-size: 16px; margin-left: 4px; font-weight: 300;
}
.ios-list-item .chevron::after { content: "\203A"; font-size: 20px; }
body.android .ios-list { border-radius: 0; margin: 0; }
body.android .ios-list-item .chevron { display: none; }

/* ===== 7. Cards ===== */
.card {
  background: var(--card-bg); border-radius: 10px;
  padding: 16px; margin: 0 16px 12px;
  box-shadow: 0 0 0 .5px var(--separator);
}
body.android .card {
  border-radius: 8px; margin: 8px 16px; box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.08);
}
.card-title { font-size: 17px; font-weight: 600; margin-bottom: 8px; }
.card-desc { font-size: 15px; color: var(--label-secondary); }

/* ===== 8. Segmented Control (iOS) ===== */
.segmented {
  display: flex; background: var(--fill); border-radius: 8px;
  padding: 2px; margin: 12px 16px; flex-shrink: 0;
}
.segmented .seg-item {
  flex: 1; height: 32px; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 500; border-radius: 7px; cursor: pointer;
  transition: all .2s; color: var(--text); border: none; background: none;
}
.segmented .seg-item.active {
  background: var(--card-bg); box-shadow: 0 3px 8px rgba(0,0,0,.12), 0 3px 1px rgba(0,0,0,.04);
}
body.android .segmented {
  background: none; border-radius: 0; border-bottom: 1px solid var(--separator);
  padding: 0; margin: 0;
}
body.android .segmented .seg-item {
  border-radius: 0; height: 48px; font-size: 14px; text-transform: uppercase;
  letter-spacing: .5px; position: relative;
}
body.android .segmented .seg-item.active {
  background: none; box-shadow: none; color: var(--primary); font-weight: 600;
}
body.android .segmented .seg-item.active::after {
  content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
  background: var(--primary); border-radius: 3px 3px 0 0;
}

/* ===== 9. Search Bar ===== */
.search-bar {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px; flex-shrink: 0;
}
.search-bar .search-input-wrap {
  flex: 1; position: relative; display: flex; align-items: center;
}
.search-bar .search-icon {
  position: absolute; left: 10px; font-size: 15px; color: var(--label-secondary);
  z-index: 1; pointer-events: none;
}
.search-bar input {
  width: 100%; height: 36px; border: none; border-radius: 10px;
  background: var(--fill); padding: 0 12px 0 34px;
  font-size: 17px; color: var(--text); outline: none;
}
.search-bar input::placeholder { color: var(--label-secondary); }
.search-bar .cancel-btn {
  font-size: 17px; color: var(--primary); cursor: pointer; border: none;
  background: none; white-space: nowrap; display: none;
}
.search-bar .cancel-btn.show { display: block; }
body.android .search-bar input {
  border-radius: 24px; height: 48px; font-size: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,.12); background: var(--card-bg);
}

/* ===== 10. Buttons (50px, 12px radius) ===== */
.btn-group { padding: 0 16px; display: flex; flex-direction: column; gap: 10px; }
.btn {
  width: 100%; height: 50px; border: none; border-radius: 12px;
  font-size: 17px; font-weight: 600; cursor: pointer; transition: opacity .15s;
  display: flex; align-items: center; justify-content: center;
}
.btn:active { opacity: .7; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:disabled { opacity: .4; cursor: default; }
.btn-secondary { background: rgba(var(--primary-rgb),.12); color: var(--primary); }
.btn-danger { background: var(--danger); color: #fff; }
.btn-text { background: transparent; color: var(--primary); }
body.android .btn { border-radius: 24px; font-size: 14px; text-transform: uppercase; letter-spacing: .5px; font-weight: 500; }
body.android .btn-primary { box-shadow: 0 2px 4px rgba(var(--primary-rgb),.3); }

/* ===== 11. Bottom Tab Bar (83px + safe-area) ===== */
.tab-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: calc(83px + env(safe-area-inset-bottom));
  background: var(--tab-bar-bg);
  backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px);
  display: flex; border-top: .5px solid var(--separator); z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}
.tab-item {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: flex-start; padding-top: 6px; cursor: pointer;
  color: var(--label-secondary); font-size: 10px; position: relative;
}
.tab-item.active { color: var(--primary); }
.tab-item .tab-icon { font-size: 25px; margin-bottom: 2px; line-height: 1; }
.tab-item .tab-label { font-size: 10px; font-weight: 500; }
.tab-item .tab-badge {
  position: absolute; top: 2px; right: calc(50% - 20px);
  min-width: 18px; height: 18px; border-radius: 9px; background: var(--danger);
  color: #fff; font-size: 12px; font-weight: 600; display: flex;
  align-items: center; justify-content: center; padding: 0 5px;
}
body.android .tab-bar {
  height: 56px; background: var(--card-bg); border-top: none;
  box-shadow: 0 -1px 4px rgba(0,0,0,.08);
  padding-bottom: 0;
}
body.android .tab-item { justify-content: center; padding: 0; font-size: 0; }
body.android .tab-item .tab-icon { font-size: 24px; margin: 0; }
body.android .tab-item .tab-label { display: none; }
body.android .tab-item.active { color: var(--primary); }

/* ===== 12. FAB (Android, 56px) ===== */
.fab {
  display: none; position: fixed;
  bottom: calc(72px + env(safe-area-inset-bottom)); right: 16px;
  width: 56px; height: 56px; border-radius: 16px;
  background: var(--primary); color: #fff; border: none;
  font-size: 28px; cursor: pointer; z-index: 90;
  box-shadow: 0 6px 10px rgba(0,0,0,.2), 0 3px 3px rgba(0,0,0,.12);
  align-items: center; justify-content: center;
}
.fab:active { box-shadow: 0 2px 4px rgba(0,0,0,.2); }
body.android .fab { display: flex; }

/* ===== 13. Action Sheet / Bottom Sheet ===== */
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 199;
  opacity: 0; transition: opacity .3s; pointer-events: none;
}
.overlay.show { opacity: 1; pointer-events: auto; }
.action-sheet {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
  transform: translateY(100%); transition: transform .35s cubic-bezier(.32,.72,0,1);
}
.action-sheet.show { transform: translateY(0); }
/* iOS Action Sheet */
.action-sheet .sheet-body {
  background: var(--grouped-bg); padding: 0 8px; padding-bottom: 8px;
}
.action-sheet .sheet-card {
  background: var(--card-bg); border-radius: 14px; overflow: hidden;
}
.action-sheet .sheet-card + .sheet-card { margin-top: 8px; }
.action-sheet .sheet-title {
  padding: 14px 16px 4px; font-size: 13px; color: var(--label-secondary);
  text-align: center; line-height: 1.38;
}
.action-sheet .sheet-message {
  padding: 0 16px 14px; font-size: 13px; color: var(--label-secondary);
  text-align: center;
}
.action-sheet .sheet-item {
  height: 57px; display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: var(--primary); cursor: pointer;
  border-top: .5px solid var(--separator);
}
.action-sheet .sheet-item:first-child { border-top: none; }
.action-sheet .sheet-item:active { background: var(--fill); }
.action-sheet .sheet-item.destructive { color: var(--danger); }
.action-sheet .sheet-item.bold { font-weight: 600; }
body.android .action-sheet .sheet-body { padding: 0; background: var(--card-bg); }
body.android .action-sheet .sheet-card {
  border-radius: 0; box-shadow: 0 -2px 8px rgba(0,0,0,.15);
}
body.android .action-sheet .sheet-item {
  justify-content: flex-start; padding: 0 16px; font-size: 16px; height: 48px;
  border-top: none;
}

/* ===== 14. iOS Toggle Switch ===== */
.toggle {
  width: 51px; height: 31px; border-radius: 16px;
  background: rgba(120,120,128,.16); position: relative;
  cursor: pointer; transition: background .3s; flex-shrink: 0;
}
.toggle::after {
  content: ""; position: absolute; top: 2px; left: 2px;
  width: 27px; height: 27px; border-radius: 50%;
  background: #fff; box-shadow: 0 3px 8px rgba(0,0,0,.15), 0 3px 1px rgba(0,0,0,.06);
  transition: transform .3s;
}
.toggle.on { background: var(--success); }
.toggle.on::after { transform: translateX(20px); }
body.android .toggle { width: 36px; height: 14px; border-radius: 7px; background: rgba(0,0,0,.26); }
body.android .toggle::after {
  width: 20px; height: 20px; top: -3px; left: -1px; border-radius: 50%;
  background: #fafafa; box-shadow: 0 2px 4px rgba(0,0,0,.2);
}
body.android .toggle.on { background: rgba(var(--primary-rgb),.5); }
body.android .toggle.on::after { transform: translateX(18px); background: var(--primary); }

/* ===== 15. Badge ===== */
.badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; border-radius: 10px;
  background: var(--danger); color: #fff; font-size: 13px;
  font-weight: 600; padding: 0 6px; line-height: 1;
}
.badge-sm { min-width: 16px; height: 16px; border-radius: 8px; font-size: 11px; padding: 0 4px; }
.badge-dot {
  width: 10px; height: 10px; min-width: 10px; border-radius: 50%;
  background: var(--danger); padding: 0;
}

/* ===== 16. Empty State ===== */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 80px 32px; text-align: center;
}
.empty-state .empty-icon { font-size: 56px; margin-bottom: 16px; opacity: .6; }
.empty-state .empty-title { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
.empty-state .empty-desc { font-size: 15px; color: var(--label-secondary); line-height: 1.47; max-width: 240px; }
.empty-state .btn { width: auto; padding: 0 32px; margin-top: 24px; height: 44px; font-size: 15px; }

/* ===== 17. HUD Toast (iOS Centered) ===== */
.hud {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) scale(.8);
  background: rgba(0,0,0,.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  color: #fff; border-radius: 14px; padding: 20px 24px; min-width: 120px;
  text-align: center; z-index: 9999; opacity: 0; transition: all .25s;
  pointer-events: none;
}
.hud.show { opacity: 1; transform: translate(-50%,-50%) scale(1); }
.hud .hud-icon { font-size: 36px; margin-bottom: 10px; }
.hud .hud-text { font-size: 14px; font-weight: 500; }
.hud .hud-spinner {
  width: 36px; height: 36px; border: 3px solid rgba(255,255,255,.3);
  border-top-color: #fff; border-radius: 50%; margin: 0 auto 10px;
  animation: hud-spin .8s linear infinite;
}
@keyframes hud-spin { to { transform: rotate(360deg); } }

/* ===== 18. Material List Item (Android) ===== */
.mat-list-item {
  min-height: 48px; display: flex; align-items: center; padding: 12px 16px;
  background: var(--card-bg); cursor: pointer; position: relative;
}
.mat-list-item:active { background: var(--fill); }
.mat-list-item .mat-avatar {
  width: 40px; height: 40px; border-radius: 50%; background: var(--fill);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; margin-right: 16px; flex-shrink: 0;
}
.mat-list-item .mat-body { flex: 1; min-width: 0; }
.mat-list-item .mat-primary-text { font-size: 16px; line-height: 1.25; }
.mat-list-item .mat-secondary-text { font-size: 14px; color: var(--text-secondary); margin-top: 2px; line-height: 1.29; }
.mat-list-item .mat-trailing {
  margin-left: 16px; color: var(--text-secondary); font-size: 20px; flex-shrink: 0;
}
.mat-divider { height: 1px; background: var(--separator); margin-left: 72px; }
.mat-list-item + .mat-list-item { border-top: none; }

/* ===== Page System ===== */
.page { display: none; flex-direction: column; height: 100vh; }
.page.active { display: flex; }
.page-content {
  flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
  padding-bottom: calc(83px + env(safe-area-inset-bottom));
}

/* ===== Section Spacing ===== */
.section { margin-bottom: 8px; }
.section-title { font-size: 22px; font-weight: 700; padding: 16px 16px 8px; }
.section-padding { padding: 12px 16px; }

/* ===== Avatar ===== */
.avatar {
  width: 40px; height: 40px; border-radius: 50%; background: var(--primary);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 16px; font-weight: 600; flex-shrink: 0;
}

/* ===== Platform Toggle (Demo Only) ===== */
.platform-switch {
  position: fixed; top: 60px; right: 12px; z-index: 300;
  background: rgba(0,0,0,.7); color: #fff; border: none; border-radius: 16px;
  padding: 6px 12px; font-size: 12px; cursor: pointer; backdrop-filter: blur(8px);
}
</style>
</head>
<body>
<!-- Platform Toggle Button (Demo) -->
<button class="platform-switch" onclick="togglePlatform()">切换 Android</button>

<!-- ==================== iOS Status Bar ==================== -->
<div class="status-bar">
  <span class="time">9:41</span>
  <div class="notch"></div>
  <span class="icons">
    <svg width="16" height="12" viewBox="0 0 16 12"><path d="M1 7h2v4H1zM5 5h2v6H5zM9 3h2v8H9zM13 1h2v10h-2z" fill="currentColor"/></svg>
    <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2C5.5 2 3.2 3 1.5 4.7l1.2 1.2C4.1 4.5 5.9 3.8 8 3.8s3.9.7 5.3 2.1l1.2-1.2C12.8 3 10.5 2 8 2zm0 3.6c-1.6 0-3 .6-4.1 1.6l1.2 1.2c.8-.8 1.8-1.2 2.9-1.2s2.1.4 2.9 1.2l1.2-1.2C11 6.2 9.6 5.6 8 5.6z" fill="currentColor"/></svg>
    <svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="2.2" stroke="currentColor" fill="none" stroke-opacity=".35"/><rect x="22.5" y="3.5" width="2" height="5" rx="1" fill="currentColor" fill-opacity=".4"/><rect x="2" y="2" width="18.5" height="8" rx="1" fill="currentColor"/></svg>
  </span>
</div>

<!-- ==================== iOS Navigation Bar ==================== -->
<div class="nav-bar" id="navBar">
  <div class="left">
    <button class="back-btn" id="backBtn" onclick="goBack()" style="display:none">返回</button>
  </div>
  <span class="title" id="navTitle">首页</span>
  <div class="right">
    <button class="action-btn" onclick="showToast('操作按钮', 'info')">编辑</button>
  </div>
</div>

<!-- ==================== Android App Bar ==================== -->
<div class="app-bar">
  <button class="menu-btn" onclick="showToast('菜单', 'info')">&#9776;</button>
  <span class="title">首页</span>
  <div class="actions">
    <button onclick="showToast('搜索', 'info')">&#8981;</button>
    <button onclick="showToast('更多', 'info')">&#8942;</button>
  </div>
</div>

<!-- ==================== Page 1: Home ==================== -->
<div class="page active" id="page-home">
  <div class="content">
    <!-- Large Title -->
    <div class="large-title">首页</div>

    <!-- Search Bar -->
    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon">&#8981;</span>
        <input type="text" placeholder="搜索" onfocus="this.parentElement.querySelector('.cancel-btn')?.classList.add('show')">
      </div>
    </div>

    <!-- Segmented Control -->
    <div class="segmented" id="seg-home">
      <button class="seg-item active" onclick="switchSegment('seg-home', 0)">推荐</button>
      <button class="seg-item" onclick="switchSegment('seg-home', 1)">热门</button>
      <button class="seg-item" onclick="switchSegment('seg-home', 2)">最新</button>
    </div>

    <!-- Cards Section -->
    <div id="seg-home-panel-0">
      <div class="section">
        <div class="card">
          <div class="card-title">欢迎使用 APP 原型</div>
          <div class="card-desc">这是一个原生 APP 风格的交互原型模板，支持 iOS 和 Android 双平台切换。</div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:12px">
          <div class="avatar">张</div>
          <div style="flex:1">
            <div style="font-size:15px;font-weight:600">张三</div>
            <div style="font-size:13px;color:var(--label-secondary)">产品经理 · 3分钟前</div>
          </div>
          <span style="color:rgba(60,60,67,.3);font-size:20px">&#8250;</span>
        </div>
      </div>

      <!-- Buttons Demo -->
      <div class="section-title">按钮样式</div>
      <div class="btn-group" style="margin-bottom:16px">
        <button class="btn btn-primary" onclick="showHUD('success', '保存成功')">主要按钮</button>
        <button class="btn btn-secondary">次要按钮</button>
        <button class="btn btn-danger" onclick="showActionSheet()">危险按钮</button>
        <button class="btn btn-text">文字按钮</button>
      </div>
    </div>

    <div id="seg-home-panel-1" style="display:none">
      <div class="card"><div class="card-title">热门内容</div><div class="card-desc">这是热门分类下的内容。</div></div>
    </div>
    <div id="seg-home-panel-2" style="display:none">
      <div class="card"><div class="card-title">最新内容</div><div class="card-desc">这是最新分类下的内容。</div></div>
    </div>
  </div>
</div>

<!-- ==================== Page 2: Settings (Grouped List) ==================== -->
<div class="page" id="page-settings">
  <div class="content">
    <div class="large-title">设置</div>

    <!-- Profile Card -->
    <div class="section">
      <div class="ios-list">
        <div class="ios-list-item" onclick="showToast('个人资料', 'info')">
          <div class="icon" style="background:var(--primary);border-radius:50%;width:60px;height:60px;font-size:24px">张</div>
          <div class="item-body" style="margin-left:12px">
            <div class="item-title" style="font-size:20px;font-weight:600">张三</div>
            <div class="item-subtitle">Apple ID、iCloud、媒体与购买</div>
          </div>
          <span class="chevron"></span>
        </div>
      </div>
    </div>

    <div class="group-header">通用</div>
    <div class="ios-list">
      <div class="ios-list-item">
        <div class="icon" style="background:#007aff">&#9881;</div>
        <div class="item-body"><div class="item-title">通用</div></div>
        <span class="chevron"></span>
      </div>
      <div class="ios-list-item">
        <div class="icon" style="background:#5856d6">&#127912;</div>
        <div class="item-body"><div class="item-title">显示与亮度</div></div>
        <span class="chevron"></span>
      </div>
      <div class="ios-list-item">
        <div class="icon" style="background:#ff9500">&#128276;</div>
        <div class="item-body"><div class="item-title">通知</div></div>
        <span class="chevron"></span>
      </div>
    </div>

    <div class="group-header">偏好设置</div>
    <div class="ios-list">
      <div class="ios-list-item">
        <div class="icon" style="background:#34c759">&#128274;</div>
        <div class="item-body"><div class="item-title">隐私与安全</div></div>
        <span class="chevron"></span>
      </div>
      <div class="ios-list-item" onclick="toggleToggle(this)">
        <div class="icon" style="background:#ff3b30">&#127769;</div>
        <div class="item-body"><div class="item-title">深色模式</div></div>
        <div class="toggle" id="toggle-dark"></div>
      </div>
      <div class="ios-list-item" onclick="toggleToggle(this)">
        <div class="icon" style="background:#007aff">&#128276;</div>
        <div class="item-body">
          <div class="item-title">推送通知</div>
          <div class="item-subtitle">允许接收消息通知</div>
        </div>
        <div class="toggle on" id="toggle-notif"></div>
      </div>
      <div class="ios-list-item">
        <div class="icon" style="background:#5856d6">&#127760;</div>
        <div class="item-body"><div class="item-title">语言</div></div>
        <span class="item-value">简体中文</span>
        <span class="chevron"></span>
      </div>
      <div class="ios-list-item">
        <div class="icon" style="background:#ff9500">&#128230;</div>
        <div class="item-body"><div class="item-title">存储</div></div>
        <span class="item-value">32.5 GB</span>
        <span class="chevron"></span>
      </div>
    </div>
    <div class="group-footer">管理您的存储空间和缓存数据</div>

    <!-- Material List (Android) -->
    <div class="group-header">Material 列表 (Android)</div>
    <div>
      <div class="mat-list-item">
        <div class="mat-avatar">张</div>
        <div class="mat-body">
          <div class="mat-primary-text">张三</div>
          <div class="mat-secondary-text">产品经理 · 已读</div>
        </div>
        <div class="mat-trailing">14:30</div>
      </div>
      <div class="mat-divider"></div>
      <div class="mat-list-item">
        <div class="mat-avatar" style="background:var(--primary);color:#fff">李</div>
        <div class="mat-body">
          <div class="mat-primary-text">李四</div>
          <div class="mat-secondary-text">设计师 · 新消息</div>
        </div>
        <div class="mat-trailing">昨天</div>
      </div>
      <div class="mat-divider"></div>
      <div class="mat-list-item">
        <div class="mat-avatar">王</div>
        <div class="mat-body">
          <div class="mat-primary-text">王五</div>
          <div class="mat-secondary-text">工程师 · 已读</div>
        </div>
        <div class="mat-trailing">周一</div>
      </div>
    </div>

    <!-- Badge Demo -->
    <div class="section-title">徽标</div>
    <div style="display:flex;gap:12px;padding:0 16px 16px;align-items:center;flex-wrap:wrap">
      <span class="badge">3</span>
      <span class="badge">99+</span>
      <span class="badge badge-sm">5</span>
      <span class="badge badge-dot"></span>
    </div>
  </div>
</div>

<!-- ==================== Page 3: Explore (Empty State) ==================== -->
<div class="page" id="page-explore">
  <div class="content">
    <div class="large-title">发现</div>
    <!-- Segmented -->
    <div class="segmented" id="seg-explore">
      <button class="seg-item active" onclick="switchSegment('seg-explore', 0)">全部</button>
      <button class="seg-item" onclick="switchSegment('seg-explore', 1)">未读</button>
    </div>
    <div id="seg-explore-panel-0">
      <!-- Empty State -->
      <div class="empty-state">
        <div class="empty-icon">&#128237;</div>
        <div class="empty-title">暂无内容</div>
        <div class="empty-desc">这里还没有任何内容，试试刷新看看</div>
        <button class="btn btn-primary" onclick="showHUD('loading', '加载中');setTimeout(()=>hideHUD(),1500)">刷新</button>
      </div>
    </div>
    <div id="seg-explore-panel-1" style="display:none">
      <div class="empty-state">
        <div class="empty-icon">&#9989;</div>
        <div class="empty-title">全部已读</div>
        <div class="empty-desc">您已查看所有消息</div>
      </div>
    </div>
  </div>
</div>

<!-- ==================== Page 4: Profile ==================== -->
<div class="page" id="page-profile">
  <div class="content">
    <div class="large-title">我的</div>

    <div class="card" style="text-align:center;padding:24px 16px">
      <div class="avatar" style="width:72px;height:72px;font-size:28px;margin:0 auto 12px">张</div>
      <div style="font-size:22px;font-weight:700">张三</div>
      <div style="font-size:15px;color:var(--label-secondary);margin-top:4px">高级产品经理</div>
      <span class="badge" style="background:var(--success);margin-top:8px">在线</span>
    </div>

    <div class="ios-list" style="margin-bottom:16px">
      <div class="ios-list-item" onclick="showToast('我的订单', 'info')">
        <div class="icon" style="background:#ff9500">&#128203;</div>
        <div class="item-body"><div class="item-title">我的订单</div></div>
        <span class="item-value">2</span>
        <span class="chevron"></span>
      </div>
      <div class="ios-list-item" onclick="showToast('收藏夹', 'info')">
        <div class="icon" style="background:#ff3b30">&#10084;</div>
        <div class="item-body"><div class="item-title">收藏夹</div></div>
        <span class="chevron"></span>
      </div>
      <div class="ios-list-item" onclick="showToast('历史记录', 'info')">
        <div class="icon" style="background:#007aff">&#128368;</div>
        <div class="item-body"><div class="item-title">浏览历史</div></div>
        <span class="chevron"></span>
      </div>
    </div>

    <div class="btn-group" style="margin-top:24px">
      <button class="btn btn-secondary" onclick="showHUD('success', '已退出登录')">退出登录</button>
    </div>
  </div>
</div>

<!-- ==================== FAB (Android Only) ==================== -->
<button class="fab" onclick="showToast('新建内容', 'success')" style="display:none">+</button>

<!-- ==================== Bottom Tab Bar ==================== -->
<div class="tab-bar" id="tabBar">
  <div class="tab-item active" onclick="switchTab(0)">
    <span class="tab-icon">&#127968;</span>
    <span class="tab-label">首页</span>
  </div>
  <div class="tab-item" onclick="switchTab(1)">
    <span class="tab-icon">&#9881;</span>
    <span class="tab-label">设置</span>
    <span class="tab-badge">3</span>
  </div>
  <div class="tab-item" onclick="switchTab(2)">
    <span class="tab-icon">&#128269;</span>
    <span class="tab-label">发现</span>
  </div>
  <div class="tab-item" onclick="switchTab(3)">
    <span class="tab-icon">&#128100;</span>
    <span class="tab-label">我的</span>
  </div>
</div>

<!-- ==================== Overlay ==================== -->
<div class="overlay" id="overlay" onclick="closeActionSheet()"></div>

<!-- ==================== Action Sheet ==================== -->
<div class="action-sheet" id="actionSheet">
  <div class="sheet-body">
    <div class="sheet-card">
      <div class="sheet-title">选择操作</div>
      <div class="sheet-message">请选择您要执行的操作</div>
      <div class="sheet-item" onclick="showToast('拍照', 'success');closeActionSheet()">拍照</div>
      <div class="sheet-item" onclick="showToast('选择照片', 'success');closeActionSheet()">从相册选择</div>
      <div class="sheet-item" onclick="showToast('浏览文件', 'success');closeActionSheet()">浏览文件</div>
    </div>
    <div class="sheet-card">
      <div class="sheet-item destructive" onclick="showToast('已删除', 'danger');closeActionSheet()">删除</div>
    </div>
    <div class="sheet-card">
      <div class="sheet-item bold" onclick="closeActionSheet()">取消</div>
    </div>
  </div>
</div>

<!-- ==================== HUD Toast ==================== -->
<div class="hud" id="hud">
  <div class="hud-icon" id="hudIcon"></div>
  <div class="hud-spinner" id="hudSpinner" style="display:none"></div>
  <div class="hud-text" id="hudText"></div>
</div>

<script>
/* ===== Tab Switching ===== */
let currentTab = 0;
const pages = ['page-home', 'page-settings', 'page-explore', 'page-profile'];
const tabItems = document.querySelectorAll('.tab-item');
const navTitles = ['首页', '设置', '发现', '我的'];

function switchTab(i) {
  currentTab = i;
  tabItems.forEach((t, idx) => t.classList.toggle('active', idx === i));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pages[i]).classList.add('active');
  const navTitle = document.getElementById('navTitle');
  if (navTitle) navTitle.textContent = navTitles[i];
}

/* ===== Go Back ===== */
function goBack() {
  document.getElementById('backBtn').style.display = 'none';
  switchTab(currentTab);
}

/* ===== Segmented Control ===== */
function switchSegment(id, index) {
  const seg = document.getElementById(id);
  const items = seg.querySelectorAll('.seg-item');
  items.forEach((item, idx) => item.classList.toggle('active', idx === index));
  // Switch panels
  let i = 0;
  while (true) {
    const panel = document.getElementById(id + '-panel-' + i);
    if (!panel) break;
    panel.style.display = i === index ? '' : 'none';
    i++;
  }
}

/* ===== Toggle Switch ===== */
function toggleToggle(listItem) {
  const toggle = listItem.querySelector('.toggle');
  if (toggle) toggle.classList.toggle('on');
}

/* ===== Action Sheet ===== */
function showActionSheet() {
  document.getElementById('actionSheet').classList.add('show');
  document.getElementById('overlay').classList.add('show');
}
function closeActionSheet() {
  document.getElementById('actionSheet').classList.remove('show');
  document.getElementById('overlay').classList.remove('show');
}

/* ===== HUD Toast ===== */
let hudTimer = null;
function showHUD(type, text) {
  const hud = document.getElementById('hud');
  const icon = document.getElementById('hudIcon');
  const spinner = document.getElementById('hudSpinner');
  const txt = document.getElementById('hudText');
  txt.textContent = text || '';
  if (type === 'loading') {
    icon.style.display = 'none'; spinner.style.display = 'block';
  } else if (type === 'success') {
    icon.style.display = 'block'; icon.textContent = '\u2713'; spinner.style.display = 'none';
  } else if (type === 'error') {
    icon.style.display = 'block'; icon.textContent = '\u2715'; spinner.style.display = 'none';
  } else if (type === 'info') {
    icon.style.display = 'block'; icon.textContent = '\u2139'; spinner.style.display = 'none';
  }
  hud.classList.add('show');
  if (hudTimer) clearTimeout(hudTimer);
  if (type !== 'loading') {
    hudTimer = setTimeout(() => hud.classList.remove('show'), 1500);
  }
}
function hideHUD() {
  document.getElementById('hud').classList.remove('show');
}
function showToast(msg, type) {
  if (type === 'success') showHUD('success', msg);
  else if (type === 'danger') showHUD('error', msg);
  else showHUD('info', msg);
}

/* ===== Platform Toggle (Demo) ===== */
function togglePlatform() {
  const body = document.body;
  const btn = document.querySelector('.platform-switch');
  const fab = document.querySelector('.fab');
  if (body.classList.contains('android')) {
    body.classList.remove('android');
    btn.textContent = '\u5207\u6362 Android';
    if (fab) fab.style.display = 'none';
  } else {
    body.classList.add('android');
    btn.textContent = '\u5207\u6362 iOS';
    if (fab) fab.style.display = 'flex';
  }
}
</script>
</body>
</html>
```

## 页面切换逻辑

上方 `<script>` 已包含核心函数：

| 函数 | 用途 |
|------|------|
| `switchTab(index)` | 切换底部标签栏选中项，显示对应页面 |
| `goBack()` | 返回当前标签对应的页面 |
| `switchSegment(id, index)` | 切换分段控制器，显示对应面板 |
| `toggleToggle(listItem)` | 切换 iOS 开关状态 |
| `showActionSheet()` | 显示底部操作面板 |
| `closeActionSheet()` | 关闭底部操作面板 |
| `showHUD(type, text)` | 显示 HUD 提示，type 可选 `success`/`error`/`info`/`loading` |
| `hideHUD()` | 手动关闭 HUD（用于 loading 模式） |
| `showToast(msg, type)` | 简化 Toast 调用，type 可选 `success`/`danger`/`info` |
| `togglePlatform()` | iOS / Android 样式切换（演示用） |

## 组件代码片段

### iOS 分组列表项（带图标 + 值 + 箭头）
```html
<div class="ios-list">
  <div class="ios-list-item">
    <div class="icon" style="background:#007aff">&#9881;</div>
    <div class="item-body"><div class="item-title">通用</div></div>
    <span class="item-value">默认</span>
    <span class="chevron"></span>
  </div>
</div>
```

### iOS 列表项（带 Toggle 开关）
```html
<div class="ios-list-item" onclick="toggleToggle(this)">
  <div class="icon" style="background:#34c759">&#128276;</div>
  <div class="item-body">
    <div class="item-title">推送通知</div>
    <div class="item-subtitle">允许接收消息通知</div>
  </div>
  <div class="toggle on"></div>
</div>
```

### Material 列表项 (Android)
```html
<div class="mat-list-item">
  <div class="mat-avatar">张</div>
  <div class="mat-body">
    <div class="mat-primary-text">张三</div>
    <div class="mat-secondary-text">产品经理 · 已读</div>
  </div>
  <div class="mat-trailing">14:30</div>
</div>
<div class="mat-divider"></div>
```

### Segmented Control
```html
<div class="segmented" id="seg-demo">
  <button class="seg-item active" onclick="switchSegment('seg-demo', 0)">选项A</button>
  <button class="seg-item" onclick="switchSegment('seg-demo', 1)">选项B</button>
  <button class="seg-item" onclick="switchSegment('seg-demo', 2)">选项C</button>
</div>
<div id="seg-demo-panel-0">面板A内容</div>
<div id="seg-demo-panel-1" style="display:none">面板B内容</div>
<div id="seg-demo-panel-2" style="display:none">面板C内容</div>
```

### HUD Toast 调用
```html
<!-- 成功提示 -->
<button onclick="showHUD('success', '保存成功')">保存</button>
<!-- 加载中 -->
<button onclick="showHUD('loading', '加载中');setTimeout(()=>hideHUD(),2000)">提交</button>
<!-- 错误提示 -->
<button onclick="showHUD('error', '网络异常')">错误</button>
```

### 空状态
```html
<div class="empty-state">
  <div class="empty-icon">&#128237;</div>
  <div class="empty-title">暂无内容</div>
  <div class="empty-desc">这里还没有任何内容</div>
  <button class="btn btn-primary">刷新</button>
</div>
```

## APP 端配色预设

| 风格 | class | primary | 说明 |
|------|-------|---------|------|
| iOS 蓝 | (默认) | #007aff | Apple HIG 标准蓝 |
| Material 蓝 | `.android` | #1a73e8 | Google Material Design |
| 微信绿 | `.wechat` | #07c160 | 社交/通讯类 |
| 支付宝蓝 | `.alipay` | #1677ff | 金融/支付类 |
| 抖音深色 | `.douyin` | #fe2c55 | 短视频/娱乐 |
| 美团黄 | `.meituan` | #ffc300 | 生活服务 |
