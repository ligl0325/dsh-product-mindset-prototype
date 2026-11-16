# PC 桌面端原型模板参考

## PC 桌面端完整模板
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>桌面应用原型</title>
<style>
/* === 主题变量 === */
:root { --primary:#2563eb; --bg-titlebar:#2d2d2d; --bg-panel:#f8f8f8; --bg-workspace:#fff; --border:#d0d0d0; --text:#1a1a1a; --text-secondary:#666; --accent:#e8f0fe; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font:12px/1.5 "Microsoft YaHei","Segoe UI",sans-serif; color:var(--text); height:100vh; display:flex; flex-direction:column; overflow:hidden; user-select:none; }
/* === 标题栏 (macOS 风格，32px) === */
.titlebar { height:32px; background:var(--bg-titlebar); display:flex; align-items:center; padding:0 12px; color:#fff; font-size:12px; flex-shrink:0; }
.window-dots { display:flex; gap:6px; margin-right:12px; }
.window-dots span { width:12px; height:12px; border-radius:50%; display:inline-block; cursor:pointer; }
.dot-close { background:#ff5f57; } .dot-min { background:#febc2e; } .dot-max { background:#28c840; }
.titlebar-text { flex:1; text-align:center; opacity:.8; }
/* === 菜单栏 (hover 展开下拉) === */
.menubar { height:28px; background:var(--bg-panel); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 4px; flex-shrink:0; }
.menu-item { padding:2px 10px; cursor:pointer; position:relative; border-radius:3px; }
.menu-item:hover { background:var(--accent); }
.menu-dropdown { display:none; position:absolute; top:100%; left:0; background:#fff; border:1px solid var(--border); min-width:180px; box-shadow:2px 4px 12px rgba(0,0,0,.15); z-index:100; }
.menu-item:hover .menu-dropdown { display:block; }
.menu-dropdown a { display:flex; justify-content:space-between; padding:5px 16px; color:var(--text); text-decoration:none; font-size:12px; }
.menu-dropdown a:hover { background:var(--primary); color:#fff; }
.menu-dropdown .sep { height:1px; background:var(--border); margin:3px 8px; }
/* === 工具栏 (图标按钮 + 分隔线) === */
.toolbar { height:34px; background:var(--bg-panel); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 6px; gap:2px; flex-shrink:0; }
.tool-btn { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; cursor:pointer; border-radius:3px; font-size:15px; }
.tool-btn:hover { background:var(--accent); }
.tool-btn:disabled { opacity:.35; cursor:default; }
.tool-sep { width:1px; height:20px; background:var(--border); margin:0 4px; }
/* === 主体布局 (左面板 + 工作区 + 右面板) === */
.main { flex:1; display:flex; overflow:hidden; }
.panel-left { width:220px; background:var(--bg-panel); border-right:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; flex-shrink:0; }
.panel-left .panel-header { padding:6px 10px; font-weight:600; font-size:12px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
.panel-left .panel-body { flex:1; overflow-y:auto; padding:4px 0; }
.resize-handle { width:4px; cursor:col-resize; background:transparent; flex-shrink:0; }
.resize-handle:hover { background:var(--primary); opacity:.3; }
.workspace { flex:1; display:flex; flex-direction:column; background:var(--bg-workspace); overflow:hidden; }
/* 标签栏 */
.tab-bar { display:flex; background:var(--bg-panel); border-bottom:1px solid var(--border); flex-shrink:0; overflow-x:auto; }
.tab { padding:5px 28px 5px 12px; cursor:pointer; font-size:12px; border-right:1px solid var(--border); position:relative; white-space:nowrap; background:#ececec; }
.tab.active { background:var(--bg-workspace); border-bottom:1px solid var(--bg-workspace); margin-bottom:-1px; }
.tab .tab-close { position:absolute; right:6px; top:50%; transform:translateY(-50%); font-size:13px; opacity:.5; cursor:pointer; }
.tab .tab-close:hover { opacity:1; color:#e00; }
.tab-content { flex:1; padding:16px; overflow:auto; }
.tab-page { display:none; } .tab-page.active { display:block; }
/* 右侧属性面板 (240px) */
.panel-right { width:240px; background:var(--bg-panel); border-left:1px solid var(--border); overflow-y:auto; flex-shrink:0; }
.prop-section { border-bottom:1px solid var(--border); }
.prop-section-header { padding:6px 10px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px; }
.prop-section-header::before { content:"▼"; font-size:9px; }
.prop-section.collapsed .prop-section-header::before { content:"▶"; }
.prop-section.collapsed .prop-body { display:none; }
.prop-body { padding:4px 10px 8px; }
.prop-row { display:flex; align-items:center; margin:3px 0; font-size:12px; }
.prop-row label { width:80px; flex-shrink:0; color:var(--text-secondary); }
.prop-row input,.prop-row select { flex:1; border:1px solid var(--border); padding:2px 6px; font-size:12px; border-radius:2px; }
/* === 状态栏 (24px) === */
.statusbar { height:24px; background:var(--bg-panel); border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; padding:0 12px; font-size:11px; color:var(--text-secondary); flex-shrink:0; }
/* === 右键菜单 === */
.ctx-menu { position:fixed; background:#fff; border:1px solid var(--border); box-shadow:2px 4px 12px rgba(0,0,0,.18); min-width:160px; z-index:999; display:none; }
.ctx-menu a { display:flex; justify-content:space-between; padding:5px 14px; font-size:12px; color:var(--text); text-decoration:none; }
.ctx-menu a:hover { background:var(--primary); color:#fff; }
.ctx-menu .sep { height:1px; background:var(--border); margin:3px 6px; }
.ctx-menu .shortcut { color:var(--text-secondary); font-size:11px; margin-left:24px; }
/* === 模态对话框 (桌面风格，无圆角) === */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:1000; display:none; align-items:center; justify-content:center; }
.modal-overlay.show { display:flex; }
.modal { background:#fff; border:1px solid var(--border); box-shadow:0 4px 24px rgba(0,0,0,.25); min-width:360px; }
.modal-title { height:32px; background:var(--bg-panel); border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; padding:0 10px; font-size:12px; font-weight:600; }
.modal-title .close-btn { cursor:pointer; font-size:16px; }
.modal-body { padding:16px; font-size:13px; }
.modal-footer { padding:8px 16px; display:flex; justify-content:flex-end; gap:8px; border-top:1px solid var(--border); }
.modal-footer button { padding:4px 18px; font-size:12px; border:1px solid var(--border); background:#fff; cursor:pointer; border-radius:2px; }
.modal-footer .btn-primary { background:var(--primary); color:#fff; border-color:var(--primary); }
</style>
</head>
<body>
<!-- 标题栏 -->
<div class="titlebar">
  <div class="window-dots"><span class="dot-close"></span><span class="dot-min"></span><span class="dot-max"></span></div>
  <div class="titlebar-text">应用名称 — 未命名项目</div>
</div>
<!-- 菜单栏 -->
<div class="menubar">
  <div class="menu-item">文件
    <div class="menu-dropdown">
      <a href="#">新建<span class="shortcut">Ctrl+N</span></a>
      <a href="#">打开<span class="shortcut">Ctrl+O</span></a>
      <a href="#">保存<span class="shortcut">Ctrl+S</span></a>
      <div class="sep"></div><a href="#">退出</a>
    </div>
  </div>
  <div class="menu-item">编辑
    <div class="menu-dropdown">
      <a href="#">撤销<span class="shortcut">Ctrl+Z</span></a>
      <a href="#">重做<span class="shortcut">Ctrl+Y</span></a>
      <div class="sep"></div><a href="#">查找<span class="shortcut">Ctrl+F</span></a>
    </div>
  </div>
  <div class="menu-item">视图
    <div class="menu-dropdown">
      <a href="#" onclick="togglePanel('left')">切换侧栏</a>
      <a href="#" onclick="togglePanel('right')">切换属性面板</a>
    </div>
  </div>
  <div class="menu-item">帮助
    <div class="menu-dropdown"><a href="#">关于</a></div>
  </div>
</div>
<!-- 工具栏 -->
<div class="toolbar">
  <button class="tool-btn" title="新建">📄</button>
  <button class="tool-btn" title="打开">📂</button>
  <button class="tool-btn" title="保存">💾</button>
  <div class="tool-sep"></div>
  <button class="tool-btn" title="撤销">↩️</button>
  <button class="tool-btn" title="重做">↪️</button>
  <div class="tool-sep"></div>
  <button class="tool-btn" title="搜索">🔍</button>
  <button class="tool-btn" title="设置">⚙️</button>
</div>
<!-- 主体 -->
<div class="main">
  <div class="panel-left" id="panelLeft">
    <div class="panel-header">资源管理器 <span style="cursor:pointer" onclick="togglePanel('left')">✕</span></div>
    <div class="panel-body">
      <div class="tree-node" style="padding-left:8px">
        <div class="tree-item" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
          <span class="tree-arrow">▼</span> 📁 项目根目录
        </div>
        <div style="padding-left:16px">
          <div class="tree-item"><span class="tree-arrow"> </span> 📄 index.html</div>
          <div class="tree-item"><span class="tree-arrow"> </span> 📄 style.css</div>
          <div class="tree-item"><span class="tree-arrow"> </span> 📄 app.js</div>
        </div>
      </div>
    </div>
  </div>
  <div class="resize-handle" id="resizeHandle"></div>
  <div class="workspace">
    <div class="tab-bar">
      <div class="tab active" onclick="switchTab('tab1')">主页面<span class="tab-close" onclick="event.stopPropagation()">×</span></div>
      <div class="tab" onclick="switchTab('tab2')">设置<span class="tab-close" onclick="event.stopPropagation()">×</span></div>
    </div>
    <div class="tab-content">
      <div class="tab-page active" id="tab1"><h3>主工作区</h3><p>在此放置主要内容。</p></div>
      <div class="tab-page" id="tab2"><h3>设置页面</h3><p>配置选项。</p></div>
    </div>
  </div>
  <div class="panel-right" id="panelRight">
    <div class="prop-section">
      <div class="prop-section-header" onclick="this.parentElement.classList.toggle('collapsed')">基本属性</div>
      <div class="prop-body">
        <div class="prop-row"><label>名称</label><input value="元素1"></div>
        <div class="prop-row"><label>类型</label><select><option>文本</option><option>图片</option></select></div>
        <div class="prop-row"><label>宽度</label><input value="100px"></div>
        <div class="prop-row"><label>颜色</label><input type="color" value="#2563eb" style="width:32px;height:22px;padding:0;border:none;cursor:pointer"></div>
      </div>
    </div>
    <div class="prop-section">
      <div class="prop-section-header" onclick="this.parentElement.classList.toggle('collapsed')">高级选项</div>
      <div class="prop-body">
        <div class="prop-row"><label>可见</label><input type="checkbox" checked></div>
        <div class="prop-row"><label>锁定</label><input type="checkbox"></div>
      </div>
    </div>
  </div>
</div>
<!-- 状态栏 -->
<div class="statusbar"><span>就绪</span><span>行 1, 列 12 | UTF-8</span></div>
<!-- 右键菜单 -->
<div class="ctx-menu" id="ctxMenu">
  <a href="#">剪切<span class="shortcut">Ctrl+X</span></a>
  <a href="#">复制<span class="shortcut">Ctrl+C</span></a>
  <a href="#">粘贴<span class="shortcut">Ctrl+V</span></a>
  <div class="sep"></div>
  <a href="#">删除<span class="shortcut">Del</span></a>
</div>
<!-- 模态对话框 -->
<div class="modal-overlay" id="modalOverlay">
  <div class="modal">
    <div class="modal-title"><span id="modalTitle">对话框</span><span class="close-btn" onclick="closeModal()">×</span></div>
    <div class="modal-body" id="modalBody">内容区域</div>
    <div class="modal-footer">
      <button onclick="closeModal()">取消</button>
      <button class="btn-primary" onclick="closeModal()">确定</button>
    </div>
  </div>
</div>
<script>
/* 标签页切换 */
function switchTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.getAttribute('onclick')?.includes(id)));
  document.querySelectorAll('.tab-page').forEach(p => p.classList.toggle('active', p.id === id));
}
/* 面板显隐 */
function togglePanel(side) {
  const el = document.getElementById(side === 'left' ? 'panelLeft' : 'panelRight');
  el.style.display = el.style.display === 'none' ? '' : 'none';
}
/* 右键菜单 */
function showContextMenu(e) {
  const m = document.getElementById('ctxMenu');
  m.style.left = e.clientX + 'px'; m.style.top = e.clientY + 'px'; m.style.display = 'block';
  e.preventDefault();
}
function hideContextMenu() { document.getElementById('ctxMenu').style.display = 'none'; }
document.addEventListener('click', hideContextMenu);
document.addEventListener('contextmenu', e => { if(e.target.closest('.workspace')) showContextMenu(e); });
/* 输入对话框 */
function showInputDialog(title, callback) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = '<input id="dlgInput" style="width:100%;padding:4px 8px;border:1px solid #ccc;font-size:13px">';
  document.getElementById('modalOverlay').classList.add('show');
  setTimeout(() => document.getElementById('dlgInput')?.focus(), 100);
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }
/* 快捷键 */
document.addEventListener('keydown', e => {
  if(e.ctrlKey && e.key==='s') { e.preventDefault(); document.querySelector('.statusbar span').textContent='已保存'; }
  if(e.ctrlKey && e.key==='z') { e.preventDefault(); }
  if(e.ctrlKey && e.key==='n') { e.preventDefault(); showInputDialog('新建文件', ()=>{}); }
  if(e.ctrlKey && e.key==='f') { e.preventDefault(); }
  if(e.key==='Delete') { /* 删除逻辑 */ }
});
/* 左侧面板拖拽调整宽度 */
(function(){
  const handle = document.getElementById('resizeHandle');
  const panel = document.getElementById('panelLeft');
  let dragging = false;
  handle.addEventListener('mousedown', () => dragging = true);
  document.addEventListener('mousemove', e => { if(dragging) panel.style.width = Math.max(140, Math.min(400, e.clientX)) + 'px'; });
  document.addEventListener('mouseup', () => dragging = false);
})();
</script>
</body>
</html>
```

## 页面切换与交互逻辑
模板已包含核心交互函数，补充说明：

| 函数 | 用途 | 备注 |
|------|------|------|
| `switchTab(tabId)` | 切换工作区标签页 | 通过 onclick 属性匹配来高亮对应 tab |
| `togglePanel('left'\|'right')` | 显示/隐藏左右面板 | 直接切换 display |
| `showContextMenu(e)` | 在鼠标位置弹出右键菜单 | 可传入自定义菜单项数组扩展 |
| `hideContextMenu()` | 点击任意处关闭菜单 | 绑定在 document click 上 |
| `showInputDialog(title, cb)` | 弹出输入对话框 | 模态，聚焦输入框 |
| `closeModal()` | 关闭模态框 | 隐藏 overlay |

**快捷键：** Ctrl+S 保存、Ctrl+Z 撤销、Ctrl+N 新建、Ctrl+F 查找、Delete 删除。在 keydown 监听中追加判断即可扩展。
**面板拖拽缩放：** 已实现左侧面板宽度拖拽（140-400px）。右侧面板同理，计算 `window.innerWidth - e.clientX`。

## 组件代码片段
### 导航树
```html
<!-- ▶/▼ 指示器 + emoji 图标 + padding-left 缩进 + 选中高亮 -->
<style>
.tree-item { padding:3px 8px; cursor:pointer; display:flex; align-items:center; gap:4px; font-size:12px; }
.tree-item:hover { background:var(--accent); }
.tree-item.selected { background:var(--primary); color:#fff; }
.tree-arrow { width:12px; text-align:center; font-size:9px; flex-shrink:0; }
</style>
<div class="tree-item" style="padding-left:8px"><span class="tree-arrow">▼</span> 📁 src</div>
<div style="padding-left:24px">
  <div class="tree-item selected"><span class="tree-arrow"> </span> 📄 main.js</div>
  <div class="tree-item"><span class="tree-arrow"> </span> 📄 utils.js</div>
</div>
```
### 工具栏
```html
<!-- 图标按钮 + 分隔线 + 禁用态 -->
<div class="toolbar">
  <button class="tool-btn" title="新建文件">📄</button>
  <button class="tool-btn" title="保存">💾</button>
  <div class="tool-sep"></div>
  <button class="tool-btn" title="运行" disabled>▶️</button>
</div>
```
### 多标签页工作区
```html
<!-- 激活标签白底融入内容区，非激活灰底，溢出可滚动 -->
<div class="tab-bar" style="overflow-x:auto">
  <div class="tab active">index.html<span class="tab-close">×</span></div>
  <div class="tab">style.css<span class="tab-close">×</span></div>
</div>
```
### 属性面板
```html
<!-- 可折叠区块 + 键值行（label 80px + input flex） -->
<div class="prop-section">
  <div class="prop-section-header" onclick="this.parentElement.classList.toggle('collapsed')">布局</div>
  <div class="prop-body">
    <div class="prop-row"><label>X 坐标</label><input value="0"></div>
    <div class="prop-row"><label>透明度</label><input type="range" min="0" max="100" value="100" style="flex:1"></div>
    <div class="prop-row"><label>锁定比例</label><input type="checkbox"></div>
  </div>
</div>
```
### 状态栏
```html
<div class="statusbar">
  <span>就绪 — 共 12 个文件</span>
  <span>行 24, 列 8 | UTF-8 | 空格: 2</span>
</div>
```
### 右键菜单
```html
<!-- 定位 div，快捷键右对齐，分隔线分组 -->
<div class="ctx-menu" style="display:block;left:200px;top:150px">
  <a href="#">剪切<span class="shortcut">Ctrl+X</span></a>
  <a href="#">复制<span class="shortcut">Ctrl+C</span></a>
  <div class="sep"></div>
  <a href="#">重命名<span class="shortcut">F2</span></a>
  <a href="#">删除<span class="shortcut">Del</span></a>
</div>
```
### 对话框/弹窗
```html
<!-- 桌面风格：紧凑、无圆角、淡阴影、确定/取消按钮 -->
<div class="modal-overlay show">
  <div class="modal" style="border-radius:0">
    <div class="modal-title"><span>确认删除</span><span class="close-btn">×</span></div>
    <div class="modal-body">确定要删除选中的 3 个文件吗？此操作不可撤销。</div>
    <div class="modal-footer">
      <button>取消</button>
      <button class="btn-primary">确定删除</button>
    </div>
  </div>
</div>
```

## 布局变体
### 变体 A：导航树 + 工作区（双栏）
**适用：** 文件浏览器、设置管理、配置工具、邮件客户端
```html
<div class="main">
  <div class="panel-left" style="width:220px">
    <div class="panel-header">导航</div>
    <div class="panel-body"><!-- 树形导航 --></div>
  </div>
  <div class="resize-handle"></div>
  <div class="workspace"><div class="tab-content" style="flex:1">主内容区域</div></div>
</div>
```
### 变体 B：三栏布局
**适用：** 代码编辑器、IDE 工具、监控面板、设计软件
```html
<div class="main">
  <div class="panel-left" style="width:200px">
    <div class="panel-header">资源</div>
    <div class="panel-body"><!-- 文件树 --></div>
  </div>
  <div class="resize-handle"></div>
  <div class="workspace">
    <div class="tab-bar"><!-- 标签页 --></div>
    <div class="tab-content"><!-- 编辑区 --></div>
  </div>
  <div class="panel-right" style="width:240px"><!-- 属性检查器 --></div>
</div>
```

### 变体 C：多标签页 + 大工作区
**适用：** 多文档编辑、多任务仪表盘、浏览器风格应用
```html
<div class="main" style="flex-direction:column">
  <div class="tab-bar">
    <div class="tab active">文档 1<span class="tab-close">×</span></div>
    <div class="tab">文档 2<span class="tab-close">×</span></div>
  </div>
  <div class="tab-content" style="flex:1"><!-- 大面积工作画布 --></div>
</div>
```

## 配色方案预设

| 方案名 | 风格 | 适用场景 |
|--------|------|----------|
| 经典深蓝 | 蓝色主调 + 深色标题栏 | 通用工具软件 |
| 暗色主题 | VS Code 风格深色 | 开发工具、编辑器 |
| 专业灰 | Visual Studio 风格 | 企业级应用 |
| 现代浅灰 | Windows 11 风格 | 现代桌面应用 |

```css
/* 经典深蓝 */
.theme-classic { --primary:#2563eb; --bg-titlebar:#2d2d2d; --bg-panel:#f8f8f8; --bg-workspace:#fff; --border:#d0d0d0; --text:#1a1a1a; --text-secondary:#666; --accent:#e8f0fe; }
/* 暗色主题 (VS Code 风格) */
.theme-dark  { --primary:#60a5fa; --bg-titlebar:#1e1e1e; --bg-panel:#252526; --bg-workspace:#1e1e1e; --border:#3c3c3c; --text:#ccc; --text-secondary:#888; --accent:#264f78; }
/* 专业灰 (Visual Studio 风格) */
.theme-vs    { --primary:#4a90d9; --bg-titlebar:#e8e8e8; --bg-panel:#fff; --bg-workspace:#fff; --border:#c8c8c8; --text:#1e1e1e; --text-secondary:#717171; --accent:#e5f0fb; }
/* 现代浅灰 (Windows 11 风格) */
.theme-win11 { --primary:#0078d4; --bg-titlebar:#f3f3f3; --bg-panel:#fafafa; --bg-workspace:#fff; --border:#e0e0e0; --text:#1a1a1a; --text-secondary:#616161; --accent:#e8f4fd; }
```
