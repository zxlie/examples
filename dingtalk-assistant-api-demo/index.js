require('dotenv').config();
const axios = require('axios');
const https = require('https');
const readline = require('readline');

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
    async startStreamConversation(threadId) {
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
                res.on('data', (chunk) => {
                    buffer += chunk.toString();
                    // 使用双换行符分割消息
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
                                    let jsonData = dataLine.replace('data:', '').trim();
                                    
                                    // 处理可能的特殊字符
                                    try {
                                        const data = JSON.parse(jsonData);
                                        if (event === 'thread.message.delta') {
                                            if (data.delta && data.delta.text) {
                                                process.stdout.write(data.delta.text.value);
                                            }
                                        }
                                    } catch (jsonError) {
                                        console.error('JSON解析失败:', jsonError.message);
                                        // 继续处理下一条消息
                                        continue;
                                    }
                                }
                            } catch (error) {
                                // 忽略解析错误，继续处理下一条消息
                                continue;
                            }
                        }
                    }
                });

                res.on('end', () => {
                    console.log('\n对话结束');
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

// 创建命令行交互界面
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 主程序
async function main() {
    try {
        const assistant = new DingTalkAssistant();
        
        // 获取访问令牌
        await assistant.getAccessToken();
        
        // 创建对话线程
        const threadId = await assistant.createThread();
        console.log('对话已开始，请输入您的问题（输入 exit 退出）：');

        // 开始交互循环
        const askQuestion = () => {
            rl.question('您: ', async (input) => {
                if (input.toLowerCase() === 'exit') {
                    rl.close();
                    return;
                }

                try {
                    // 发送用户消息
                    await assistant.createMessage(threadId, input);
                    
                    // 获取AI助理的回复
                    console.log('AI助理: ');
                    await assistant.startStreamConversation(threadId);
                    
                    // 继续下一轮对话
                    askQuestion();
                } catch (error) {
                    console.error('对话出错:', error);
                    rl.close();
                }
            });
        };

        askQuestion();
    } catch (error) {
        console.error('程序启动失败:', error);
        rl.close();
    }
}

// 启动程序
main(); 