# TransAI Browser Extension - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Initial Setup](#initial-setup)
4. [Core Features](#core-features)
5. [Advanced Features](#advanced-features)
6. [Troubleshooting](#troubleshooting)
7. [Privacy & Security](#privacy--security)
8. [FAQ](#faq)

## Getting Started

TransAI is an intelligent browser extension that helps you translate text, build vocabulary, and enhance your language learning experience using advanced AI technology.

### Key Features
- **Instant Translation**: Select any text on a webpage to get AI-powered translations
- **Smart Vocabulary Management**: Build and organize your personal vocabulary collection
- **Content Generation**: Create practice sentences and articles using your vocabulary
- **Pronunciation Support**: Hear correct pronunciation of words and phrases
- **Cross-Browser Support**: Works on Chrome and Edge browsers
- **Privacy-First**: Your data stays secure and private

## Installation

### From Chrome Web Store
1. Visit the Chrome Web Store
2. Search for "TransAI Translation Extension"
3. Click "Add to Chrome"
4. Confirm the installation

### From Edge Add-ons Store
1. Visit Microsoft Edge Add-ons
2. Search for "TransAI Translation Extension"
3. Click "Get"
4. Confirm the installation

### Manual Installation (Developer Mode)
1. Download the extension files
2. Open Chrome/Edge and go to Extensions page
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder

## Initial Setup

### 1. Configure Your API Key

After installation, you'll need to set up your AI service:

1. **Click the TransAI icon** in your browser toolbar
2. **Select "Options"** from the popup menu
3. **Choose your AI provider**:
   - OpenAI (recommended)
   - Anthropic Claude
   - Custom API endpoint
4. **Enter your API key**:
   - For OpenAI: Get your key from [platform.openai.com](https://platform.openai.com)
   - For Anthropic: Get your key from [console.anthropic.com](https://console.anthropic.com)
5. **Click "Validate & Save"**

### 2. Set Your Preferences

Configure the extension to match your needs:

- **Default Target Language**: Choose your primary translation language
- **UI Theme**: Select light, dark, or auto theme
- **Overlay Position**: Choose where translation popups appear
- **Auto-pronunciation**: Enable/disable automatic audio playback

## Core Features

### Text Translation

#### Basic Translation
1. **Select text** on any webpage by highlighting it with your mouse
2. **Translation popup appears** automatically near your selection
3. **View the translation** along with example sentences
4. **Add to vocabulary** by clicking the "+" button
5. **Hear pronunciation** by clicking the speaker icon

#### Translation Tips
- Works with single words, phrases, or entire sentences
- Supports 100+ languages
- Provides context-aware translations
- Shows confidence levels for accuracy

### Vocabulary Management

#### Adding Words
- **From translations**: Click the "+" button in any translation popup
- **Manual entry**: Use the popup interface to add words directly
- **Bulk import**: Import vocabulary from CSV files

#### Organizing Vocabulary
- **Search**: Find words quickly using the search bar
- **Filter**: Sort by date added, review count, or alphabetically
- **Edit**: Modify translations, context, or pronunciation
- **Delete**: Remove words you no longer need

#### Vocabulary Statistics
- Track total words learned
- Monitor review progress
- See learning streaks and milestones

### Content Generation

#### Sentence Generation
1. **Open the popup** by clicking the TransAI icon
2. **Go to "Content Generation" tab**
3. **Select vocabulary words** you want to practice
4. **Choose sentence count** (1-10 sentences)
5. **Click "Generate Sentences"**
6. **Review and save** generated content

#### Article Generation
1. **Navigate to "Article Generation"**
2. **Select vocabulary words** for the article
3. **Enter a topic** (optional)
4. **Choose article length** (short, medium, long)
5. **Click "Generate Article"**
6. **Export or save** the generated article

## Advanced Features

### Custom Prompts

Customize how the AI generates translations and content:

1. **Go to Options > Prompts**
2. **Edit translation prompts** to match your style
3. **Modify content generation** templates
4. **Use placeholders** like `{text}`, `{targetLanguage}`, `{words}`
5. **Save and test** your custom prompts

### Export & Import

#### Exporting Data
- **Vocabulary**: Export as CSV, JSON, or plain text
- **Generated Content**: Save articles and sentences
- **Configuration**: Backup your settings

#### Importing Data
- **Vocabulary**: Import from other language learning apps
- **Settings**: Restore from backup files
- **Bulk vocabulary**: Upload CSV files with word lists

### Keyboard Shortcuts

- **Ctrl+Shift+T**: Quick translate selected text
- **Ctrl+Shift+V**: Open vocabulary popup
- **Escape**: Close translation overlay
- **Tab**: Navigate through popup elements
- **Enter**: Activate focused button

### Accessibility Features

- **Screen reader support**: Full ARIA labeling
- **Keyboard navigation**: Complete keyboard accessibility
- **High contrast mode**: Enhanced visibility options
- **Reduced motion**: Respects system preferences
- **Focus management**: Proper focus handling

## Troubleshooting

### Common Issues

#### Translation Not Working
**Problem**: Translation popup doesn't appear when selecting text
**Solutions**:
1. Check if API key is configured correctly
2. Verify internet connection
3. Try refreshing the webpage
4. Check if the website blocks extensions

#### API Key Errors
**Problem**: "Invalid API key" or "Authentication failed"
**Solutions**:
1. Verify API key is entered correctly (no extra spaces)
2. Check if API key has sufficient credits/quota
3. Ensure API key has proper permissions
4. Try generating a new API key

#### Vocabulary Not Saving
**Problem**: Added words don't appear in vocabulary list
**Solutions**:
1. Check browser storage permissions
2. Clear extension storage and re-add words
3. Verify you're not in incognito/private mode
4. Check available storage space

#### Performance Issues
**Problem**: Extension is slow or unresponsive
**Solutions**:
1. Clear cached translations (Options > Advanced)
2. Reduce vocabulary size if very large (>10,000 words)
3. Disable other extensions temporarily
4. Restart browser

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Network Error" | Can't reach AI service | Check internet connection |
| "Rate Limited" | Too many requests | Wait and try again |
| "Quota Exceeded" | API usage limit reached | Check API account billing |
| "Invalid Response" | AI service error | Try again or contact support |

### Getting Help

1. **Check this guide** for common solutions
2. **Visit our FAQ** section below
3. **Contact support** through the extension options
4. **Report bugs** via GitHub issues
5. **Join community** discussions

## Privacy & Security

### Data Protection

- **Local Storage**: Vocabulary and settings stored locally on your device
- **No Data Collection**: We don't collect or store your personal data
- **Secure Transmission**: All API calls use HTTPS encryption
- **API Key Security**: Keys stored securely in browser storage

### What Data is Sent

When you use TransAI, only the following is sent to AI services:
- **Text for translation**: The specific text you select
- **Language preferences**: Source and target languages
- **Generation requests**: Vocabulary words for content creation

**Never sent**:
- Your browsing history
- Personal information
- Full webpage content
- Other extension data

### Managing Your Data

- **Clear Data**: Remove all stored vocabulary and settings
- **Export Data**: Download your vocabulary for backup
- **API Key Management**: Change or remove API keys anytime
- **Offline Mode**: Basic features work without internet

## FAQ

### General Questions

**Q: Is TransAI free to use?**
A: The extension is free, but you need your own AI service API key. Most providers offer free tiers.

**Q: Which browsers are supported?**
A: Chrome and Edge browsers on desktop. Mobile support coming soon.

**Q: Can I use it offline?**
A: Basic vocabulary management works offline. Translation requires internet connection.

**Q: How accurate are the translations?**
A: Very accurate thanks to advanced AI. Accuracy varies by language pair and context.

### Technical Questions

**Q: Why do I need an API key?**
A: API keys ensure you have direct access to AI services and maintain privacy.

**Q: Can I use multiple AI providers?**
A: Currently one provider at a time. You can switch providers in settings.

**Q: Is there a vocabulary limit?**
A: No hard limit, but performance may slow with very large vocabularies (>10,000 words).

**Q: Can I sync across devices?**
A: Not currently, but you can export/import vocabulary between devices.

### Privacy Questions

**Q: Do you store my translations?**
A: No, translations are only cached temporarily on your device.

**Q: Can you see my API key?**
A: No, API keys are stored securely in your browser and never transmitted to us.

**Q: What permissions does the extension need?**
A: Only storage (for vocabulary) and active tab (for text selection).

### Troubleshooting Questions

**Q: Translation popup appears in wrong position**
A: Adjust overlay position in Options > UI Preferences.

**Q: Some websites don't work**
A: Some sites block extensions. Try disabling other extensions or use reader mode.

**Q: Extension slows down my browser**
A: Clear cached data and reduce vocabulary size if very large.

---

## Support

Need more help? Contact us:
- **Email**: support@transai-extension.com
- **GitHub**: [Issues & Discussions](https://github.com/transai/browser-extension)
- **Documentation**: [Full Documentation](https://docs.transai-extension.com)

---

*TransAI Browser Extension v1.0 - Making language learning intelligent and accessible.*