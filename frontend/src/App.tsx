import React, { useEffect, useState } from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import HoneypotLogsPage from './pages/HoneypotLogs';
import BlockedIPsPage from './pages/BlockedIPs';
import LogAndBlacklistPage from './pages/Table/LogAndBlacklistPage';
import DashboardPage from './pages/Dashboard';
const { TabPane } = Tabs;


// 定义日志条目类型
interface LogEntry {
  ip: string;
  path: string;
  time: string;
}

// 定义Tabs的键，以便避免硬编码字符串
const TAB_KEY_LOGS = 'logs';
const TAB_KEY_BLOCKED = 'blocked';

// API 基础URL（开发模式下前端运行在不同端口，需要指定后台服务的地址）
const API_BASE = 'http://localhost:3001';

const App: React.FC = () => {
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
      console.error('获取日志失败:', error);
    }
  };

  // 从服务器获取封锁IP列表
  const fetchBlockedIPs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/blocked`);
      const data: string[] = await res.json();
      setBlockedIPs(data);
    } catch (error) {
      console.error('获取封锁IP列表失败:', error);
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
      await fetch(`${API_BASE}/api/block`, {
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
      await fetch(`${API_BASE}/api/unblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ip })
      });
      // 成功解封后，重新获取封锁IP列表
      fetchBlockedIPs();
    } catch (error) {
      console.error('解封IP失败:', error);
    }
  };

  // 定义选项卡内容
  const tabs: TabsProps['items'] = [
    {
      key: TAB_KEY_LOGS,
      label: '蜜罐日志',
      children: (
        <HoneypotLogsPage 
          logs={logs} 
          blockedIPs={blockedIPs} 
          onBlock={handleBlockIP} 
          onRefresh={() => {
            fetchLogs();
            fetchBlockedIPs();
          }} 
        />
      )
    },
    {
      key: TAB_KEY_BLOCKED,
      label: '封锁IP',
      children: (
        <BlockedIPsPage 
          blockedIPs={blockedIPs} 
          onUnblock={handleUnblockIP} 
          onRefresh={() => fetchBlockedIPs()} 
        />
      )
    }
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* Ant Design的选项卡组件Tabs，用于在日志页和封锁IP页之间切换 */}
      <Tabs defaultActiveKey={TAB_KEY_LOGS} items={tabs} />
      <Tabs defaultActiveKey="logs">
        <TabPane tab="蜜罐日志 / 封锁IP" key="logs">
+          <LogAndBlacklistPage />
        </TabPane>
        <TabPane tab="仪表盘" key="dashboard">
          <DashboardPage />
        </TabPane>
      </Tabs>
     </div>
   );
 }

export default App;
