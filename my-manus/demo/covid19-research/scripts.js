document.addEventListener('DOMContentLoaded', function() {
    // 获取所有需要加载Markdown内容的元素
    const contentLoaders = document.querySelectorAll('.content-loader');

    // 为每个内容加载器加载并渲染Markdown
    contentLoaders.forEach(async function(loader) {
        try {
            // 获取Markdown文件路径
            const source = loader.getAttribute('data-source');
            if (!source) {
                throw new Error('未指定数据源路径');
            }

            // 加载Markdown文件
            const response = await fetch(source);
            if (!response.ok) {
                throw new Error(`HTTP错误：${response.status}`);
            }

            // 读取Markdown内容
            const markdown = await response.text();

            // 使用marked库将Markdown转换为HTML
            if (typeof marked === 'undefined') {
                throw new Error('marked库未加载');
            }

            // 配置marked选项
            marked.setOptions({
                gfm: true, // 启用GitHub风格的Markdown
                breaks: true, // 将换行符转换为<br>
                headerIds: true, // 为标题添加id
                mangle: false, // 不转义标题中的HTML
                sanitize: false // 允许HTML标签
            });

            // 渲染Markdown为HTML
            const html = marked.parse(markdown);
            loader.innerHTML = html;

            // 添加成功加载的类
            loader.classList.add('loaded');
        } catch (error) {
            console.error('加载Markdown内容时出错:', error);
            loader.innerHTML = `<p class="error">加载内容时出错: ${error.message}</p>`;
            loader.classList.add('error');
        }
    });
}); 