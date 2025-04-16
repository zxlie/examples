# 钉钉示例项目

这是一个钉钉的examples项目，包含以下示例：

## 钉钉AI助理Chrome扩展

位置：[dingtalk-assistant-api-chromeextension](./dingtalk-assistant-api-chromeextension)

这是一个Chrome浏览器扩展，实现了通过钉钉Assistant API与钉钉AI助理进行对话的功能。通过该扩展，用户可以在Chrome浏览器中直接与钉钉AI助理进行交互。

### 主要功能
- 通过钉钉Assistant API创建会话线程
- 发送用户消息并获取AI助理回复
- 支持流式响应，实时显示AI助理回复内容
- 保存助理ID和访问令牌配置

### 技术实现
- 使用Chrome Extension Manifest V3规范
- 使用Fetch API和ReadableStream处理流式响应
- 纯HTML/CSS/JavaScript实现，无外部依赖

详细信息请查看项目内的README文件。