# Cursor自动化Manus研究报告系统

## 项目简介

本项目是一个基于 Cursor + MCP 的自动化研究报告生成系统。通过模拟 Manus 的工作方式，让用户能够通过简单的自然语言指令，自动生成专业的研究报告。所有的自动化任务约束都在 .cursorrules 中定义。

## 主要特点

- 完全自动化：只需一句话描述需求
- 智能分析：自动收集和处理相关数据
- 专业输出：生成结构化的研究报告
- 多维度分析：历史、现状、影响力等全方位研究
- 优雅展示：自动生成美观的网页报告

## 使用方法

1. 配置MCP
   - 打开 Cursor IDE
   - 进入 Cursor Settings（设置）
   - 找到 MCP 配置部分
   - 将项目中 `mcp.json` 内的配置项复制到对应的设置中
   - 确保所有需要的API密钥都已正确配置

2. 在Cursor中使用
   ```
   只需在Cursor Agent中输入类似的指令：
   "帮我做一下特朗普关税事件的研究报告"
   "请生成一份关于气候变化对全球经济影响的研究报告"
   ```

## 工作原理

系统通过以下组件协同工作：
- Cursor: 智能代码编辑和生成
- MCP: 多智能体协作系统
- .cursorrules: 定义了所有自动化任务的约束和规则
- 自动化工具链:
  - sequential_thinking: 智能任务规划
  - research_agent: 自动资料收集
  - firecrawl系列: 网络爬虫和数据处理

## 示例案例

在 demo/ 目录下包含多个自动生成的研究报告案例:

- demo/covid19-research/ : 新冠疫情影响研究报告
- demo/musk-family/ : 马斯克家族研究报告
- demo/donald-trump/ : 特朗普政治生涯研究报告

每个案例都包含:
- 完整的研究报告markdown文档
- 自动生成的网页展示
- 相关图片和多媒体资源

## 项目结构
```
├── .cursorrules/        # 自动化任务约束定义
├── demo/               # 示例案例
├── docs/               # 文档
├── mcp.json            # MCP配置示例
└── README.md           # 项目说明
```

## 注意事项

1. 本项目不需要安装Python或Node.js，仅需配置好mcp.json即可
2. 使用前请确保已获取所需的API密钥
3. 首次使用时请参考mcp.json.example进行配置

## 许可证

MIT License

