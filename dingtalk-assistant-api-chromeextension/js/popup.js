document.addEventListener('DOMContentLoaded', function() {
  // 元素引用
  const assistantIdInput = document.getElementById('assistantId');
  const clientIdInput = document.getElementById('clientId');
  const clientSecretInput = document.getElementById('clientSecret');
  const saveConfigBtn = document.getElementById('saveConfig');
  const userInputArea = document.getElementById('userInput');
  const sendMessageBtn = document.getElementById('sendMessage');
  const chatMessagesDiv = document.getElementById('chatMessages');
  
  // 当前会话状态
  let currentThreadId = null;
  let isWaitingForResponse = false;
  let accessToken = null;
  
  // 从存储中加载配置
  chrome.storage.local.get(['assistantId', 'clientId', 'clientSecret'], function(result) {
    if (result.assistantId) assistantIdInput.value = result.assistantId;
    if (result.clientId) clientIdInput.value = result.clientId;
    if (result.clientSecret) clientSecretInput.value = result.clientSecret;
  });
  
  // 保存配置
  saveConfigBtn.addEventListener('click', function() {
    const assistantId = assistantIdInput.value.trim();
    const clientId = clientIdInput.value.trim();
    const clientSecret = clientSecretInput.value.trim();
    
    if (assistantId && clientId && clientSecret) {
      chrome.storage.local.set({
        assistantId: assistantId,
        clientId: clientId,
        clientSecret: clientSecret
      }, function() {
        showStatusMessage('配置已保存');
      });
    } else {
      showStatusMessage('请填写完整的配置信息');
    }
  });
  
  // 发送消息
  sendMessageBtn.addEventListener('click', sendMessage);
  userInputArea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // 发送消息函数
  function sendMessage() {
    if (isWaitingForResponse) {
      showStatusMessage('请等待助理回复');
      return;
    }
    
    const userInput = userInputArea.value.trim();
    if (!userInput) return;
    
    const assistantId = assistantIdInput.value.trim();
    const clientId = clientIdInput.value.trim();
    const clientSecret = clientSecretInput.value.trim();
    
    if (!assistantId || !clientId || !clientSecret) {
      showStatusMessage('请先完成所有配置项');
      return;
    }
    
    // 添加用户消息到聊天界面
    appendMessage(userInput, 'user');
    userInputArea.value = '';
    
    isWaitingForResponse = true;
    showTypingIndicator();
    
    try {
      // 获取访问令牌然后继续操作
      getAccessToken(clientId, clientSecret, function(token) {
        if (!token) {
          isWaitingForResponse = false;
          removeTypingIndicator();
          showStatusMessage('获取访问令牌失败');
          return;
        }
        
        accessToken = token;
        
        try {
          // 如果没有线程ID，先创建线程
          if (!currentThreadId) {
            createThread(assistantId, accessToken, userInput);
          } else {
            addMessageAndRun(currentThreadId, assistantId, accessToken, userInput);
          }
        } catch (error) {
          console.error('处理消息时发生错误:', error);
          isWaitingForResponse = false;
          removeTypingIndicator();
          showStatusMessage('处理消息失败: ' + (error.message || '未知错误'));
        }
      });
    } catch (error) {
      console.error('发送消息时发生错误:', error);
      isWaitingForResponse = false;
      removeTypingIndicator();
      showStatusMessage('发送消息失败: ' + (error.message || '未知错误'));
    }
  }

  // 获取访问令牌
  function getAccessToken(clientId, clientSecret, callback, retryCount = 0) {
    const maxRetries = 2; // 最大重试次数
    
    // 通过后台脚本发送请求，避免CORS问题
    chrome.runtime.sendMessage({
      action: 'fetchDingtalkToken',
      clientId: clientId,
      clientSecret: clientSecret
    }, response => {
      if (response && response.success && response.data && response.data.access_token) {
        callback(response.data.access_token);
      } else {
        console.error('获取访问令牌响应错误:', response);
        
        // 如果失败并且还可以重试，则重试
        if (retryCount < maxRetries) {
          console.log(`重试获取访问令牌，第 ${retryCount + 1} 次尝试`);
          // 增加延迟重试，避免快速重试
          setTimeout(() => {
            getAccessToken(clientId, clientSecret, callback, retryCount + 1);
          }, 1000 * (retryCount + 1)); // 逐次增加等待时间
        } else {
          // 达到最大重试次数，放弃
          callback(null);
          showStatusMessage('获取访问令牌失败，请检查配置或网络连接');
        }
      }
    });
  }
  
  // 创建线程
  function createThread(assistantId, accessToken, userInput, retryCount = 0) {
    const maxRetries = 2; // 最大重试次数
    
    chrome.runtime.sendMessage({
      action: 'fetchDingtalkAPI',
      url: 'https://api.dingtalk.com/v1.0/dingtalk/cognitive/assistant/threads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-acs-dingtalk-access-token': accessToken
      },
      body: {
        assistantId: assistantId  // 仅保留助理ID，移除version以避免重复
      }
    }, response => {
      if (response && response.success && response.data && response.data.threadId) {
        currentThreadId = response.data.threadId;
        addMessageAndRun(currentThreadId, assistantId, accessToken, userInput);
      } else {
        console.error('创建线程错误:', response);
        
        // 如果失败并且还可以重试，则重试
        if (retryCount < maxRetries) {
          console.log(`重试创建线程，第 ${retryCount + 1} 次尝试`);
          // 增加延迟重试，避免快速重试
          setTimeout(() => {
            createThread(assistantId, accessToken, userInput, retryCount + 1);
          }, 1000 * (retryCount + 1)); // 逐次增加等待时间
          return;
        }
        
        isWaitingForResponse = false;
        removeTypingIndicator();
        
        // 显示更具体的错误信息
        let errorMessage = '创建对话失败，请检查配置';
        if (response && !response.success && response.error) {
          if (typeof response.error === 'object' && response.error.code) {
            errorMessage = `创建对话失败: ${response.error.code} - ${response.error.message || '请检查配置'}`;
          } else if (response.error.errorData && response.error.errorData.message) {
            errorMessage = `创建对话失败: ${response.error.errorData.message}`;
          }
        }
        showStatusMessage(errorMessage);
      }
    });
  }
  
  // 添加消息并运行助理
  function addMessageAndRun(threadId, assistantId, accessToken, content) {
    // 1. 添加消息到线程
    chrome.runtime.sendMessage({
      action: 'fetchDingtalkAPI',
      url: `https://api.dingtalk.com/v1.0/dingtalk/cognitive/assistant/threads/${threadId}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-acs-dingtalk-access-token': accessToken
      },
      body: {
        role: 'user',
        content: content
      }
    }, response => {
      if (response && response.success) {
        // 2. 运行助理（流式）
        runAssistantStream(threadId, assistantId, accessToken);
      } else {
        console.error('添加消息错误:', response);
        isWaitingForResponse = false;
        removeTypingIndicator();
        showStatusMessage('发送消息失败');
      }
    });
  }
  
  // 运行助理（流式）- 使用background.js处理流式响应
  function runAssistantStream(threadId, assistantId, accessToken) {
    // 手动构建URL，添加必要的参数
    const url = `https://api.dingtalk.com/v1.0/dingtalk/cognitive/assistant/threads/${threadId}/runs?stream=true`;
    
    // 控制变量
    let currentMessageId = null;
    let currentResponseText = '';
    
    // 设置事件监听器，接收来自background.js的流数据
    const messageListener = function(message) {
      if (message.action === 'streamData' && message.threadId === threadId) {
        // 处理接收到的数据块
        processStreamData(message.data);
      } else if (message.action === 'streamError' && message.threadId === threadId) {
        // 处理流错误
        console.error('流读取错误:', message.error);
        isWaitingForResponse = false;
        removeTypingIndicator();
        showStatusMessage('获取回复失败: ' + message.error);
        chrome.runtime.onMessage.removeListener(messageListener);
      } else if (message.action === 'streamComplete' && message.threadId === threadId) {
        // 处理流完成
        console.log('流结束');
        isWaitingForResponse = false;
        removeTypingIndicator();
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    // 通过background.js发送请求
    chrome.runtime.sendMessage({
      action: 'fetchDingtalkStreamAPI',
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-acs-dingtalk-access-token': accessToken,
        'Accept': 'text/event-stream'
      },
      body: {
        assistantId: assistantId  // 移除version参数
      },
      threadId: threadId  // 用于在接收响应时标识是哪个线程
    }, response => {
      if (!response || !response.success) {
        console.error('流式请求错误:', response ? response.error : '未知错误');
        isWaitingForResponse = false;
        removeTypingIndicator();
        showStatusMessage('获取回复失败');
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    });
    
    // 处理流数据
    function processStreamData(text) {
      // 按行处理数据
      const lines = text.split(/\r\n|\r|\n/);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        if (line.startsWith('event:')) {
          const eventType = line.substring(6).trim();
          // 查找下一行的data
          let dataLine = '';
          
          // 寻找下一个以data:开头的行
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].startsWith('data:')) {
              dataLine = lines[j].substring(5).trim();
              break;
            }
          }
          
          if (dataLine) {
            try {
              const eventData = JSON.parse(dataLine);
              handleEvent(eventType, eventData);
            } catch (error) {
              console.error('解析事件数据错误:', error, dataLine);
            }
          }
        }
      }
    }
    
    // 处理事件
    function handleEvent(eventType, data) {
      switch(eventType) {
        case 'thread.message.created':
          currentMessageId = data.messageId;
          break;
          
        case 'thread.message.delta':
          if (data.messageId === currentMessageId) {
            if (data.mode === 'overwrite') {
              // 覆盖模式
              currentResponseText = data.delta.text?.value || '';
              updateCurrentAssistantMessage(currentResponseText);
            } else if (data.mode === 'append') {
              // 增量模式
              currentResponseText += data.delta.text?.value || '';
              updateCurrentAssistantMessage(currentResponseText);
            }
          }
          break;
          
        case 'thread.run.completed':
          isWaitingForResponse = false;
          removeTypingIndicator();
          if (currentResponseText) {
            updateCurrentAssistantMessage(currentResponseText);
          }
          break;
      }
    }
  }
  
  // 显示状态消息
  function showStatusMessage(message) {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'message system-message';
    statusDiv.textContent = message;
    chatMessagesDiv.appendChild(statusDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    
    // 3秒后自动删除
    setTimeout(() => {
      statusDiv.remove();
    }, 3000);
  }
  
  // 添加消息到聊天界面
  function appendMessage(message, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    messageDiv.textContent = message;
    
    if (role === 'assistant') {
      messageDiv.dataset.assistantMessage = 'true';
    }
    
    chatMessagesDiv.appendChild(messageDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    return messageDiv;
  }
  
  // 更新当前助理消息
  function updateCurrentAssistantMessage(text) {
    let assistantMessageDiv = chatMessagesDiv.querySelector('.message[data-assistant-message="true"]');
    
    if (!assistantMessageDiv) {
      // 如果不存在，创建一个新的
      removeTypingIndicator();
      assistantMessageDiv = appendMessage(text, 'assistant');
    } else {
      // 更新现有消息
      assistantMessageDiv.textContent = text;
      chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }
  }
  
  // 显示输入指示器
  function showTypingIndicator() {
    removeTypingIndicator(); // 确保没有重复的指示器
    
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'typing-indicator';
    indicatorDiv.id = 'typingIndicator';
    
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      indicatorDiv.appendChild(dot);
    }
    
    chatMessagesDiv.appendChild(indicatorDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
  }
  
  // 移除输入指示器
  function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
  }
}); 