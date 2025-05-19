import React from 'react';
import { Table, Button } from 'antd';

interface BlockedIPsPageProps {
  blockedIPs: string[];            // 当前已封锁的IP列表
  onUnblock: (ip: string) => void; // 解封指定IP的回调函数
  onRefresh: () => void;           // 刷新封锁列表的回调函数
}

interface BlockRecord {
  ip: string;
}

const BlockedIPsPage: React.FC<BlockedIPsPageProps> = ({ blockedIPs, onUnblock, onRefresh }) => {
  // 将 blockedIPs 字符串数组转换为对象数组，以便用于 Table 数据源
  const dataSource: BlockRecord[] = blockedIPs.map(ip => ({ ip }));

  // 定义表格列配置
  const columns = [
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: BlockRecord) => (
        <Button size="small" danger onClick={() => onUnblock(record.ip)}>解封</Button>
      )
      // 使用 Ant Design 的 danger 属性，将按钮显示为红色，用于警示操作（解封）
    }
  ];

  return (
    <div>
      {/* 刷新按钮 */}
      <Button onClick={onRefresh} style={{ marginBottom: 8 }}>刷新封锁列表</Button>
      {/* 封锁IP表格 */}
      <Table<BlockRecord>
        columns={columns}
        dataSource={dataSource}
        rowKey={(record) => record.ip}
        pagination={false}
        bordered
      />
      {/* 提示：实际应用中，可考虑增加确认操作，比如解封前弹出确认框，这里为简单直接操作 */}
    </div>
  );
};

export default BlockedIPsPage;
