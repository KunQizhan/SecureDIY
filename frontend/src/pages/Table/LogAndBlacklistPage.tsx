// frontend/src/pages/Table/LogAndBlacklistPage.tsx

import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Input, DatePicker, Space, notification, message, ConfigProvider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RangePickerProps } from 'antd/es/date-picker';
import { useTranslation } from 'react-i18next';
import DashboardPage from '../Dashboard'; // 导入仪表盘组件
import zhCN from 'antd/es/locale/zh_CN';
import enUS from 'antd/es/locale/en_US';

const { RangePicker } = DatePicker;

// 日志条目类型
interface LogEntry {
  ip: string;
  path: string;
  time: string;
}

// 黑名单IP类型
interface BlacklistEntry {
  ip: string;
}

const LogAndBlacklistPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  // 根据当前语言选择合适的Ant Design语言包
  const antLocale = i18n.language === 'zh' ? zhCN : enUS;
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);

  // 筛选条件状态
  const [filterIP, setFilterIP] = useState<string>('');
  const [filterPath, setFilterPath] = useState<string>('');
  const [filterDateRange, setFilterDateRange] = useState<[string, string] | null>(null);

  // 组件挂载：加载数据、建立 WebSocket
  useEffect(() => {
    fetchLogs();
    fetchBlacklist();

    const socket = new WebSocket('ws://localhost:3001');
    socket.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'honeypotTriggered') {
        notification.warning({
          message: t('notifications.honeypotAlert'),
          description: t('notifications.honeypotDesc', { ip: msg.data.ip, path: msg.data.path }),
          duration: 5,
        });
      } else if (msg.type === 'blacklistAdded') {
        notification.info({
          message: t('notifications.blacklistUpdate'),
          description: t('notifications.blacklistAdded', { ip: msg.data.ip }),
          duration: 5,
        });
      } else if (msg.type === 'blacklistRemoved') {
        notification.info({
          message: t('notifications.blacklistUpdate'),
          description: t('notifications.blacklistRemoved', { ip: msg.data.ip }),
          duration: 5,
        });
      }
    };

    return () => { socket.close(); };
  }, [t]);

  // 获取蜜罐日志
  const fetchLogs = async (useFilter = false) => {
    let url = '/api/logs';
    if (useFilter) {
      const params: string[] = [];
      if (filterIP) params.push(`ip=${encodeURIComponent(filterIP)}`);
      if (filterPath) params.push(`type=${encodeURIComponent(filterPath)}`);
      if (filterDateRange) {
        const [start, end] = filterDateRange;
        params.push(`start=${new Date(start).getTime()}`);
        params.push(`end=${new Date(end).getTime()}`);
      }
      if (params.length) url += '?' + params.join('&');
    }
    try {
      const res = await fetch(url);
      const data: LogEntry[] = await res.json();
      setLogs(data);
    } catch {
      message.error(t('messages.logsFetchFailed'));
    }
  };

  // 获取黑名单列表
  const fetchBlacklist = async () => {
    try {
      const res = await fetch('/api/blacklist');
      const data: string[] = await res.json();
      setBlacklist(data.map(ip => ({ ip })));
    } catch {
      message.error(t('messages.blacklistFetchFailed'));
    }
  };

  const handleRefresh = () => {
    setFilterIP(''); setFilterPath(''); setFilterDateRange(null);
    fetchLogs(false);
    message.success(t('messages.logsRefreshed'));
  };

  const handleSearch = () => { fetchLogs(true); };

  const exportCSV = (rows: any[], headers: string[], title: string) => {
    let csv = headers.join(',') + '\n';
    rows.forEach(r => {
      csv += headers.map(h => r[h] as string).join(',') + '\n';
    });
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = title + '.csv';
    a.click();
  };

  const exportLogs = () => {
    if (!logs.length) return message.info(t('messages.noLogsToExport'));
    exportCSV(logs, ['ip','path','time'], t('export.logsTitle'));
  };

  const exportBlacklist = () => {
    if (!blacklist.length) return message.info(t('messages.noBlacklistToExport'));
    exportCSV(blacklist, ['ip'], t('export.blacklistTitle'));
  };

  const blockIP = async (ip: string) => {
    await fetch('/api/blacklist', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ ip })
    });
    setBlacklist(prev => [...prev, { ip }]);
    message.success(t('messages.ipBlocked', { ip }));
  };

  const unblockIP = async (ip: string) => {
    await fetch(`/api/blacklist/${ip}`, { method: 'DELETE' });
    setBlacklist(prev => prev.filter(item => item.ip !== ip));
    message.success(t('messages.ipUnblocked', { ip }));
  };

  const logColumns: ColumnsType<LogEntry> = [
    { title: t('columns.ip'), dataIndex:'ip', key:'ip' },
    { title: t('columns.path'), dataIndex:'path', key:'path' },
    { 
      title: t('columns.time'), dataIndex:'time', key:'time',
      render: t => new Date(t).toLocaleString('zh-CN',{hour12:false})
    },
    {
      title: t('columns.action'), key:'action',
      render: (_, r) => {
        const isBlocked = blacklist.some(b => b.ip === r.ip);
        return <Button disabled={isBlocked} danger onClick={()=>blockIP(r.ip)}>
          {isBlocked ? t('buttons.blocked') : t('buttons.block')}
        </Button>;
      }
    }
  ];

  const blkColumns: ColumnsType<BlacklistEntry> = [
    { title: t('columns.ip'), dataIndex:'ip', key:'ip' },
    {
      title: t('columns.action'), key:'action',
      render: (_, r) => <Button onClick={()=>unblockIP(r.ip)}>{t('buttons.unblock')}</Button>
    }
  ];

  const onRangeChange: RangePickerProps['onChange'] = (_, ds) => {
    if (ds[0]&&ds[1]) setFilterDateRange([ds[0]+' 00:00:00',ds[1]+' 23:59:59']);
    else setFilterDateRange(null);
  };

  // 定义选项卡内容
  const items = [
    {
      key: 'logs',
      label: t('tabs.honeypotLogs'),
      children: (
        <>
          <div style={{ marginBottom:16, display:'flex', justifyContent:'space-between' }}>
            <Button onClick={handleRefresh}>{t('buttons.refresh')}</Button>
            <Space>
              <Input placeholder={t('placeholders.ip')} value={filterIP} onChange={e=>setFilterIP(e.target.value)} />
              <Input placeholder={t('placeholders.path')} value={filterPath} onChange={e=>setFilterPath(e.target.value)} />
              <RangePicker onChange={onRangeChange} />
              <Button type="primary" onClick={handleSearch}>{t('buttons.search')}</Button>
              <Button onClick={exportLogs}>{t('buttons.export')}</Button>
            </Space>
          </div>
          <Table rowKey={r=>r.ip+r.time} columns={logColumns} dataSource={logs} />
        </>
      )
    },
    {
      key: 'blacklist',
      label: t('tabs.blockedIPs'),
      children: (
        <>
          <div style={{ textAlign:'right', marginBottom:16 }}>
            <Button onClick={exportBlacklist}>{t('buttons.export')}</Button>
          </div>
          <Table rowKey="ip" columns={blkColumns} dataSource={blacklist} />
        </>
      )
    },
    {
      key: 'dashboard',
      label: t('tabs.dashboard'),
      children: (
        <>
          {/* 仪表盘区，直接复用 DashboardPage */}
          <DashboardPage />
        </>
      )
    }
  ];

return (
  <div style={{ padding: 16 }}>
    <ConfigProvider locale={antLocale}>
      <Tabs defaultActiveKey="logs" items={items} />
      {/* 底部语言切换 */}
      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <span style={{ marginRight: 8 }}>
          {i18n.language === 'en' ? '语言' : 'Language'}:
        </span>
        <select
          value={i18n.language}
          onChange={e => i18n.changeLanguage(e.target.value)}
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </div>
    </ConfigProvider>
  </div>
);
};

export default LogAndBlacklistPage;
