// IP封锁名单数据结构
const blockedIPs = new Set();  // 用集合（Set）保存被封锁的IP地址，避免重复

// 本地主机地址集合，用于判断和避免封锁自身
const LOCAL_IPS = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1']);

// 检查一个IP是否属于本地主机
function isLocal(ip) {
  return LOCAL_IPS.has(ip);
}

// 检查一个IP是否已被封锁
function isBlocked(ip) {
  return blockedIPs.has(ip);
}

// 封锁指定IP地址
function blockIP(ip) {
  if (!isLocal(ip)) {
    blockedIPs.add(ip);
  }
  // 如果是本地IP，我们选择忽略而不添加。实际使用中可记录尝试封锁本地的行为或抛出错误。
}

// 解封指定IP地址
function unblockIP(ip) {
  blockedIPs.delete(ip);
  // 如果IP不在集合中，delete操作也不会报错
}

// 获取当前所有被封锁IP的列表（数组形式）
function getBlockedIPs() {
  return Array.from(blockedIPs);
}

module.exports = {
  isLocal,
  isBlocked,
  blockIP,
  unblockIP,
  getBlockedIPs
};
