// 蜜罐日志数据存储
const honeypotLogs = [];  // 使用数组存储日志条目，每个条目是一个对象，包含IP、路径和时间

// 添加日志条目函数
function addLog(ip, path) {
  const logEntry = {
    ip: ip,                    // 攻击者IP地址
    path: path,                // 访问的路径（如蜜罐路由，如 /admin）
    time: new Date().toLocaleString('zh-CN', { hour12: false })  // 记录事件发生的时间（使用本地时间格式）
  };
  honeypotLogs.push(logEntry);
  console.log(`记录蜜罐访问日志: ${ip} 尝试访问 ${path} 于 ${logEntry.time}`);
}

// 获取所有日志条目函数
function getLogs() {
  // 返回日志数组的副本（避免外部直接修改原数组）
  return honeypotLogs.slice().sort((a, b) => new Date(b.time) - new Date(a.time));
  // 上面通过 sort 按时间逆序排列日志（最近的在前）。如果希望按加入顺序，可以直接 return honeypotLogs.slice()。
}

module.exports = {
  addLog,
  getLogs
};
