const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

// 简单的Markdown到HTML转换函数
function markdownToHtml(markdown) {
  let html = markdown
    // 标题转换
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
    .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
    
    // 粗体和斜体
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // 代码块
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    
    // 链接
    .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>')
    
    // 列表
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/^\+ (.*$)/gim, '<li>$1</li>')
    
    // 换行
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
    
  // 包装段落
  html = '<p>' + html + '</p>';
  
  // 处理列表
  html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
  
  return html;
}

// 生成PDF样式的HTML
function generatePdfHtml(content) {
  const htmlContent = markdownToHtml(content);
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FHEVM机密游戏系统 - 部署文档 (DPF)</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        
        body {
            font-family: 'Microsoft YaHei', 'SimSun', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 100%;
            margin: 0;
            padding: 0;
            font-size: 12pt;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 24pt;
            margin-bottom: 12pt;
            page-break-after: avoid;
        }
        
        h1 {
            font-size: 24pt;
            border-bottom: 3px solid #3498db;
            padding-bottom: 8pt;
            text-align: center;
            margin-bottom: 30pt;
        }
        
        h2 {
            font-size: 18pt;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 6pt;
            margin-top: 30pt;
        }
        
        h3 {
            font-size: 16pt;
            color: #34495e;
        }
        
        h4 {
            font-size: 14pt;
            color: #7f8c8d;
        }
        
        p {
            margin-bottom: 12pt;
            text-align: justify;
        }
        
        code {
            background-color: #f8f9fa;
            padding: 2pt 4pt;
            border-radius: 3pt;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 10pt;
            border: 1px solid #e9ecef;
        }
        
        pre {
            background-color: #f8f9fa;
            padding: 12pt;
            border-radius: 6pt;
            border: 1px solid #e9ecef;
            overflow-x: auto;
            margin: 12pt 0;
            page-break-inside: avoid;
        }
        
        pre code {
            background: none;
            padding: 0;
            border: none;
            font-size: 9pt;
        }
        
        ul, ol {
            margin: 12pt 0;
            padding-left: 24pt;
        }
        
        li {
            margin-bottom: 6pt;
        }
        
        strong {
            color: #2c3e50;
            font-weight: bold;
        }
        
        em {
            color: #7f8c8d;
            font-style: italic;
        }
        
        a {
            color: #3498db;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40pt;
            border-bottom: 2px solid #3498db;
            padding-bottom: 20pt;
        }
        
        .footer {
            margin-top: 40pt;
            padding-top: 20pt;
            border-top: 1px solid #ecf0f1;
            text-align: center;
            font-size: 10pt;
            color: #7f8c8d;
        }
        
        .toc {
            background-color: #f8f9fa;
            padding: 20pt;
            border-radius: 6pt;
            margin: 20pt 0;
            border: 1px solid #e9ecef;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        @media print {
            body {
                font-size: 11pt;
            }
            
            .no-print {
                display: none;
            }
            
            a {
                color: #000 !important;
                text-decoration: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎮 FHEVM机密游戏系统</h1>
        <h2>部署文档 (DPF)</h2>
        <p><strong>文档版本:</strong> 1.0 | <strong>生成时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
    </div>
    
    <div class="content">
        ${htmlContent}
    </div>
    
    <div class="footer">
        <p>© 2024 FHEVM Gaming Team | 机密游戏系统部署文档</p>
        <p>本文档包含项目部署、配置和维护的完整指南</p>
    </div>
    
    <script class="no-print">
        // 自动打印功能
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 1000);
        };
    </script>
</body>
</html>`;
}

// 创建PDF转换服务器
const PORT = 3001;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (pathname === '/pdf' || pathname === '/') {
    // 读取DPF.md文件
    const dpfPath = path.join(__dirname, 'DPF.md');
    
    fs.readFile(dpfPath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>错误 - DPF文档未找到</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
        .error { color: #e74c3c; }
    </style>
</head>
<body>
    <h1 class="error">❌ 错误</h1>
    <p>无法找到DPF.md文档文件</p>
    <p>请确保文件存在于项目根目录</p>
</body>
</html>`);
        return;
      }
      
      // 生成PDF格式的HTML
      const pdfHtml = generatePdfHtml(data);
      
      res.writeHead(200, { 
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline; filename="DPF-部署文档.html"'
      });
      res.end(pdfHtml);
    });
    
  } else {
    // 404页面
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PDF转换服务</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center; }
        .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
        .links { margin: 30px 0; }
        .links a { display: inline-block; margin: 10px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        .links a:hover { background: #0056b3; }
        .instructions { text-align: left; background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📄 DPF文档PDF转换服务</h1>
        <p>将DPF.md文档转换为可打印的PDF格式</p>
        
        <div class="links">
            <a href="/pdf">🖨️ 生成PDF版本</a>
        </div>
        
        <div class="instructions">
            <h3>📋 使用说明：</h3>
            <ol>
                <li>点击上方"生成PDF版本"按钮</li>
                <li>页面将自动打开打印预览</li>
                <li>在打印对话框中选择"另存为PDF"</li>
                <li>选择保存位置并命名文件</li>
                <li>点击保存完成PDF生成</li>
            </ol>
            
            <h3>💡 提示：</h3>
            <ul>
                <li>建议使用Chrome或Edge浏览器获得最佳效果</li>
                <li>PDF将包含完整的DPF文档内容和格式</li>
                <li>支持A4纸张大小，适合打印和分享</li>
            </ul>
        </div>
        
        <p><strong>PDF转换服务运行在:</strong> http://localhost:${PORT}</p>
    </div>
</body>
</html>`);
  }
});

server.listen(PORT, () => {
  console.log(`\n📄 PDF转换服务已启动!`);
  console.log(`🖨️  PDF生成地址: http://localhost:${PORT}/pdf`);
  console.log(`🏠 服务器首页: http://localhost:${PORT}`);
  console.log(`\n使用说明:`);
  console.log(`1. 访问 http://localhost:${PORT}/pdf`);
  console.log(`2. 页面会自动打开打印预览`);
  console.log(`3. 在打印对话框选择"另存为PDF"`);
  console.log(`4. 保存PDF文件到本地`);
  console.log(`\n按 Ctrl+C 停止服务器`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 PDF转换服务正在关闭...');
  server.close(() => {
    console.log('✅ PDF转换服务已关闭');
    process.exit(0);
  });
});