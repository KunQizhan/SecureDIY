import React, { useEffect, useState } from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import enUS from 'antd/es/locale/en_US';
import { useTranslation } from 'react-i18next';
import LogAndBlacklistPage from './pages/Table/LogAndBlacklistPage';

// 定义日志条目类型
interface LogEntry {
  ip: string;
  path: string;
  time: string;
}

// API 基础URL（开发模式下前端运行在不同端口，需要指定后台服务的地址）
const API_BASE = 'http://localhost:3001';

const App: React.FC = () => {
  // 获取i18n实例以支持国际化
  const { t, i18n } = useTranslation();
  // 根据当前语言选择合适的Ant Design语言包
  const antLocale = i18n.language === 'zh' ? zhCN : enUS;

  // 状态：蜜罐日志列表 和 封锁IP列表
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<string[]>([]);

  // 从服务器获取日志列表
  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/logs`);
      const data: LogEntry[] = await res.json();
      setLogs(data);
    } catch (error) {
      console.error(t('errors.fetchLogsFailed'), error);
    }
  };

  // 从服务器获取封锁IP列表
  const fetchBlockedIPs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/blacklist`);
      const data: string[] = await res.json();
      setBlockedIPs(data);
    } catch (error) {
      console.error(t('errors.fetchBlockedIPsFailed'), error);
    }
  };

  // 组件初次加载时，获取初始数据
  useEffect(() => {
    fetchLogs();
    fetchBlockedIPs();
  }, []);

  // 封锁指定IP并更新状态
  const handleBlockIP = async (ip: string) => {
    try {
      await fetch(`${API_BASE}/api/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ip })
      });
      // 成功封锁后，更新封锁IP列表状态（重新获取或直接添加）
      // 简单起见，直接重新获取封锁列表以确保同步服务器状态
      fetchBlockedIPs();
    } catch (error) {
      console.error('封锁IP失败:', error);
    }
  };

  // 解封指定IP并更新状态
  const handleUnblockIP = async (ip: string) => {
    try {
      await fetch(`${API_BASE}/api/blacklist/${ip}`, {
        method: 'DELETE'
      });
      // 成功解封后，重新获取封锁IP列表
      fetchBlockedIPs();
    } catch (error) {
      console.error('解封IP失败:', error);
    }
  };

  return (
    <ConfigProvider locale={antLocale}>
      <div style={{ padding: '20px' }}>
        <LogAndBlacklistPage />
      </div>
    </ConfigProvider>
  );
}

export default App;
