// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchDingtalkToken') {
    const { clientId, clientSecret } = request;
    const url = `https://oapi.dingtalk.com/gettoken?appkey=${encodeURIComponent(clientId)}&appsecret=${encodeURIComponent(clientSecret)}`;
    
    // 在后台脚本中发送请求，没有CORS限制
    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      sendResponse({ success: true, data });
    })
    .catch(error => {
      console.error('获取访问令牌错误:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    // 返回true表示将异步发送响应
    return true;
  }
  
  // 处理流式响应请求
  if (request.action === 'fetchDingtalkStreamAPI') {
    const { url, method, headers, body } = request;
    
    fetch(url, {
      method: method || 'POST',
      headers: headers || {},
      body: body ? JSON.stringify(body) : undefined
    })
    .then(response => {
      if (!response.ok) {
        sendResponse({
          success: false,
          error: `HTTP错误，状态码: ${response.status}`,
          status: response.status
        });
        return;
      }
      
      // 通知popup请求成功，可以开始接收数据
      sendResponse({ success: true, message: 'Stream connection established' });
      
      // 创建一个读取器来处理流数据
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // 持续读取流数据并发送到popup
      function readStream() {
        reader.read().then(({ done, value }) => {
          if (done) {
            console.log('Stream completed');
            chrome.runtime.sendMessage({
              action: 'streamComplete',
              threadId: request.threadId
            });
            return;
          }
          
          // 解码二进制数据为文本
          const text = decoder.decode(value, { stream: true });
          
          // 发送数据到popup
          chrome.runtime.sendMessage({
            action: 'streamData',
            threadId: request.threadId,
            data: text
          });
          
          // 继续读取
          readStream();
        }).catch(error => {
          console.error('流读取错误:', error);
          chrome.runtime.sendMessage({
            action: 'streamError',
            threadId: request.threadId,
            error: error.message
          });
        });
      }
      
      // 开始读取流
      readStream();
    })
    .catch(error => {
      console.error('流式请求错误:', error);
      sendResponse({ 
        success: false, 
        error: error.message || '未知错误'
      });
    });
    
    return true;
  }
  
  // 处理其他API请求
  if (request.action === 'fetchDingtalkAPI') {
    const { url, method, headers, body } = request;
    
    // 处理请求头，确保包含必要参数
    let finalHeaders = {
      ...headers,
      'Content-Type': 'application/json'
    };
    
    // 如果URL是创建线程相关的API，添加版本参数
    let finalBody = body;
    if (url.includes('/assistant/threads') && !url.includes('/messages') && !url.includes('/runs')) {
      // 移除version参数，可能是不需要或格式不正确
      // 仅使用原始请求体中的参数
      finalBody = { ...finalBody };
      
      // 确保包含关键参数
      console.log('创建线程请求体:', JSON.stringify(finalBody, null, 2));
    }
    
    fetch(url, {
      method: method || 'GET',
      headers: finalHeaders,
      body: finalBody ? JSON.stringify(finalBody) : undefined
    })
    .then(response => {
      // 检查响应状态
      if (!response.ok) {
        // 对于非2xx响应，尝试解析错误信息
        return response.json().then(errorData => {
          // 将错误信息和HTTP状态码一起返回
          return Promise.reject({
            status: response.status,
            errorData: errorData
          });
        }).catch(e => {
          // 如果解析JSON失败，则返回原始状态错误
          return Promise.reject({
            status: response.status,
            message: response.statusText
          });
        });
      }
      return response.json();
    })
    .then(data => {
      sendResponse({ success: true, data });
    })
    .catch(error => {
      console.error('钉钉API请求错误:', error);
      // 返回详细的错误信息
      sendResponse({ 
        success: false, 
        error: error.errorData || error.message || '未知错误',
        status: error.status
      });
    });
    
    return true;
  }
}); 