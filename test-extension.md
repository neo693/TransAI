# TransAI Extension 测试指南

## 快速测试步骤

### 1. 安装扩展
```bash
# 构建扩展
pnpm build

# 在Chrome中加载扩展
# 1. 打开 chrome://extensions/
# 2. 开启"开发者模式"
# 3. 点击"加载已解压的扩展程序"
# 4. 选择 dist 文件夹
```

### 2. 测试基本功能

#### 测试1: 扩展加载
1. 打开 `test-page.html`
2. 查看页面右上角是否出现绿色的"TransAI Loaded"指示器
3. 如果出现，说明content script正常加载

#### 测试2: 文本选择检测
1. 在test-page.html中选择任意文本
2. 查看是否出现蓝色的"Selected: ..."指示器（持续2秒）
3. 查看Debug Information中的"Last Selection"是否更新

#### 测试3: 翻译弹窗
1. 选择文本后，查看是否出现翻译弹窗
2. 弹窗应该显示"Translating..."加载状态
3. Debug Information中的"Translation Overlay"应该显示"Shown ✓"

### 3. 调试步骤

如果功能不正常，按以下步骤调试：

#### 步骤1: 检查扩展状态
- 在 `chrome://extensions/` 中确认扩展已启用
- 检查是否有错误信息

#### 步骤2: 检查控制台日志
1. 打开浏览器开发者工具 (F12)
2. 查看Console标签页
3. 应该看到以下日志：
   ```
   TransAI content script loaded
   Initializing TransAI content script on: file:///.../test-page.html
   Content script connected to background service worker
   Text selection handler initialized
   Translation overlay manager initialized
   ```

#### 步骤3: 检查Background Script
1. 在 `chrome://extensions/` 页面
2. 找到TransAI扩展
3. 点击"service worker"链接
4. 查看background script的控制台日志

#### 步骤4: 测试消息传递
在页面控制台中运行：
```javascript
// 测试PING消息
chrome.runtime.sendMessage({
  id: 'test_ping',
  type: 'PING',
  timestamp: Date.now()
}, (response) => {
  console.log('PING response:', response);
});
```

### 4. 常见问题解决

#### 问题1: "TransAI Loaded"指示器不出现
**原因**: Content script未加载
**解决**: 
- 检查扩展权限
- 刷新页面
- 重新加载扩展

#### 问题2: 选择文本无反应
**原因**: 文本选择检测失败
**解决**:
- 检查控制台是否有JavaScript错误
- 确认选择的文本符合要求（包含字母，长度1-500字符）

#### 问题3: 翻译弹窗不出现
**原因**: 
- Background script未响应
- API未配置
- 消息传递失败

**解决**:
1. 检查background script日志
2. 配置API密钥（点击扩展图标 → 设置）
3. 查看网络请求是否成功

#### 问题4: 翻译请求失败
**原因**: API配置问题
**解决**:
1. 点击扩展图标进入popup
2. 进入设置页面
3. 配置正确的API密钥和提供商

### 5. 成功标志

如果一切正常，你应该看到：
- ✅ 绿色"TransAI Loaded"指示器
- ✅ 选择文本时出现蓝色提示
- ✅ 翻译弹窗正常显示
- ✅ 控制台无错误信息
- ✅ Debug Information显示正确状态

### 6. 下一步

如果基本功能正常，可以测试：
- 配置API密钥进行实际翻译
- 测试添加到生词本功能
- 测试popup界面的各个功能
- 测试options页面的设置功能