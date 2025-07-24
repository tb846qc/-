const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理根路径
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // 处理DPF文档请求
  if (pathname === '/dpf' || pathname === '/DPF') {
    const dpfPath = path.join(__dirname, 'DPF.md');
    fs.readFile(dpfPath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('DPF文档未找到');
        return;
      }
      
      // 返回Markdown格式的DPF文档
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  
  // 处理DPF HTML预览
  if (pathname === '/dpf-preview') {
    const dpfPath = path.join(__dirname, 'DPF.md');
    fs.readFile(dpfPath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>DPF文档未找到</h1>');
        return;
      }
      
      // 简单的Markdown到HTML转换（基础版本）
      let html = data
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
      
      const fullHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DPF部署文档</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1, h2, h3, h4 { color: #333; margin-top: 30px; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #eee; padding-bottom: 5px; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f8f8f8; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .nav { background: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎮 FHEVM机密游戏系统 - 部署文档</h1>
        <p>访问地址: <strong>http://localhost:${PORT}/dpf-preview</strong></p>
    </div>
    <div class="nav">
        <strong>快速导航:</strong>
        <a href="#">原始文档</a> | 
        <a href="/dpf">下载DPF.md</a> | 
        <a href="/">返回首页</a>
    </div>
    <div class="content">
        ${html}
    </div>
</body>
</html>`;
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fullHtml);
    });
    return;
  }
  
  // 处理静态文件
  const filePath = path.join(__dirname, pathname === '/' ? 'public/index.html' : pathname);
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>FHEVM游戏系统 - 文档服务器</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center; }
        .container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
        .links { margin: 30px 0; }
        .links a { display: inline-block; margin: 10px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        .links a:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 FHEVM机密游戏系统</h1>
        <h2>文档服务器</h2>
        <p>欢迎访问FHEVM机密游戏系统文档服务器</p>
        
        <div class="links">
            <a href="/dpf-preview">📖 查看DPF部署文档</a>
            <a href="/dpf">📥 下载DPF.md文件</a>
        </div>
        
        <p><strong>DPF文档访问地址:</strong></p>
        <p><code>http://localhost:${PORT}/dpf-preview</code></p>
        <p><code>http://localhost:${PORT}/dpf</code></p>
        
        <hr>
        <p><small>服务器运行在端口 ${PORT}</small></p>
    </div>
</body>
</html>`);
      return;
    }
    
    // 设置正确的Content-Type
    const ext = path.extname(filePath);
    let contentType = 'text/html; charset=utf-8';
    
    switch (ext) {
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
        contentType = 'image/jpg';
        break;
      case '.md':
        contentType = 'text/plain; charset=utf-8';
        break;
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 DPF文档服务器已启动!`);
  console.log(`📖 DPF文档预览: http://localhost:${PORT}/dpf-preview`);
  console.log(`📥 DPF文档下载: http://localhost:${PORT}/dpf`);
  console.log(`🏠 服务器首页: http://localhost:${PORT}`);
  console.log(`\n按 Ctrl+C 停止服务器`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 服务器正在关闭...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});