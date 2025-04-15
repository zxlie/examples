require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { DingTalkAssistant } = require('./assistant');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 提供静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 存储用户会话信息
const userSessions = new Map();

io.on('connection', async (socket) => {
    console.log('新用户连接');
    
    try {
        // 为新连接创建助理实例
        const assistant = new DingTalkAssistant();
        await assistant.getAccessToken();
        const threadId = await assistant.createThread();
        
        // 存储会话信息
        userSessions.set(socket.id, {
            assistant,
            threadId
        });

        // 处理用户消息
        socket.on('sendMessage', async (data) => {
            try {
                const session = userSessions.get(socket.id);
                if (!session) {
                    throw new Error('会话不存在');
                }

                // 发送消息
                await session.assistant.createMessage(session.threadId, data.content);
                
                // 通知客户端开始接收响应
                socket.emit('assistantResponse', { type: 'start' });

                // 启动流式对话
                await session.assistant.startStreamConversation(
                    session.threadId,
                    (content, isOverwrite) => {
                        // 发送内容给客户端
                        socket.emit('assistantResponse', {
                            type: 'content',
                            content,
                            isOverwrite
                        });
                    },
                    () => {
                        // 通知客户端响应结束
                        socket.emit('assistantResponse', { type: 'end' });
                    }
                );
            } catch (error) {
                console.error('处理消息时出错:', error);
                socket.emit('error', error.message);
            }
        });

        // 处理断开连接
        socket.on('disconnect', () => {
            console.log('用户断开连接');
            userSessions.delete(socket.id);
        });

    } catch (error) {
        console.error('初始化会话时出错:', error);
        socket.emit('error', error.message);
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 