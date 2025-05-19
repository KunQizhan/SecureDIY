// frontend/src/pages/Table/LogAndBlacklistPage.tsx

import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Input, DatePicker, Space, notification, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RangePickerProps } from 'antd/es/date-picker';

const { TabPane } = Tabs;
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
          message: '蜜罐触发警报',
          description: `IP ${msg.data.ip} 触发路径 ${msg.data.path}`,
          duration: 5,
        });
      } else if (msg.type === 'blacklistAdded') {
        notification.info({
          message: '黑名单更新',
          description: `IP ${msg.data.ip} 已封锁`,
          duration: 5,
        });
      } else if (msg.type === 'blacklistRemoved') {
        notification.info({
          message: '黑名单更新',
          description: `IP ${msg.data.ip} 已解封`,
          duration: 5,
        });
      }
    };

    return () => { socket.close(); };
  }, []);

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
      message.error('获取日志失败');
    }
  };

  // 获取黑名单列表
  const fetchBlacklist = async () => {
    try {
      const res = await fetch('/api/blacklist');
      const data: string[] = await res.json();
      setBlacklist(data.map(ip => ({ ip })));
    } catch {
      message.error('获取黑名单失败');
    }
  };

  const handleRefresh = () => {
    setFilterIP(''); setFilterPath(''); setFilterDateRange(null);
    fetchLogs(false);
    message.success('日志已刷新');
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
    if (!logs.length) return message.info('无日志可导出');
    exportCSV(logs, ['ip','path','time'], '蜜罐日志');
  };

  const exportBlacklist = () => {
    if (!blacklist.length) return message.info('无封锁数据可导出');
    exportCSV(blacklist, ['ip'], '封锁IP列表');
  };

  const blockIP = async (ip: string) => {
    await fetch('/api/blacklist', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ ip })
    });
    setBlacklist(prev => [...prev, { ip }]);
    message.success(`封锁 ${ip}`);
  };

  const unblockIP = async (ip: string) => {
    await fetch(`/api/blacklist/${ip}`, { method: 'DELETE' });
    setBlacklist(prev => prev.filter(item => item.ip !== ip));
    message.success(`解封 ${ip}`);
  };

  const logColumns: ColumnsType<LogEntry> = [
    { title:'IP地址', dataIndex:'ip', key:'ip' },
    { title:'触发路径', dataIndex:'path', key:'path' },
    { 
      title:'时间', dataIndex:'time', key:'time',
      render: t => new Date(t).toLocaleString('zh-CN',{hour12:false})
    },
    {
      title:'操作', key:'action',
      render: (_, r) => {
        const isBlocked = blacklist.some(b => b.ip === r.ip);
        return <Button disabled={isBlocked} danger onClick={()=>blockIP(r.ip)}>
          {isBlocked?'已封锁':'封锁IP'}
        </Button>;
      }
    }
  ];

  const blkColumns: ColumnsType<BlacklistEntry> = [
    { title:'IP地址', dataIndex:'ip', key:'ip' },
    {
      title:'操作', key:'action',
      render: (_, r) => <Button onClick={()=>unblockIP(r.ip)}>解除封锁</Button>
    }
  ];

  const onRangeChange: RangePickerProps['onChange'] = (_, ds) => {
    if (ds[0]&&ds[1]) setFilterDateRange([ds[0]+' 00:00:00',ds[1]+' 23:59:59']);
    else setFilterDateRange(null);
  };

  return (
    <div>
      <Tabs defaultActiveKey="logs">
        <TabPane tab="蜜罐日志" key="logs">
          <div style={{ marginBottom:16, display:'flex', justifyContent:'space-between' }}>
            <Button onClick={handleRefresh}>刷新日志</Button>
            <Space>
              <Input placeholder="按IP" value={filterIP} onChange={e=>setFilterIP(e.target.value)} />
              <Input placeholder="按路径" value={filterPath} onChange={e=>setFilterPath(e.target.value)} />
              <RangePicker onChange={onRangeChange} />
              <Button type="primary" onClick={handleSearch}>搜索</Button>
              <Button onClick={exportLogs}>导出 CSV</Button>
            </Space>
          </div>
          <Table rowKey={r=>r.ip+r.time} columns={logColumns} dataSource={logs} />
        </TabPane>
        <TabPane tab="封锁IP" key="blacklist">
          <div style={{ textAlign:'right', marginBottom:16 }}>
            <Button onClick={exportBlacklist}>导出 CSV</Button>
          </div>
          <Table rowKey="ip" columns={blkColumns} dataSource={blacklist} />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default LogAndBlacklistPage;
