# 发音按钮和消息发送修复

## 修复内容

### 1. 单词本列表添加发音按钮 ✅

**位置**: `src/popup/App.tsx` - VocabularyList 组件

**修改内容**:
- 为单词本列表中的每个单词和翻译都添加了发音按钮
- 发音按钮现在始终显示，不再依赖于 `sourceLanguage` 和 `targetLanguage` 是否存在
- 如果语言信息缺失，默认使用英语 ('en') 作为备用
- 发音按钮位置更加明显，紧跟在单词和翻译文本之后

**改进点**:
```tsx
// 之前：只在有语言信息时显示
{item.sourceLanguage && <PronunciationButton ... />}

// 现在：始终显示，使用默认语言作为备用
<PronunciationButton
  word={item.word}
  language={item.sourceLanguage || 'en'}
  size="sm"
  onError={(error) => console.warn('Pronunciation error:', error)}
/>
```

### 2. 修复 Background Script 消息发送错误 ✅

**位置**: `src/background/background-service.ts` - setupContextMenu 方法

**问题描述**:
- 错误信息: `Failed to send message to content script: [object Object]`
- 原因: 使用回调方式处理 `chrome.tabs.sendMessage` 时，错误对象没有被正确序列化

**修改内容**:
- 将回调方式改为 Promise 方式处理消息发送
- 使用 `.then()` 和 `.catch()` 正确处理成功和失败情况
- 改进错误日志，使用 `console.warn` 而不是 `console.error`，因为在某些页面上 content script 未加载是正常情况

**修复前**:
```typescript
chrome.tabs.sendMessage(tab.id, message, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Failed to send message to content script:', chrome.runtime.lastError);
  } else {
    console.log('Message sent successfully, response:', response);
  }
});
```

**修复后**:
```typescript
chrome.tabs.sendMessage(tab.id, message)
  .then((response) => {
    console.log('Message sent successfully, response:', response);
  })
  .catch((error) => {
    // This is expected if content script is not loaded on the page
    console.warn('Could not send message to content script:', error.message || error);
    // Optionally, you could inject the content script here if needed
  });
```

## 测试建议

### 测试发音按钮
1. 打开扩展的单词本页面
2. 确认每个单词条目都显示发音按钮（扬声器图标）
3. 点击单词的发音按钮，应该能听到单词的发音
4. 点击翻译的发音按钮，应该能听到翻译的发音

### 测试消息发送修复
1. 在任意网页上选中文本
2. 右键点击，选择 "trans ai" 菜单项
3. 检查浏览器控制台（F12），不应该再看到 `[object Object]` 错误
4. 如果页面支持 content script，应该看到翻译覆盖层
5. 如果页面不支持（如 chrome:// 页面），应该看到友好的警告信息而不是错误

## 相关文件

- `src/popup/App.tsx` - 单词本列表组件
- `src/background/background-service.ts` - 后台服务和上下文菜单
- `src/services/audio.ts` - 音频服务（发音功能）
- `src/components/pronunciation-button.tsx` - 发音按钮组件

## 注意事项

1. 发音功能依赖于浏览器的 Web Speech API 或扩展的 TTS API
2. 某些浏览器或语言可能不支持所有发音功能
3. Content script 只能在普通网页上运行，在特殊页面（如 chrome://、about:// 等）上无法注入
