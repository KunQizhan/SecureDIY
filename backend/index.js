// 引入所需模块
const express = require('express');
const http = require('http');
const cors = require('cors'); 
const WebSocket = require('ws');  // 使用 ws 模块实现 WebSocket（确保已通过 npm 安装 ws 模块）
const app = express();
// **允许所有源的跨域请求**
app.use(cors());
// 接收并解析 JSON
app.use(express.json());
// === 全局请求日志中间件（调试用） ===
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 请求: ${req.method} ${req.url} 来自IP=${req.ip}`);
  next();
});
// === 以上中间件请先确认请求都能进到这里 ===
app.use(express.json());  // 解析 JSON 请求体，方便处理 POST 数据

// 内存数据存储
const honeypotLogs = [];   // 蜜罐日志列表（每个元素是一个包含 ip、path、time 等属性的对象）
const blockedIPs = [];     // 封锁IP列表

// 中间件：检查封锁IP，如果请求源IP在黑名单，则直接返回 403 禁止访问
app.use((req, res, next) => {
  if (blockedIPs.includes(req.ip)) {
    return res.status(403).send('Forbidden');  // 已封锁的 IP，禁止访问
  }
  next();
});

// 配置多个蜜罐路由路径
const honeypotPaths = ['/admin', '/secret', '/hidden'];
app.get(honeypotPaths, (req, res) => {
  const now = new Date();
  const logEntry = {
    ip: req.ip,
    path: req.path,
    time: now.toISOString()
  };
  honeypotLogs.push(logEntry);

  // **新增：控制台打印日志，方便实时查看**
  console.log(`🔥 蜜罐触发：IP=${req.ip} 访问 ${req.path} 于 ${now.toLocaleString()}`);

  // **仍然广播给前端**
  broadcast({ type: 'honeypotTriggered', data: { ip: req.ip, path: req.path }});

  // 返回 404 迷惑“攻击者”
  res.status(404).end();
  });

// 获取蜜罐日志接口：支持按 IP、类型、时间范围筛选
app.get('/api/logs', (req, res) => {
  let { ip, type, start, end } = req.query;
  // 将查询参数转换格式（如果有提供时间范围则转换为数字时间戳）
  const startTime = start ? Number(start) : null;
  const endTime = end ? Number(end) : null;
  const typeFilter = type ? type.toLowerCase() : null;

  // 过滤日志
  const filteredLogs = honeypotLogs.filter(log => {
    // 提取日志项的各字段
    const logIP = log.ip || '';
    const logPath = log.path || '';
    const logType = log.type ? log.type.toLowerCase() : logPath.toLowerCase();  // 如果日志有 type，用 type，否则使用路径作为类型标识
    const logTime = new Date(log.time).getTime();  // 将日志时间转为时间戳进行比较（支持 Date 对象或字符串）
    // 根据查询参数逐一过滤
    if (ip && !logIP.includes(ip)) {
      return false; // IP筛选：请求IP不包含查询的ip子串则过滤掉
    }
    if (typeFilter && !logType.includes(typeFilter)) {
      return false; // 类型筛选：日志类型（或路径）不包含查询的type子串则过滤
    }
    if (startTime && logTime < startTime) {
      return false; // 起始时间筛选：日志时间早于起始时间，则过滤
    }
    if (endTime && logTime > endTime) {
      return false; // 截止时间筛选：日志时间晚于截止时间，则过滤
    }
    return true;  // 保留符合所有筛选条件的日志
  });
  res.json(filteredLogs);  // 返回筛选后的日志列表（JSON数组）
});

// 日志统计接口：按小时和按天汇总蜜罐触发次数，用于前端仪表盘可视化
app.get('/api/logs/stats', (req, res) => {
  const hourlyCounts = {};  // 按小时（具体到年月日小时）统计次数
  const dailyCounts = {};   // 按日期统计次数

  honeypotLogs.forEach(log => {
    const time = new Date(log.time);
    const hourKey = time.getFullYear() + '-' 
                  + String(time.getMonth()+1).padStart(2, '0') + '-' 
                  + String(time.getDate()).padStart(2, '0') + ' ' 
                  + String(time.getHours()).padStart(2, '0') + ':00'; 
    // hourKey 形如 "2025-05-19 14:00"，表示具体某天某小时（分钟固定为00）
    const dateKey = time.getFullYear() + '-' 
                  + String(time.getMonth()+1).padStart(2, '0') + '-' 
                  + String(time.getDate()).padStart(2, '0');
    // dateKey 形如 "2025-05-19"，表示具体日期

    // 统计小时频次
    hourlyCounts[hourKey] = (hourlyCounts[hourKey] || 0) + 1;
    // 统计每日频次
    dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
  });

  // 将统计结果转换为数组形式，便于前端图表使用
  const hourlyStats = Object.keys(hourlyCounts).sort().map(key => ({
    time: key,
    count: hourlyCounts[key]
  }));
  const dailyStats = Object.keys(dailyCounts).sort().map(key => ({
    date: key,
    count: dailyCounts[key]
  }));
  res.json({ hourly: hourlyStats, daily: dailyStats });
});

// 封锁IP列表接口：获取当前黑名单IP列表
app.get('/api/blacklist', (req, res) => {
  res.json(blockedIPs);
});

// 封锁指定IP接口：将一个IP加入黑名单
app.post('/api/blacklist', (req, res) => {
  const targetIP = req.body.ip;
  if (targetIP && !blockedIPs.includes(targetIP)) {
    blockedIPs.push(targetIP);  // 添加到内存黑名单列表
    broadcast({                 // 通过 WebSocket 通知前端黑名单更新
      type: 'blacklistAdded',
      data: { ip: targetIP }
    });
  }
  res.json({ success: true });
});

// 解封指定IP接口：从黑名单移除
app.delete('/api/blacklist/:ip', (req, res) => {
  const targetIP = req.params.ip;
  const index = blockedIPs.indexOf(targetIP);
  if (index !== -1) {
    blockedIPs.splice(index, 1);  // 从列表移除该IP
    broadcast({                   // 通知前端黑名单更新（移除）
      type: 'blacklistRemoved',
      data: { ip: targetIP }
    });
  }
  res.json({ success: true });
});

// 启动 HTTP 服务器并附加 WebSocket 服务器
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });  // 基于同一服务器开启 WebSocket 服务

// WebSocket连接建立时的处理
wss.on('connection', (ws, request) => {
  console.log('WebSocket 客户端已连接');
  // 如有需要，可以在这里发送初始化消息给客户端，例如当前黑名单或日志摘要等
  // ws.send(JSON.stringify({ type: 'init', data: { logsCount: honeypotLogs.length } }));
});

// 广播函数：将消息发送给所有已连接的 WebSocket 客户端
function broadcast(messageObject) {
  const messageData = JSON.stringify(messageObject);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageData);
    }
  });
}

// 启动服务器
const PORT = 3001;  // 后端服务端口（确保与前端通信的端口一致）
server.listen(PORT, () => {
  console.log(`服务器已启动，监听端口 ${PORT}`);
});
