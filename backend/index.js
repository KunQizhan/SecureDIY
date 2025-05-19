// 引入所需的模块
const express = require('express');
const cors = require('cors');
const logs = require('./logs');         // 导入日志管理模块
const blocklist = require('./blocklist'); // 导入IP封锁管理模块

const app = express();
const PORT = 5000;  // 定义服务器端口号，可以根据需要修改

// 使用中间件
app.use(cors());            // 启用CORS，允许来自所有来源的请求（为方便演示，开发环境下开放）
app.use(express.json());    // 内置中间件，用于解析JSON请求体

// 全局中间件：拦截封锁的IP地址
app.use((req, res, next) => {
  // 如果请求来源IP在封锁名单中，并且不是本地主机IP，则直接拒绝请求
  if (blocklist.isBlocked(req.ip) && !blocklist.isLocal(req.ip)) {
    // 返回403 Forbidden状态，表示拒绝访问
    return res.status(403).send('Forbidden');
  }
  next(); // 否则继续处理请求
});

// 蜜罐路由：假设攻击者可能尝试访问系统的 /admin 后台路径
app.get('/admin', (req, res) => {
  // 记录蜜罐日志：包括IP、访问路径和时间
  logs.addLog(req.ip, req.originalUrl);
  // （可选）这里可以选择是否自动封锁该IP。当前策略是不自动封锁，由管理员手动决定。
  // blocklist.blockIP(req.ip);  // 如果想在蜜罐触发时自动封锁IP，可取消此注释（但注意不要封锁本地IP）
  
  // 返回一个假的管理页面响应或错误信息
  res.status(403).send('<h3>禁止访问 (Forbidden)</h3>');
  // 提示：我们用403状态迷惑攻击者，让其以为该路径存在但无权限。
  // 在真实蜜罐中，可以返回一个伪造的登录页面HTML，引诱攻击者进一步行动。
});

// 获取蜜罐日志列表的API
app.get('/api/logs', (req, res) => {
  // 从日志模块获取所有日志条目数组
  const allLogs = logs.getLogs();
  res.json(allLogs);
});

// 获取已封锁IP列表的API
app.get('/api/blocked', (req, res) => {
  const blockedIPs = blocklist.getBlockedIPs();
  res.json(blockedIPs);
});

// 封锁指定IP的API（通过请求体提交要封锁的IP）
app.post('/api/block', (req, res) => {
  const ipToBlock = req.body.ip;
  if (!ipToBlock) {
    return res.status(400).json({ error: '缺少IP参数' });
  }
  // 如果尝试封锁本地IP，为避免管理员把自己锁出去，直接返回错误
  if (blocklist.isLocal(ipToBlock)) {
    return res.status(400).json({ error: '不能封锁本机IP地址' });
  }
  blocklist.blockIP(ipToBlock);
  console.log(`IP地址已加入黑名单: ${ipToBlock}`);
  return res.json({ success: true });
});

// 解封指定IP的API（通过请求体提交要解封的IP）
app.post('/api/unblock', (req, res) => {
  const ipToUnblock = req.body.ip;
  if (!ipToUnblock) {
    return res.status(400).json({ error: '缺少IP参数' });
  }
  blocklist.unblockIP(ipToUnblock);
  console.log(`IP地址已从黑名单移除: ${ipToUnblock}`);
  return res.json({ success: true });
});

// 启动Express服务器
app.listen(PORT, () => {
  console.log(`SecureDIY后端服务器已启动，监听端口 ${PORT}`);
});
