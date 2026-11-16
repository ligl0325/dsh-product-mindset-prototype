移动端原型模板参考

## H5 移动端完整模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>H5原型</title>
<style>
:root {
  --primary: #2563eb; --success: #16a34a; --warning: #f59e0b;
  --danger: #ef4444; --info: #6b7280; --text: #1f2937;
  --text-secondary: #6b7280; --bg: #f5f7fa; --card-bg: #fff; --border: #e5e7eb;
}
* { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
  background:var(--bg); color:var(--text); font-size:14px; height:100vh; overflow:hidden; display:flex; flex-direction:column; }
/* 状态栏 - 模拟手机顶部状态栏 */
.status-bar { height:44px; background:#000; color:#fff; display:flex; align-items:center;
  justify-content:space-between; padding:0 16px; font-size:12px; flex-shrink:0; }
.status-bar.light { background:var(--primary); }
/* 内容区域 - 可滚动 */
.content { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch;
  padding:16px; padding-bottom:calc(70px + env(safe-area-inset-bottom)); }
/* 卡片 */
.card { background:var(--card-bg); border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,.08);
  padding:16px; margin-bottom:12px; }
/* 列表项 - 最小触摸目标48px */
.list-item { min-height:48px; display:flex; align-items:center; padding:12px 16px;
  border-bottom:1px solid var(--border); background:var(--card-bg); }
