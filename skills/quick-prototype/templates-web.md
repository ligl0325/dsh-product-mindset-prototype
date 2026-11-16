# Web 后台管理系统 — 完整模板与组件参考

> 本文件为 AI 生成后台原型时的参考素材，包含完整 HTML 骨架、CSS 主题变量、JS 交互逻辑和可复用组件片段。
> 所有代码均为单文件 HTML 内联写法，无需外部依赖，可直接保存为 .html 运行。

---

## Web 后台完整模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>后台管理系统</title>
  <style>
    /* ============================
       CSS 自定义属性 — 主题配色
       修改此处即可全局换色
       ============================ */
    :root {
      --primary: #2563eb;        /* 主色 */
      --primary-hover: #1d4ed8;  /* 主色悬停 */
      --primary-light: #eff6ff;  /* 主色浅底（卡片背景） */
      --success: #16a34a;        /* 成功 */
      --success-light: #f0fdf4;
      --warning: #f59e0b;        /* 警告 */
      --warning-light: #fffbeb;
      --danger: #dc2626;         /* 危险 */
      --danger-light: #fef2f2;
      --info: #0ea5e9;           /* 信息 */
      --info-light: #f0f9ff;

      --sidebar-bg: #1a1a2e;     /* 侧边栏背景 */
      --sidebar-text: #a0aec0;   /* 侧边栏文字 */
      --sidebar-active: #ffffff; /* 侧边栏激活项文字 */
      --sidebar-hover: #16213e;  /* 侧边栏悬停背景 */
      --sidebar-width: 220px;

      --bg: #f1f5f9;             /* 页面背景 */
      --card-bg: #ffffff;        /* 卡片背景 */
      --text: #1e293b;           /* 主文字 */
      --text-secondary: #64748b; /* 次要文字 */
      --border: #e2e8f0;         /* 边框 */
      --radius: 8px;             /* 全局圆角 */
    }

    /* ============================
       全局重置
       ============================ */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
                   "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 14px;
      line-height: 1.6;
    }
    a { color: var(--primary); text-decoration: none; }
    a:hover { color: var(--primary-hover); }

    /* ============================
       布局：侧边栏 + 主内容区
       ============================ */
    .layout {
      display: flex;
      min-height: 100vh;
    }

    /* --- 侧边栏 --- */
    .sidebar {
      width: var(--sidebar-width);
      background: var(--sidebar-bg);
      color: var(--sidebar-text);
      position: fixed;
      top: 0; left: 0; bottom: 0;
      overflow-y: auto;
      z-index: 100;
      display: flex;
      flex-direction: column;
    }
    .sidebar-logo {
      padding: 20px 16px;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      letter-spacing: 1px;
    }
    .sidebar-nav { flex: 1; padding: 12px 0; }
    .sidebar-nav .nav-group-title {
      padding: 12px 20px 6px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.3);
    }
    .sidebar-nav .nav-item {
      display: flex;
      align-items: center;
      padding: 10px 20px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
      color: var(--sidebar-text);
      border-left: 3px solid transparent;
    }
    .sidebar-nav .nav-item:hover {
      background: var(--sidebar-hover);
      color: #fff;
    }
    .sidebar-nav .nav-item.active {
      background: var(--sidebar-hover);
      color: var(--sidebar-active);
      border-left-color: var(--primary);
    }
    .sidebar-nav .nav-item .nav-icon {
      margin-right: 10px;
      width: 20px;
      text-align: center;
      font-size: 16px;
    }

    /* --- 主内容区 --- */
    .main {
      margin-left: var(--sidebar-width);
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* --- 顶栏 --- */
    .topbar {
      height: 56px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .topbar-breadcrumb { font-size: 14px; color: var(--text-secondary); }
    .topbar-breadcrumb span { color: var(--text); font-weight: 500; }
    .topbar-user {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .topbar-avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: var(--primary-light);
      color: var(--primary);
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 13px;
    }

    /* --- 内容容器 --- */
    .content {
      padding: 24px;
      flex: 1;
    }

    /* --- 页面标题 --- */
    .page-header {
      margin-bottom: 20px;
    }
    .page-header h2 {
      font-size: 20px;
      font-weight: 600;
      color: var(--text);
    }
    .page-header p {
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    /* ============================
       卡片
       ============================ */
    .card {
      background: var(--card-bg);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      padding: 20px;
      margin-bottom: 20px;
    }
    .card-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }

    /* ============================
       表格
       ============================ */
    .table-wrapper { overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    table th {
      background: #f8fafc;
      font-weight: 600;
      text-align: left;
      padding: 10px 12px;
      border-bottom: 2px solid var(--border);
      white-space: nowrap;
      color: var(--text-secondary);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    /* 斑马纹 */
    table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    /* 悬停行 */
    table tbody tr:hover {
      background: var(--primary-light);
    }
    /* 操作链接 */
    .action-link {
      color: var(--primary);
      cursor: pointer;
      margin-right: 12px;
      font-size: 13px;
    }
    .action-link:hover { text-decoration: underline; }
    .action-link.danger { color: var(--danger); }

    /* ============================
       按钮
       ============================ */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
      gap: 6px;
      line-height: 1.4;
    }
    .btn:active { transform: scale(0.97); }

    /* 主要按钮 */
    .btn-primary {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .btn-primary:hover {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
    }

    /* 描边按钮 */
    .btn-outline {
      background: transparent;
      color: var(--primary);
      border-color: var(--primary);
    }
    .btn-outline:hover {
      background: var(--primary);
      color: #fff;
    }

    /* 危险按钮 */
    .btn-danger {
      background: var(--danger);
      color: #fff;
      border-color: var(--danger);
    }
    .btn-danger:hover {
      background: #b91c1c;
      border-color: #b91c1c;
    }

    /* 成功按钮 */
    .btn-success {
      background: var(--success);
      color: #fff;
      border-color: var(--success);
    }
    .btn-success:hover {
      background: #15803d;
      border-color: #15803d;
    }

    /* 小尺寸按钮 */
    .btn-sm {
      padding: 4px 12px;
      font-size: 12px;
    }

    /* ============================
       表单输入
       ============================ */
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 6px;
      color: var(--text);
    }
    .form-input,
    .form-select,
    .form-textarea {
      width: 100%;
      padding: 8px 12px;
      font-size: 13px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #fff;
      color: var(--text);
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
    }
    .form-input:focus,
    .form-select:focus,
    .form-textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .form-input::placeholder { color: #94a3b8; }
    .form-textarea { resize: vertical; min-height: 80px; }
    .form-hint {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .form-error {
      font-size: 12px;
      color: var(--danger);
      margin-top: 4px;
    }

    /* ============================
       模态框（弹窗）
       ============================ */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.show {
      display: flex;
    }
    .modal {
      background: var(--card-bg);
      border-radius: var(--radius);
      width: 560px;
      max-width: 90vw;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      animation: modalIn 0.2s ease-out;
    }
    @keyframes modalIn {
      from { opacity: 0; transform: translateY(-20px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }
    .modal-header h3 { font-size: 16px; font-weight: 600; }
    .modal-close {
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      border-radius: 6px;
      font-size: 18px;
      color: var(--text-secondary);
      border: none;
      background: transparent;
    }
    .modal-close:hover { background: #f1f5f9; }
    .modal-body { padding: 20px; }
    .modal-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    /* ============================
       状态徽章
       ============================ */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      padding: 2px 10px;
      border-radius: 20px;
    }
    .badge-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .badge-success { background: var(--success-light); color: var(--success); }
    .badge-success .badge-dot { background: var(--success); }
    .badge-warning { background: var(--warning-light); color: var(--warning); }
    .badge-warning .badge-dot { background: var(--warning); }
    .badge-danger  { background: var(--danger-light); color: var(--danger); }
    .badge-danger  .badge-dot { background: var(--danger); }
    .badge-info    { background: var(--info-light); color: var(--info); }
    .badge-info    .badge-dot { background: var(--info); }
    .badge-default { background: #f1f5f9; color: #64748b; }
    .badge-default .badge-dot { background: #94a3b8; }

    /* ============================
       分页
       ============================ */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      margin-top: 16px;
      font-size: 13px;
    }
    .pagination .page-btn {
      min-width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      color: var(--text);
      transition: all 0.15s;
      padding: 0 8px;
    }
    .pagination .page-btn:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    .pagination .page-btn.active {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .pagination .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .pagination .page-info {
      color: var(--text-secondary);
      margin-right: 12px;
      font-size: 13px;
    }

    /* ============================
       Toast 通知提示
       ============================ */
    .toast-container {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    }
    .toast {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: #fff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      animation: toastIn 0.3s ease-out, toastOut 0.3s ease-in 2.7s forwards;
      pointer-events: auto;
      max-width: 400px;
      text-align: center;
    }
    .toast-success { background: var(--success); }
    .toast-warning { background: var(--warning); }
    .toast-error   { background: var(--danger); }
    .toast-info    { background: var(--info); }

    @keyframes toastIn {
      from { opacity: 0; transform: translateY(-12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes toastOut {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(-12px); }
    }

    /* ============================
       页面切换（多页面共用）
       ============================ */
    .page { display: none; }
    .page.active { display: block; }

    /* ============================
       Tab 标签页
       ============================ */
    .tabs {
      display: flex;
      border-bottom: 2px solid var(--border);
      margin-bottom: 20px;
      gap: 0;
    }
    .tab-item {
      padding: 10px 20px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }
    .tab-item:hover { color: var(--primary); }
    .tab-item.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }
    .tab-pane { display: none; }
    .tab-pane.active { display: block; }

    /* ============================
       筛选栏
       ============================ */
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 16px;
    }
    .filter-bar .form-group { margin-bottom: 0; }
    .filter-bar .form-input,
    .filter-bar .form-select {
      width: auto;
      min-width: 140px;
    }

    /* ============================
       指标卡片网格
       ============================ */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
    }
    .stat-card.blue::before  { background: var(--primary); }
    .stat-card.green::before { background: var(--success); }
    .stat-card.orange::before { background: var(--warning); }
    .stat-card.red::before   { background: var(--danger); }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;
    }
    .stat-value.blue  { color: var(--primary); }
    .stat-value.green { color: var(--success); }
    .stat-value.orange { color: var(--warning); }
    .stat-value.red   { color: var(--danger); }

    .stat-label {
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .stat-trend {
      font-size: 12px;
      margin-top: 8px;
      font-weight: 500;
    }
    .stat-trend.up   { color: var(--success); }
    .stat-trend.down { color: var(--danger); }

    /* ============================
       面包屑
       ============================ */
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }
    .breadcrumb a { color: var(--text-secondary); }
    .breadcrumb a:hover { color: var(--primary); }
    .breadcrumb .sep { color: #cbd5e1; }
    .breadcrumb .current { color: var(--text); font-weight: 500; }

    /* ============================
       详情页键值对
       ============================ */
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .detail-item {
      display: flex;
      border-bottom: 1px solid var(--border);
    }
    .detail-item:nth-last-child(-n+2) { border-bottom: none; }
    .detail-label {
      width: 120px;
      flex-shrink: 0;
      padding: 10px 16px;
      background: #f8fafc;
      font-size: 13px;
      color: var(--text-secondary);
      font-weight: 500;
      border-right: 1px solid var(--border);
    }
    .detail-value {
      flex: 1;
      padding: 10px 16px;
      font-size: 13px;
      color: var(--text);
    }

    /* ============================
       工具栏
       ============================ */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .toolbar-left { display: flex; align-items: center; gap: 8px; }
    .toolbar-right { display: flex; align-items: center; gap: 8px; }
  </style>
</head>
<body>
  <div class="layout">
    <!-- ===== 侧边栏 ===== -->
    <aside class="sidebar">
      <div class="sidebar-logo">管理系统</div>
      <nav class="sidebar-nav">
        <div class="nav-group-title">主要功能</div>
        <div class="nav-item active" onclick="showPage('page-dashboard', this)">
          <span class="nav-icon">&#9632;</span> 工作台
        </div>
        <div class="nav-item" onclick="showPage('page-users', this)">
          <span class="nav-icon">&#9679;</span> 用户管理
        </div>
        <div class="nav-item" onclick="showPage('page-orders', this)">
          <span class="nav-icon">&#9733;</span> 订单管理
        </div>
        <div class="nav-group-title">系统</div>
        <div class="nav-item" onclick="showPage('page-settings', this)">
          <span class="nav-icon">&#9881;</span> 系统设置
        </div>
      </nav>
    </aside>

    <!-- ===== 主内容 ===== -->
    <div class="main">
      <!-- 顶栏 -->
      <header class="topbar">
        <div class="topbar-breadcrumb">
          首页 / <span>工作台</span>
        </div>
        <div class="topbar-user">
          <span>管理员</span>
          <div class="topbar-avatar">A</div>
        </div>
      </header>

      <!-- 内容区 -->
      <div class="content">
        <!-- 页面: 工作台 -->
        <div id="page-dashboard" class="page active">
          <div class="page-header">
            <h2>工作台</h2>
            <p>欢迎回来，这是今日数据概览</p>
          </div>
          <!-- 在此放置页面内容 -->
        </div>

        <!-- 页面: 用户管理 -->
        <div id="page-users" class="page">
          <div class="page-header">
            <h2>用户管理</h2>
            <p>管理系统用户，支持搜索、筛选和批量操作</p>
          </div>
        </div>

        <!-- 页面: 订单管理 -->
        <div id="page-orders" class="page">
          <div class="page-header">
            <h2>订单管理</h2>
            <p>查看和处理所有订单</p>
          </div>
        </div>

        <!-- 页面: 系统设置 -->
        <div id="page-settings" class="page">
          <div class="page-header">
            <h2>系统设置</h2>
            <p>配置系统参数</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 模态框容器 -->
  <div class="modal-overlay" id="modalOverlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header">
        <h3 id="modalTitle">标题</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body" id="modalBody"></div>
      <div class="modal-footer" id="modalFooter"></div>
    </div>
  </div>

  <!-- Toast 容器 -->
  <div class="toast-container" id="toastContainer"></div>

  <script>
    /* ============================
       页面切换
       ============================ */
    function showPage(pageId, navEl) {
      // 隐藏所有页面
      document.querySelectorAll('.page').forEach(function(p) {
        p.classList.remove('active');
      });
      // 显示目标页面
      var target = document.getElementById(pageId);
      if (target) target.classList.add('active');

      // 更新侧边栏激活状态
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(function(n) {
        n.classList.remove('active');
      });
      if (navEl) navEl.classList.add('active');
    }

    /* ============================
       模态框
       ============================ */
    function openModal(options) {
      // options: { title, body, footer }
      var overlay = document.getElementById('modalOverlay');
      document.getElementById('modalTitle').textContent = options.title || '提示';
      document.getElementById('modalBody').innerHTML = options.body || '';
      document.getElementById('modalFooter').innerHTML = options.footer ||
        '<button class="btn btn-outline" onclick="closeModal()">关闭</button>';
      overlay.classList.add('show');
    }
    function closeModal() {
      document.getElementById('modalOverlay').classList.remove('show');
    }

    /* ============================
       Toast 通知
       type: success | warning | error | info
       ============================ */
    function showToast(message, type) {
      type = type || 'info';
      var container = document.getElementById('toastContainer');
      var toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      toast.textContent = message;
      container.appendChild(toast);
      // 3 秒后自动移除
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 3000);
    }

    /* ============================
       Tab 标签切换
       ============================ */
    function switchTab(tabGroup, tabName, el) {
      // 切换 tab 按钮激活状态
      var tabs = document.querySelectorAll('[data-tab-group="' + tabGroup + '"] .tab-item');
      tabs.forEach(function(t) { t.classList.remove('active'); });
      if (el) el.classList.add('active');

      // 切换 tab 内容面板
      var panes = document.querySelectorAll('[data-tab-pane-group="' + tabGroup + '"] .tab-pane');
      panes.forEach(function(p) { p.classList.remove('active'); });
      var target = document.getElementById(tabName);
      if (target) target.classList.add('active');
    }
  </script>
</body>
</html>
```

---

## 页面切换逻辑

以下 JS 函数已包含在上方模板中，此处列出详细说明供参考。

### showPage(id, el) — 页面切换

```javascript
/**
 * 切换显示页面，同时更新侧边栏导航的激活状态。
 * @param {string} id     - 目标页面的 DOM id（如 'page-users'）
 * @param {HTMLElement} el - 被点击的导航项元素（用于添加 .active 类）
 *
 * 用法示例：
 *   <div class="nav-item" onclick="showPage('page-users', this)">用户管理</div>
 *   <div id="page-users" class="page">...</div>
 *
 * 工作原理：
 *   1. 移除所有 .page 元素的 .active 类
 *   2. 给目标 id 元素添加 .active 类
 *   3. 移除所有 .nav-item 的 .active 类
 *   4. 给当前点击的 el 添加 .active 类
 */
function showPage(id, el) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  var target = document.getElementById(id);
  if (target) target.classList.add('active');
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(function(n) { n.classList.remove('active'); });
  if (el) el.classList.add('active');
}
```

### openModal / closeModal — 模态框

```javascript
/**
 * 打开模态框弹窗
 * @param {Object} options
 * @param {string} options.title  - 弹窗标题
 * @param {string} options.body   - 弹窗内容（支持 HTML 字符串）
 * @param {string} options.footer - 底部按钮区（支持 HTML，默认显示"关闭"按钮）
 *
 * 用法示例：
 *   openModal({
 *     title: '确认删除',
 *     body: '<p>确定要删除这条记录吗？此操作不可撤销。</p>',
 *     footer: '<button class="btn btn-outline" onclick="closeModal()">取消</button>' +
 *             '<button class="btn btn-danger" onclick="handleDelete();closeModal()">确认删除</button>'
 *   });
 */
function openModal(options) {
  var overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = options.title || '提示';
  document.getElementById('modalBody').innerHTML = options.body || '';
  document.getElementById('modalFooter').innerHTML = options.footer ||
    '<button class="btn btn-outline" onclick="closeModal()">关闭</button>';
  overlay.classList.add('show');
}

/** 关闭模态框 */
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}
```

### showToast(message, type) — 轻提示

```javascript
/**
 * 显示 Toast 通知提示，3 秒后自动消失。不使用 alert()。
 * @param {string} message - 提示文字
 * @param {string} type    - 类型：success | warning | error | info（默认 info）
 *
 * 用法示例：
 *   showToast('保存成功', 'success');
 *   showToast('网络异常，请重试', 'error');
 *   showToast('请输入必填项', 'warning');
 */
function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toastContainer');
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function() {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
}
```

### switchTab(tabGroup, tabName, el) — Tab 标签页切换

```javascript
/**
 * 在同一页面内切换 Tab 标签页内容。
 * @param {string} tabGroup - 标签组名称（用于区分不同组的 tab）
 * @param {string} tabName  - 目标 tab-pane 的 DOM id
 * @param {HTMLElement} el   - 被点击的 tab-item 元素
 *
 * HTML 结构示例：
 *   <div class="tabs" data-tab-group="userTabs">
 *     <div class="tab-item active" onclick="switchTab('userTabs','tab-info',this)">基本信息</div>
 *     <div class="tab-item" onclick="switchTab('userTabs','tab-log',this)">操作日志</div>
 *   </div>
 *   <div data-tab-pane-group="userTabs">
 *     <div id="tab-info" class="tab-pane active">基本信息内容</div>
 *     <div id="tab-log" class="tab-pane">操作日志内容</div>
 *   </div>
 */
function switchTab(tabGroup, tabName, el) {
  var tabs = document.querySelectorAll('[data-tab-group="' + tabGroup + '"] .tab-item');
  tabs.forEach(function(t) { t.classList.remove('active'); });
  if (el) el.classList.add('active');
  var panes = document.querySelectorAll('[data-tab-pane-group="' + tabGroup + '"] .tab-pane');
  panes.forEach(function(p) { p.classList.remove('active'); });
  var target = document.getElementById(tabName);
  if (target) target.classList.add('active');
}
```

---

## 组件代码片段

以下每个组件均可直接复制粘贴到模板的 `.content` 区域内使用。

---

### 指标卡片（4 列网格）

```html
<!-- 指标卡片 — 4列网格布局 -->
<!-- 用法：放入 .content 区域，自动显示为 4 列 -->
<div class="stats-grid">
  <!-- 卡片 1 — 蓝色 -->
  <div class="stat-card blue">
    <div class="stat-value blue">12,846</div>
    <div class="stat-label">总用户数</div>
    <div class="stat-trend up">&#8593; 12.5% 较上月</div>
  </div>
  <!-- 卡片 2 — 绿色 -->
  <div class="stat-card green">
    <div class="stat-value green">&#165; 86,420</div>
    <div class="stat-label">本月营收</div>
    <div class="stat-trend up">&#8593; 8.3% 较上月</div>
  </div>
  <!-- 卡片 3 — 橙色 -->
  <div class="stat-card orange">
    <div class="stat-value orange">1,253</div>
    <div class="stat-label">待处理订单</div>
    <div class="stat-trend down">&#8595; 3.1% 较上月</div>
  </div>
  <!-- 卡片 4 — 红色 -->
  <div class="stat-card red">
    <div class="stat-value red">23</div>
    <div class="stat-label">异常告警</div>
    <div class="stat-trend down">&#8595; 15.0% 较上月</div>
  </div>
</div>

<!--
  设计说明：
  - 数字使用 32px 加粗字体，颜色与卡片顶部线条对应
  - 标签 13px 灰色
  - 趋势指示：绿色 ↑ 表示增长，红色 ↓ 表示下降
  - 卡片顶部有 3px 彩色线条装饰
  - 响应式：如需 2 列布局，将 grid-template-columns 改为 repeat(2, 1fr)
-->
```

---

### 数据表格

```html
<!-- 数据表格 — 含排序指示、状态徽章、操作链接和分页 -->
<div class="card">
  <div class="card-title">
    订单列表
    <div style="float:right">
      <button class="btn btn-primary btn-sm" onclick="showToast('功能开发中','info')">+ 新建</button>
    </div>
  </div>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>订单编号 &#9650;&#9660;</th>
          <th>客户名称</th>
          <th>金额</th>
          <th>状态</th>
          <th>创建时间 &#9650;&#9660;</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight:500">ORD-20240001</td>
          <td>张三</td>
          <td>&#165; 2,580.00</td>
          <td>
            <span class="badge badge-success">
              <span class="badge-dot"></span>已完成
            </span>
          </td>
          <td>2024-03-15 10:23</td>
          <td>
            <a class="action-link" onclick="showToast('查看详情','info')">查看</a>
            <a class="action-link" onclick="showToast('编辑功能','info')">编辑</a>
            <a class="action-link danger" onclick="showToast('已删除','success')">删除</a>
          </td>
        </tr>
        <tr>
          <td style="font-weight:500">ORD-20240002</td>
          <td>李四</td>
          <td>&#165; 12,000.00</td>
          <td>
            <span class="badge badge-warning">
              <span class="badge-dot"></span>处理中
            </span>
          </td>
          <td>2024-03-15 09:15</td>
          <td>
            <a class="action-link" onclick="showToast('查看详情','info')">查看</a>
            <a class="action-link" onclick="showToast('编辑功能','info')">编辑</a>
            <a class="action-link danger" onclick="showToast('已删除','success')">删除</a>
          </td>
        </tr>
        <tr>
          <td style="font-weight:500">ORD-20240003</td>
          <td>王五</td>
          <td>&#165; 680.00</td>
          <td>
            <span class="badge badge-danger">
              <span class="badge-dot"></span>已取消
            </span>
          </td>
          <td>2024-03-14 16:42</td>
          <td>
            <a class="action-link" onclick="showToast('查看详情','info')">查看</a>
            <a class="action-link" onclick="showToast('编辑功能','info')">编辑</a>
            <a class="action-link danger" onclick="showToast('已删除','success')">删除</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <!-- 分页栏 -->
  <div class="pagination">
    <span class="page-info">共 68 条记录</span>
    <button class="page-btn" disabled>&laquo;</button>
    <button class="page-btn" disabled>&lsaquo;</button>
    <button class="page-btn active">1</button>
    <button class="page-btn">2</button>
    <button class="page-btn">3</button>
    <button class="page-btn">4</button>
    <button class="page-btn">5</button>
    <button class="page-btn">&rsaquo;</button>
    <button class="page-btn">&raquo;</button>
  </div>
</div>

<!--
  设计说明：
  - 表头使用 ▲▼ 字符表示可排序（实际排序逻辑按需添加）
  - 斑马纹通过 CSS :nth-child(even) 实现
  - 行悬停高亮通过 CSS :hover 实现
  - 状态列使用 badge 组件（圆点 + 文字）
  - 操作列使用 action-link（查看/编辑/删除），删除用红色
  - 分页栏右对齐，显示总条数 + 页码按钮
-->
```

---

### 筛选栏

```html
<!-- 筛选栏 — 下拉框 + 日期范围 + 搜索 + 查询/重置 -->
<div class="card" style="padding: 16px 20px;">
  <div class="filter-bar">
    <div class="form-group">
      <label>状态</label>
      <select class="form-select">
        <option value="">全部状态</option>
        <option>已完成</option>
        <option>处理中</option>
        <option>已取消</option>
      </select>
    </div>
    <div class="form-group">
      <label>类别</label>
      <select class="form-select">
        <option value="">全部类别</option>
        <option>类别A</option>
        <option>类别B</option>
      </select>
    </div>
    <div class="form-group">
      <label>开始日期</label>
      <input type="date" class="form-input" style="min-width:150px">
    </div>
    <div class="form-group">
      <label>结束日期</label>
      <input type="date" class="form-input" style="min-width:150px">
    </div>
    <div class="form-group">
      <label>关键词</label>
      <input type="text" class="form-input" placeholder="搜索编号/名称..." style="min-width:180px">
    </div>
    <div class="form-group" style="align-self:flex-end">
      <button class="btn btn-primary" onclick="showToast('查询完成','success')">查询</button>
    </div>
    <div class="form-group" style="align-self:flex-end">
      <button class="btn btn-outline" onclick="showToast('已重置','info')">重置</button>
    </div>
  </div>
</div>

<!--
  设计说明：
  - 筛选项横向排列，自动换行（flex-wrap: wrap）
  - 下拉框使用 <select>，日期使用 <input type="date">
  - 搜索框使用 placeholder 提示
  - "查询"按钮为主色，"重置"按钮为描边样式
  - 所有筛选项底部对齐（align-items: flex-end）
-->
```

---

### 详情页键值对

```html
<!-- 详情页 — 2列键值对布局 -->
<div class="card">
  <div class="card-title">基本信息</div>
  <div class="detail-grid">
    <div class="detail-item">
      <div class="detail-label">订单编号</div>
      <div class="detail-value">ORD-20240001</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">客户名称</div>
      <div class="detail-value">张三</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">订单金额</div>
      <div class="detail-value" style="font-weight:600;color:var(--primary)">&#165; 2,580.00</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">订单状态</div>
      <div class="detail-value">
        <span class="badge badge-success">
          <span class="badge-dot"></span>已完成
        </span>
      </div>
    </div>
    <div class="detail-item">
      <div class="detail-label">创建时间</div>
      <div class="detail-value">2024-03-15 10:23:45</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">支付方式</div>
      <div class="detail-value">微信支付</div>
    </div>
  </div>
</div>

<!--
  设计说明：
  - 使用 CSS Grid 2列布局
  - 标签列 120px 固定宽、灰色背景（#f8fafc）
  - 值列白色背景、自适应宽度
  - 状态字段直接嵌入 badge 组件
  - 重要数值可加粗并使用主色
  - 如需更多列，修改 grid-template-columns 为 repeat(3, 1fr) 等
-->
```

---

### 表单

```html
<!-- 表单 — 标签 + 输入框模式，分组卡片包裹 -->
<div class="card">
  <div class="card-title">新建用户</div>
  <form onsubmit="event.preventDefault(); showToast('保存成功','success');">
    <!-- 基本信息组 -->
    <div style="margin-bottom: 24px;">
      <h4 style="font-size:14px; font-weight:600; margin-bottom:16px; color:var(--text-secondary);">基本信息</h4>

      <div class="form-group" style="display:flex; align-items:center;">
        <label style="width:100px; flex-shrink:0; margin-bottom:0; text-align:right; padding-right:12px;">
          用户名 <span style="color:var(--danger)">*</span>
        </label>
        <div style="width:320px;">
          <input type="text" class="form-input" placeholder="请输入用户名（4-20位）" required>
          <div class="form-hint">支持字母、数字和下划线，4-20 个字符</div>
        </div>
      </div>

      <div class="form-group" style="display:flex; align-items:center;">
        <label style="width:100px; flex-shrink:0; margin-bottom:0; text-align:right; padding-right:12px;">
          邮箱 <span style="color:var(--danger)">*</span>
        </label>
        <div style="width:320px;">
          <input type="email" class="form-input" placeholder="请输入邮箱地址" required>
        </div>
      </div>

      <div class="form-group" style="display:flex; align-items:center;">
        <label style="width:100px; flex-shrink:0; margin-bottom:0; text-align:right; padding-right:12px;">
          手机号
        </label>
        <div style="width:320px;">
          <input type="tel" class="form-input" placeholder="请输入手机号">
          <div class="form-hint">选填，用于接收通知短信</div>
        </div>
      </div>

      <div class="form-group" style="display:flex; align-items:center;">
        <label style="width:100px; flex-shrink:0; margin-bottom:0; text-align:right; padding-right:12px;">
          角色 <span style="color:var(--danger)">*</span>
        </label>
        <div style="width:320px;">
          <select class="form-select" required>
            <option value="">请选择角色</option>
            <option>超级管理员</option>
            <option>普通管理员</option>
            <option>只读用户</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 其他信息组 -->
    <div style="margin-bottom: 24px;">
      <h4 style="font-size:14px; font-weight:600; margin-bottom:16px; color:var(--text-secondary);">其他信息</h4>

      <div class="form-group" style="display:flex; align-items:flex-start;">
        <label style="width:100px; flex-shrink:0; margin-bottom:0; text-align:right; padding-right:12px; padding-top:8px;">
          备注
        </label>
        <div style="width:480px;">
          <textarea class="form-textarea" placeholder="请输入备注信息（选填）" rows="3"></textarea>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div style="padding-top:16px; border-top:1px solid var(--border); display:flex; gap:8px; padding-left:112px;">
      <button type="submit" class="btn btn-primary">提交保存</button>
      <button type="button" class="btn btn-outline" onclick="showToast('已取消','info')">取消</button>
    </div>
  </form>
</div>

<!--
  设计说明：
  - 标签宽度固定 100px，右对齐
  - 输入框宽度 320px（备注区域可更宽 480px）
  - 必填项标签前加红色星号 *
  - 输入提示用 placeholder，补充说明用 .form-hint
  - 表单按逻辑分组，每组有小标题
  - 底部按钮区域有顶部分割线，左缩进对齐输入框
  - 提交用 btn-primary，取消用 btn-outline
-->
```

---

### 状态标签组件

```html
<!-- 状态标签 — 圆点 + 文字，5 种变体 -->

<!-- 成功（绿色） -->
<span class="badge badge-success">
  <span class="badge-dot"></span>已完成
</span>

<!-- 警告（橙色） -->
<span class="badge badge-warning">
  <span class="badge-dot"></span>处理中
</span>

<!-- 危险（红色） -->
<span class="badge badge-danger">
  <span class="badge-dot"></span>已失败
</span>

<!-- 信息（蓝色） -->
<span class="badge badge-info">
  <span class="badge-dot"></span>进行中
</span>

<!-- 默认（灰色） -->
<span class="badge badge-default">
  <span class="badge-dot"></span>已关闭
</span>

<!--
  设计说明：
  - 圆点为 8px 圆形，颜色与文字一致
  - 背景为对应颜色的浅色（light 变体）
  - 圆角 20px 胶囊形状
  - 字号 12px，font-weight 500
  - 适用场景：
      badge-success -> 已完成、已通过、已启用、在线
      badge-warning -> 处理中、待审核、待确认
      badge-danger  -> 已失败、已拒绝、已过期、异常
      badge-info    -> 进行中、已提交、待发货
      badge-default -> 已关闭、未开始、草稿
-->
```

---

### 面包屑导航

```html
<!-- 面包屑导航 — 层级路径指示 -->
<nav class="breadcrumb">
  <a href="#" onclick="showPage('page-dashboard', document.querySelector('.nav-item'))">首页</a>
  <span class="sep">&gt;</span>
  <a href="#" onclick="showPage('page-users', null)">用户管理</a>
  <span class="sep">&gt;</span>
  <span class="current">用户详情</span>
</nav>

<!--
  设计说明：
  - 使用 > 作为层级分隔符
  - 可点击层级用 <a> 标签，颜色为次要灰色
  - 当前页（最后一级）用 .current 类，颜色为主文字色 + 中等粗细
  - 悬停时变为 primary 色
  - 通常放在 .content 区域顶部、page-header 上方
-->
```

---

### Toast 提示

```html
<!-- Toast 提示 — 调用 JS 函数即可显示 -->

<!-- 使用方式（在 JS 中调用）： -->
<script>
  // 成功提示（绿色）
  showToast('操作成功，数据已保存', 'success');

  // 警告提示（橙色）
  showToast('请先选择要操作的数据', 'warning');

  // 错误提示（红色）
  showToast('服务器异常，请稍后重试', 'error');

  // 信息提示（蓝色，默认）
  showToast('数据加载中...', 'info');
</script>

<!--
  设计说明：
  - 固定定位在页面顶部居中（top: 20px, left: 50%, translateX(-50%)）
  - 多个 Toast 纵向堆叠显示
  - 自动消失时间：3 秒
  - 进入动画：从上方淡入下移（toastIn, 0.3s）
  - 退出动画：向上淡出（toastOut, 0.3s, 延迟 2.7s 开始）
  - 最大宽度 400px，文字居中
  - 圆角 8px，带阴影增强层次感
  - 颜色对应：
      toast-success -> var(--success)  绿色
      toast-warning -> var(--warning)  橙色
      toast-error   -> var(--danger)   红色
      toast-info    -> var(--info)     蓝色
  - 注意：永远不要使用 alert()，所有提示统一用 Toast
-->
```

---

## 配色方案预设

以下 5 套配色可直接替换模板中 `:root` 的 CSS 变量来实现换肤。

| 方案名称 | 主色 (primary) | 悬停色 (primary-hover) | 浅底色 (primary-light) | 侧边栏背景 (sidebar-bg) | 侧边栏悬停 (sidebar-hover) |
|---------|---------------|----------------------|----------------------|------------------------|--------------------------|
| **科技蓝**（默认） | `#2563eb` | `#1d4ed8` | `#eff6ff` | `#1a1a2e` | `#16213e` |
| **商务青** | `#0d9488` | `#0f766e` | `#f0fdfa` | `#134e4a` | `#115e59` |
| **活力橙** | `#ea580c` | `#c2410c` | `#fff7ed` | `#431407` | `#5c1d0e` |
| **优雅紫** | `#7c3aed` | `#6d28d9` | `#f5f3ff` | `#1e1b4b` | `#2e2a5e` |
| **自然绿** | `#16a34a` | `#15803d` | `#f0fdf4` | `#14532d` | `#166534` |

### 配色切换用法

将以下代码替换模板 `<style>` 中 `:root` 部分即可切换主题：

**科技蓝（默认）**
```css
:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: #eff6ff;
  --sidebar-bg: #1a1a2e;
  --sidebar-hover: #16213e;
}
```

**商务青**
```css
:root {
  --primary: #0d9488;
  --primary-hover: #0f766e;
  --primary-light: #f0fdfa;
  --sidebar-bg: #134e4a;
  --sidebar-hover: #115e59;
}
```

**活力橙**
```css
:root {
  --primary: #ea580c;
  --primary-hover: #c2410c;
  --primary-light: #fff7ed;
  --sidebar-bg: #431407;
  --sidebar-hover: #5c1d0e;
}
```

**优雅紫**
```css
:root {
  --primary: #7c3aed;
  --primary-hover: #6d28d9;
  --primary-light: #f5f3ff;
  --sidebar-bg: #1e1b4b;
  --sidebar-hover: #2e2a5e;
}
```

**自然绿**
```css
:root {
  --primary: #16a34a;
  --primary-hover: #15803d;
  --primary-light: #f0fdf4;
  --sidebar-bg: #14532d;
  --sidebar-hover: #166534;
}
```

> **提示**：其余 CSS 变量（--success、--warning、--danger、--info、--bg、--card-bg、--text 等）在各配色方案中保持不变，无需修改。只需替换以上 5 个变量即可完成换肤。
