const axios = require('axios');
const https = require('https');

class DingTalkAssistant {
    constructor() {
        this.baseURL = process.env.API_BASE_URL;
        this.assistantId = process.env.ASSISTANT_ID;
        this.accessToken = null;
    }

    // 获取访问令牌
    async getAccessToken() {
        try {
            const response = await axios.post(
                'https://api.dingtalk.com/v1.0/oauth2/accessToken',
                {
                    appKey: process.env.CLIENT_ID,
                    appSecret: process.env.CLIENT_SECRET
                }
            );
            this.accessToken = response.data.accessToken;
            return this.accessToken;
        } catch (error) {
            console.error('获取访问令牌失败:', error.message);
            throw error;
        }
    }

    // 创建对话线程
    async createThread() {
        try {
            const response = await axios.post(
                `${this.baseURL}/assistant/threads`,
                {},
                {
                    headers: {
                        'x-acs-dingtalk-access-token': this.accessToken
                    }
                }
            );
            return response.data.id;
        } catch (error) {
            console.error('创建对话线程失败:', error.message);
            throw error;
        }
    }

    // 发送消息
    async createMessage(threadId, content) {
        try {
            const response = await axios.post(
                `${this.baseURL}/assistant/threads/${threadId}/messages`,
                {
                    content: content,
                    role: 'user'
                },
                {
                    headers: {
                        'x-acs-dingtalk-access-token': this.accessToken
                    }
                }
            );
            return response.data.id;
        } catch (error) {
            console.error('发送消息失败:', error.message);
            throw error;
        }
    }

    // 启动流式对话
    async startStreamConversation(threadId, onContent, onEnd) {
        const url = `${this.baseURL}/assistant/threads/${threadId}/runs`;
        const data = {
            assistantId: this.assistantId,
            stream: true
        };

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-acs-dingtalk-access-token': this.accessToken
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                let buffer = '';
                let currentMessage = '';
                let messageId = null;

                res.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const messages = buffer.split('\n\n');
                    buffer = messages.pop() || ''; // 保留最后一个不完整的消息

                    for (const message of messages) {
                        if (message.trim()) {
                            try {
                                // 检查是否是结束标记
                                if (message.includes('[DONE]')) {
                                    continue;
                                }

                                // 分别处理每行数据
                                const lines = message.split('\n');
                                const eventLine = lines.find(line => line.startsWith('event:'));
                                const dataLine = lines.find(line => line.startsWith('data:'));

                                if (eventLine && dataLine) {
                                    const event = eventLine.replace('event:', '').trim();
                                    const jsonData = dataLine.replace('data:', '').trim();
                                    
                                    try {
                                        const data = JSON.parse(jsonData);
                                        
                                        if (event === 'thread.message.created') {
                                            // 新消息开始
                                            messageId = data.messageId;
                                            currentMessage = '';
                                        } else if (event === 'thread.message.delta' && data.messageId === messageId) {
                                            if (data.delta && data.delta.text) {
                                                const newContent = data.delta.text.value;
                                                
                                                // 处理消息更新
                                                if (data.mode === 'overwrite') {
                                                    // 完全覆盖模式
                                                    currentMessage = newContent;
                                                    onContent(newContent, true); // true表示覆盖
                                                } else if (data.mode === 'append') {
                                                    // 增量更新模式
                                                    const deltaContent = newContent.substring(currentMessage.length);
                                                    if (deltaContent) {
                                                        currentMessage = newContent;
                                                        onContent(deltaContent, false); // false表示追加
                                                    }
                                                }
                                            }
                                        }
                                    } catch (jsonError) {
                                        console.error('JSON解析失败:', jsonError.message);
                                        continue;
                                    }
                                }
                            } catch (error) {
                                continue;
                            }
                        }
                    }
                });

                res.on('end', () => {
                    onEnd();
                    resolve();
                });
            });

            req.on('error', (error) => {
                console.error('请求失败:', error);
                reject(error);
            });

            req.write(JSON.stringify(data));
            req.end();
        });
    }
}

module.exports = { DingTalkAssistant }; 