.list-item:active { background:#f0f0f0; }
.list-item::after { content:'>'; color:#ccc; margin-left:auto; font-size:16px; }
/* 表单输入框 */
.input { width:100%; height:44px; border:1px solid var(--border); border-radius:12px;
  padding:0 12px; font-size:16px; outline:none; transition:border .2s; }
.input:focus { border-color:var(--primary); }
.input.error { border-color:var(--danger); }
/* 按钮 */
.btn { width:100%; height:48px; border:none; border-radius:24px; font-size:16px;
  font-weight:600; cursor:pointer; transition:opacity .2s; }
.btn:active { opacity:.8; }
.btn-primary { background:var(--primary); color:#fff; }
.btn-outline { background:transparent; color:var(--primary); border:1px solid var(--primary); }
.btn-danger { background:var(--danger); color:#fff; }
/* 底部标签栏 */
.tab-bar { position:fixed; bottom:0; left:0; right:0; height:56px; background:#fff;
  display:flex; border-top:1px solid var(--border); z-index:100;
  padding-bottom:env(safe-area-inset-bottom); }
.tab-item { flex:1; display:flex; flex-direction:column; align-items:center;
  justify-content:center; font-size:10px; color:var(--text-secondary); }
.tab-item.active { color:var(--primary); }
.tab-item .icon { font-size:22px; margin-bottom:2px; }
/* 底部操作栏 */
.bottom-action { position:fixed; bottom:0; left:0; right:0; background:#fff;
  padding:8px 16px calc(8px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); z-index:100; }
/* 头像 */
.avatar { width:40px; height:40px; border-radius:50%; background:var(--primary);
  display:flex; align-items:center; justify-content:center; color:#fff;
  font-size:16px; font-weight:600; flex-shrink:0; }
/* 徽标/标签 */
.badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:12px; color:#fff; }
.badge-danger { background:var(--danger); }
.badge-success { background:var(--success); }
.badge-dot { width:8px; height:8px; border-radius:50%; background:var(--danger); display:inline-block; }
/* 下拉刷新提示区 */
.pull-hint { text-align:center; padding:12px; color:var(--text-secondary); font-size:13px; }
/* 空状态 */
.empty-state { display:flex; flex-direction:column; align-items:center;
  justify-content:center; padding:60px 20px; color:var(--text-secondary); }
.empty-state .icon { font-size:48px; margin-bottom:12px; }
.empty-state .text { font-size:14px; }
/* 页面容器 - 用于多页面切换 */
.page { display:none; height:100vh; flex-direction:column; }
.page.active { display:flex; }
/* Toast提示 */
.toast { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
  background:rgba(0,0,0,.75); color:#fff; padding:10px 20px; border-radius:8px;
  font-size:14px; z-index:9999; opacity:0; transition:opacity .3s; pointer-events:none; }
.toast.show { opacity:1; }
/* 操作面板 */
.action-sheet { position:fixed; bottom:0; left:0; right:0; background:#fff;
  border-radius:12px 12px 0 0; z-index:200; transform:translateY(100%); transition:transform .3s;
  padding-bottom:env(safe-area-inset-bottom); }
.action-sheet.show { transform:translateY(0); }
.action-sheet-item { height:56px; display:flex; align-items:center; justify-content:center;
  font-size:16px; border-bottom:1px solid var(--border); }
.action-sheet-item:active { background:#f0f0f0; }
.action-sheet-cancel { height:56px; display:flex; align-items:center; justify-content:center;
  font-size:16px; color:var(--danger); margin-top:8px; }
.overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:199; display:none; }
.overlay.show { display:block; }
</style>
</head>
<body>
<!-- 状态栏（可选） -->
<div class="status-bar light"><span>9:41</span><span>信号 电量</span></div>
<!-- 页面1 - 首页 -->
<div class="page active" id="page-home">
  <div class="content">
    <div class="card"><h3>欢迎使用</h3><p style="color:var(--text-secondary);margin-top:8px">这是一个H5移动端原型模板</p></div>
    <div class="list-item">列表项示例</div>
  </div>
</div>
<!-- 底部标签栏 -->
<div class="tab-bar">
  <div class="tab-item active" onclick="switchTab(0)"><span class="icon">🏠</span>首页</div>
  <div class="tab-item" onclick="switchTab(1)"><span class="icon">📋</span>列表</div>
  <div class="tab-item" onclick="switchTab(2)"><span class="icon">👤</span>我的</div>
</div>
<!-- Toast -->
<div class="toast" id="toast"></div>
<!-- 遮罩层 -->
<div class="overlay" id="overlay" onclick="closeActionSheet()"></div>
<!-- 操作面板 -->
<div class="action-sheet" id="actionSheet"></div>
<script>
/* 标签切换 */
let currentTab = 0;
const pages = document.querySelectorAll('.page');
const tabs = document.querySelectorAll('.tab-item');
function switchTab(i) {
  currentTab = i;
  tabs.forEach((t,idx) => t.classList.toggle('active', idx===i));
  pages.forEach((p,idx) => p.classList.toggle('active', idx===i));
}
/* 页面跳转（push导航） */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
/* 返回上一页 */
function goBack() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  pages[currentTab].classList.add('active');
}
/* Toast提示 */
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  if(type==='success') t.style.background='rgba(22,163,74,.9)';
  else if(type==='danger') t.style.background='rgba(239,68,68,.9)';
  else t.style.background='rgba(0,0,0,.75)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}
/* 底部操作面板 */
function showActionSheet(options) {
  const sheet = document.getElementById('actionSheet');
  const overlay = document.getElementById('overlay');
  let html = options.map(o => '<div class="action-sheet-item" onclick="'+(o.action||'closeActionSheet()')+'">'+o.label+'</div>').join('');
  html += '<div class="action-sheet-cancel" onclick="closeActionSheet()">取消</div>';
  sheet.innerHTML = html;
  sheet.classList.add('show'); overlay.classList.add('show');
}
function closeActionSheet() {
  document.getElementById('actionSheet').classList.remove('show');
  document.getElementById('overlay').classList.remove('show');
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
| `showPage(id)` | 跳转到指定页面（push导航，隐藏标签栏页面） |
| `goBack()` | 返回当前标签对应的页面 |
| `showToast(msg, type)` | 显示提示，type可选 `success`/`danger`，2秒自动消失 |
| `showActionSheet(options)` | 底部操作面板，options格式：`[{label:'选项1', action:'fn()'}]` |

## 组件代码片段

### 卡片列表项
```html
<div class="card" style="display:flex;align-items:center;gap:12px">
  <div class="avatar">张</div>
  <div style="flex:1">
    <div style="font-size:15px;font-weight:600">张三</div>
    <div style="font-size:13px;color:var(--text-secondary)">产品经理 · 3分钟前</div>
  </div>
  <span style="color:#ccc">></span>
</div>
```

### 详情页头部
```html
<div style="background:linear-gradient(135deg,var(--primary),#7c3aed);padding:24px 16px;color:#fff;text-align:center">
  <div class="avatar" style="width:64px;height:64px;font-size:24px;margin:0 auto 12px">张</div>
  <div style="font-size:18px;font-weight:700">张三</div>
  <div style="font-size:13px;opacity:.8;margin-top:4px">高级产品经理</div>
  <span class="badge badge-success" style="margin-top:8px">在线</span>
</div>
```

### 表单组
```html
<div style="margin-bottom:16px">
  <label style="font-size:14px;color:var(--text-secondary);display:block;margin-bottom:6px">用户名</label>
  <input class="input" placeholder="请输入用户名">
  <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">4-20个字符</div>
</div>
<!-- 错误状态 -->
<div style="margin-bottom:16px">
  <label style="font-size:14px;color:var(--text-secondary);display:block;margin-bottom:6px">手机号</label>
  <input class="input error" value="123">
  <div style="font-size:12px;color:var(--danger);margin-top:4px">手机号格式不正确</div>
</div>
```

### 底部操作栏
```html
<!-- 单按钮 -->
<div class="bottom-action">
  <button class="btn btn-primary">确认提交</button>
</div>
<!-- 双按钮 -->
<div class="bottom-action" style="display:flex;gap:12px">
  <button class="btn btn-outline" style="flex:1">取消</button>
  <button class="btn btn-primary" style="flex:1">确认</button>
</div>
```

### 搜索栏
```html
<div style="display:flex;gap:8px;padding:8px 16px;background:#fff">
  <div style="flex:1;position:relative">
    <input class="input" style="padding-left:36px;border-radius:22px;background:#f5f5f5;border:none" placeholder="搜索...">
    <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%)">🔍</span>
  </div>
  <span style="font-size:14px;color:var(--text-secondary);line-height:44px;white-space:nowrap">取消</span>
</div>
```

### 消息气泡
```html
<!-- 时间分隔 -->
<div style="text-align:center;font-size:12px;color:#999;padding:8px">今天 14:30</div>
<!-- 对方消息（左） -->
<div style="display:flex;gap:8px;padding:4px 16px">
  <div class="avatar" style="width:36px;height:36px;font-size:14px">李</div>
  <div style="background:#f0f0f0;padding:10px 14px;border-radius:4px 16px 16px 16px;max-width:70%;font-size:14px">你好，明天有空吗？</div>
</div>
<!-- 我的消息（右） -->
<div style="display:flex;gap:8px;padding:4px 16px;flex-direction:row-reverse">
  <div class="avatar" style="width:36px;height:36px;font-size:14px;background:#16a34a">我</div>
  <div style="background:var(--primary);color:#fff;padding:10px 14px;border-radius:16px 4px 16px 16px;max-width:70%;font-size:14px">有空的，什么事？</div>
</div>
<!-- 底部输入栏 -->
<div style="display:flex;gap:8px;padding:8px 16px;background:#fff;border-top:1px solid var(--border)">
  <input class="input" style="border-radius:22px;background:#f5f5f5;border:none" placeholder="输入消息...">
  <button class="btn btn-primary" style="width:64px;height:44px;border-radius:22px;font-size:14px">发送</button>
</div>
```

### 下拉刷新/加载更多
```html
<!-- 下拉提示 -->
<div class="pull-hint">↓ 下拉刷新</div>
<!-- 加载中旋转动画（纯CSS） -->
<div style="text-align:center;padding:16px">
  <div style="width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--primary);
    border-radius:50%;animation:spin .8s linear infinite;margin:0 auto"></div>
  <div style="font-size:13px;color:var(--text-secondary);margin-top:8px">加载中...</div>
</div>
<style>@keyframes spin { to { transform:rotate(360deg) } }</style>
<!-- 加载更多按钮 -->
<div style="text-align:center;padding:16px">
  <span style="font-size:13px;color:var(--primary)">点击加载更多</span>
</div>
```

## 配色方案预设

| 方案 | --primary | --bg | 适用场景 |
|------|-----------|------|----------|
| 清新蓝 | `#2563eb` | `#f5f7fa` | 商务/工具类App |
| 活力橙 | `#ff6b35` | `#fff8f5` | 社交/电商/活动页 |
| 自然绿 | `#16a34a` | `#f0fdf4` | 健康/环保/金融 |
| 品牌紫 | `#7c3aed` | `#f5f3ff` | 创意/教育/娱乐 |

切换配色只需覆盖 CSS 变量：
```html
<!-- 活力橙示例 -->
<style>:root { --primary:#ff6b35; --bg:#fff8f5; }</style>
<!-- 自然绿示例 -->
<style>:root { --primary:#16a34a; --bg:#f0fdf4; }</style>
<!-- 品牌紫示例 -->
<style>:root { --primary:#7c3aed; --bg:#f5f3ff; }</style>
```

## H5 适配注意事项

- **尺寸单位**：优先使用 `rem` 或 `vw/vh`，避免固定 `px` 导致不同屏幕不适配
- **触摸目标**：所有可点击元素最小 44x44px，符合移动端人机交互规范
- **触摸反馈**：不使用 `:hover`（触屏无效），用 `:active` 替代，并设置 `-webkit-tap-highlight-color:transparent`
- **安全区域**：刘海屏/底部横条适配使用 `env(safe-area-inset-bottom)` 和 `env(safe-area-inset-top)`
- **字号规范**：标题 17-20px、正文 14-15px、辅助文字 12px，不建议小于 12px
- **滚动优化**：内容区加 `-webkit-overflow-scrolling:touch` 实现惯性滚动
- **输入框聚焦**：iOS 下 font-size < 16px 会自动缩放，建议 input 设置 `font-size:16px`
