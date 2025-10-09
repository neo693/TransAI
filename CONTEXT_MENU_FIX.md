# 右键菜单翻译弹窗修复

## 问题描述
选中文本后右键点击 "trans ai" 菜单项，翻译弹窗不会出现。

## 根本原因
1. **权限问题**: `contextMenus` 权限被设置为可选权限（`optional_permissions`），用户需要手动授予才能使用右键菜单功能
2. **缺少错误处理**: 没有足够的日志和错误处理来诊断问题
3. **消息响应缺失**: content script 的消息监听器没有正确响应消息

## 修复方案

### 1. 将 contextMenus 改为必需权限
修改了以下文件，将 `contextMenus` 从 `optional_permissions` 移到 `permissions`：
- `src/manifest.json`
- `src/manifests/chrome.json`
- `src/manifests/edge.json`

**修改前:**
```json
"permissions": [
  "storage",
  "activeTab",
  "scripting",
  "tts"
],
"optional_permissions": [
  "contextMenus"
]
```

**修改后:**
```json
"permissions": [
  "storage",
  "activeTab",
  "scripting",
  "tts",
  "contextMenus"
]
```

### 2. 改进 background service 的 context menu 设置

**文件**: `src/background/background-service.ts`

**改进点:**
- 移除了权限检查，直接创建菜单（因为现在是必需权限）
- 在创建菜单前先清除所有现有菜单，避免重复
- 添加了详细的日志记录
- 添加了错误处理
- 在发送消息时添加了回调来检查是否成功

**关键代码:**
```typescript
private setupContextMenu(): void {
  try {
    // Remove existing menu items first to avoid duplicates
    chrome.contextMenus.removeAll(() => {
      // Create the context menu item
      chrome.contextMenus.create({
        id: 'transai-translate',
        title: 'trans ai',
        contexts: ['selection']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to create context menu:', chrome.runtime.lastError);
        } else {
          console.log('Context menu created successfully');
        }
      });
    });

    // Setup click listener with detailed logging
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      console.log('Context menu clicked:', { 
        menuItemId: info.menuItemId, 
        tabId: tab?.id, 
        selectionText: info.selectionText 
      });
      
      if (info.menuItemId === 'transai-translate' && tab?.id && info.selectionText) {
        const message = {
          id: `show_translation_${Date.now()}`,
          type: MessageType.SHOW_TRANSLATION_OVERLAY,
          timestamp: Date.now(),
          payload: {
            text: info.selectionText
          }
        };
        
        console.log('Sending message to content script:', message);
        
        chrome.tabs.sendMessage(tab.id, message, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to send message to content script:', chrome.runtime.lastError);
          } else {
            console.log('Message sent successfully, response:', response);
          }
        });
      }
    });
  } catch (error) {
    console.error('Error setting up context menu:', error);
  }
}
```

### 3. 改进 content script 的消息监听器

**文件**: `src/content/index.ts`

**改进点:**
- 添加了详细的日志记录
- 添加了错误检查（overlay manager 是否初始化、是否有文本）
- 添加了 try-catch 错误处理
- 正确使用 `sendResponse` 回调
- 返回 `true` 保持消息通道开放以支持异步响应

**关键代码:**
```typescript
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    if (message.type === 'SHOW_TRANSLATION_OVERLAY') {
      console.log('Received SHOW_TRANSLATION_OVERLAY message:', message);
      
      if (!overlayManager) {
        console.error('Overlay manager not initialized');
        sendResponse({ success: false, error: 'Overlay manager not initialized' });
        return true;
      }
      
      if (!message.payload?.text) {
        console.error('No text in message payload');
        sendResponse({ success: false, error: 'No text provided' });
        return true;
      }
      
      try {
        const selection: TextSelection = {
          text: message.payload.text,
          position: {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
          },
          context: '',
          url: window.location.href
        };
        
        console.log('Showing overlay with selection:', selection);
        overlayManager.show(selection);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error showing overlay:', error);
        sendResponse({ success: false, error: String(error) });
      }
      
      return true; // Keep the message channel open for async response
    }
    
    return false;
  });
  
  console.log('Message listener setup complete');
}
```

## 测试步骤

1. **重新加载扩展**
   - 打开 Chrome/Edge 扩展管理页面
   - 点击"重新加载"按钮重新加载扩展

2. **检查权限**
   - 确认扩展已获得 contextMenus 权限
   - 如果是首次安装，可能需要重新安装扩展

3. **测试右键菜单**
   - 打开任意网页
   - 选中一段文本
   - 右键点击，应该能看到 "trans ai" 菜单项
   - 点击菜单项

4. **验证翻译弹窗**
   - 翻译弹窗应该出现在屏幕中央
   - 弹窗应该显示选中的文本

5. **检查控制台日志**
   - 打开浏览器开发者工具
   - 查看 Console 标签
   - 应该能看到以下日志：
     - Background: "Context menu created successfully"
     - Background: "Context menu clicked: ..."
     - Background: "Sending message to content script: ..."
     - Content: "Content script received message: ..."
     - Content: "Showing overlay with selection: ..."

## 调试建议

如果问题仍然存在，请检查：

1. **扩展是否正确加载**
   - 查看扩展管理页面是否有错误
   - 确认 background service worker 正在运行

2. **Content script 是否注入**
   - 在网页上打开开发者工具
   - 应该能看到 "TransAI content script loaded" 日志
   - 应该能看到 "TransAI Loaded" 绿色提示框（3秒后消失）

3. **权限是否正确授予**
   - 在扩展详情页面检查权限列表
   - 确认包含 "contextMenus" 权限

4. **消息是否正确发送**
   - 在 background service worker 控制台查看日志
   - 在网页控制台查看 content script 日志

## 相关文件

- `src/manifest.json`
- `src/manifests/chrome.json`
- `src/manifests/edge.json`
- `src/background/background-service.ts`
- `src/content/index.ts`

## 注意事项

- 修改 manifest 后需要重新加载扩展
- 如果是开发模式，可能需要完全移除并重新添加扩展
- 确保在测试前清除浏览器缓存
