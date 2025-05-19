import React from 'react';
import { Table, Button } from 'antd';

interface LogEntry {
  ip: string;
  path: string;
  time: string;
}

interface HoneypotLogsPageProps {
  logs: LogEntry[];              // 蜜罐日志列表数据
  blockedIPs: string[];          // 当前已封锁的IP列表
  onBlock: (ip: string) => void; // 封锁指定IP的回调函数
  onRefresh: () => void;         // 刷新日志列表的回调函数
}

const HoneypotLogsPage: React.FC<HoneypotLogsPageProps> = ({ logs, blockedIPs, onBlock, onRefresh }) => {
  // 定义表格列配置
  const columns = [
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip'
    },
    {
      title: '触发路径',
      dataIndex: 'path',
      key: 'path',
      render: (text: string) => <span>{text}</span>
      // 简单展示文本。可以根据需要添加样式或截断长路径
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time'
      // 时间字符串可直接显示。如果需要特殊格式，可以在这里格式化。
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: LogEntry) => {
        const ip = record.ip;
        // 判断该记录的IP是否为本机IP（避免封锁自身）
        const isLocal = ip === '::1' || ip.endsWith('127.0.0.1');
        // 判断该IP是否已被封锁
        const isBlocked = blockedIPs.includes(ip);
        if (isLocal) {
          // 本地IP的日志，不提供封锁操作
          return <span style={{ color: '#aaa' }}>本机</span>;
        } else if (isBlocked) {
          // 如果已封锁，则显示已封锁状态
          return <span style={{ color: 'red' }}>已封锁</span>;
        } else {
          // 未封锁的IP提供封锁按钮
          return <Button size="small" type="primary" onClick={() => onBlock(ip)}>封锁</Button>;
        }
      }
    }
  ];

  return (
    <div>
      {/* 刷新按钮 */}
      <Button onClick={onRefresh} style={{ marginBottom: 8 }}>刷新日志</Button>
      {/* 日志表格 */}
      <Table<LogEntry>
        columns={columns}
        dataSource={logs}
        rowKey={(record) => record.ip + record.time}  /* 使用IP加时间作为唯一键 */
        pagination={false}
        bordered
      />
      {/* 提示：可以根据需要添加分页器（pagination）或滚动条等 */}
    </div>
  );
};

export default HoneypotLogsPage;
