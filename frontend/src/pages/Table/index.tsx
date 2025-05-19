import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Input, DatePicker, Space, notification, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RangePickerProps } from 'antd/es/date-picker';

// 定义日志和封锁IP的数据结构接口
interface LogEntry {
  ip: string;
  path: string;
  time: string;   // 时间可以为ISO字符串
  // type?: string; // 如有类型字段可加入
}
interface BlacklistEntry {
  ip: string;
}

// Ant Design 组件
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const LogAndBlacklistPage: React.FC = () => {
  // 状态钩子：存储蜜罐日志列表和封锁IP列表
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  // 筛选条件的状态
  const [filterIP, setFilterIP] = useState<string>('');                 // IP筛选输入
  const [filterPath, setFilterPath] = useState<string>('');             // 类型/路径筛选输入
  const [filterDateRange, setFilterDateRange] = useState<[string, string] | null>(null);  // 时间范围筛选（保存为 [startISO, endISO]）

  // 组件挂载时：加载初始数据并建立 WebSocket 连接
  useEffect(() => {
    fetchLogs();       // 获取所有蜜罐日志
    fetchBlacklist();  // 获取封锁IP列表

    // 建立 WebSocket 连接，用于接收实时通知
    const socket = new WebSocket('ws://localhost:3001');  // 注意使用后端 WebSocket 服务的地址和端口
    socket.onmessage = event => {
      // 收到服务器推送的消息
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'honeypotTriggered') {
          const { ip, path } = msg.data;
          // 弹出通知提示新的蜜罐触发
          notification.warning({
            message: '蜜罐触发警报',
            description: `IP ${ip} 触发了蜜罐路径 ${path}`,
            duration: 5
          });
          // （提示后，用户可点击“刷新日志”按钮手动获取最新日志记录）
        } else if (msg.type === 'blacklistAdded') {
          const { ip } = msg.data;
          notification.info({
            message: '黑名单更新',
            description: `IP ${ip} 已被加入封锁列表`,
            duration: 5
          });
          // （提示后可让用户切换到封锁IP页查看，或手动刷新以获取更新）
        } else if (msg.type === 'blacklistRemoved') {
          const { ip } = msg.data;
          notification.info({
            message: '黑名单更新',
            description: `IP ${ip} 已从封锁列表移除`,
            duration: 5
          });
        }
      } catch (e) {
        console.error('无法解析 WebSocket 消息', e);
      }
    };
    socket.onopen = () => {
      console.log('WebSocket 已连接');
    };
    socket.onerror = (e) => {
      console.error('WebSocket 连接出错：', e);
    };
    socket.onclose = () => {
      console.log('WebSocket 已关闭');
    };

    // 组件卸载时，关闭 WebSocket 连接
    return () => {
      socket.close();
    };
  }, []);

  // 从后端获取蜜罐日志列表（根据当前筛选条件）
  const fetchLogs = async (useFilter: boolean = false) => {
    try {
      let url = '/api/logs';
      if (useFilter) {
        // 构造带查询参数的 URL，实现筛选功能
        const params: string[] = [];
        if (filterIP) {
          params.push(`ip=${encodeURIComponent(filterIP)}`);
        }
        if (filterPath) {
          params.push(`type=${encodeURIComponent(filterPath)}`);
        }
        if (filterDateRange) {
          const [startISO, endISO] = filterDateRange;
          // 将 ISO 日期时间转为时间戳，传递给后端 (Number 类型的毫秒值)
          const startTime = new Date(startISO).getTime();
          const endTime = new Date(endISO).getTime();
          params.push(`start=${startTime}`);
          params.push(`end=${endTime}`);
        }
        if (params.length > 0) {
          url += '?' + params.join('&');
        }
      }
      const res = await fetch(url);
      const data: LogEntry[] = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('获取日志失败', err);
    }
  };

  // 从后端获取封锁IP列表
  const fetchBlacklist = async () => {
    try {
      const res = await fetch('/api/blacklist');
      const data: string[] = await res.json();
      // 后端返回的黑名单是 IP 字符串数组，这里转换为 { ip } 对象列表以用于表格渲染
      const list = data.map(ip => ({ ip }));
      setBlacklist(list);
    } catch (err) {
      console.error('获取黑名单失败', err);
    }
  };

  // 点击“搜索”按钮，按当前筛选条件加载日志
  const handleSearch = () => {
    fetchLogs(true);
  };

  // 点击“刷新日志”按钮，清空筛选条件并重新加载所有日志
  const handleRefresh = () => {
    // 清除筛选状态
    setFilterIP('');
    setFilterPath('');
    setFilterDateRange(null);
    // 获取全部日志数据
    fetchLogs(false);
    message.success('日志列表已刷新');
  };

  // 导出当前显示的日志为 CSV 文件
  const exportLogsToCSV = () => {
    if (logs.length === 0) {
      message.info('当前没有日志数据可导出');
      return;
    }
    // 定义 CSV 文件的表头
    let csvContent = 'IP地址,触发路径,时间\n';
    // 将每条日志拼接为 CSV 的一行
    logs.forEach(log => {
      // 确保字段中不包含逗号并进行必要转义（此处简单处理，假设 IP、路径、时间中不含英文逗号）
      const row = `${log.ip},${log.path},${log.time}`;
      csvContent += row + '\n';
    });
    // 创建 Blob 对象并触发浏览器下载
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `蜜罐日志导出_${new Date().toLocaleDateString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 导出封锁IP列表为 CSV 文件
  const exportBlacklistToCSV = () => {
    if (blacklist.length === 0) {
      message.info('当前没有封锁IP数据可导出');
      return;
    }
    let csvContent = '封锁IP地址\n';
    blacklist.forEach(entry => {
      csvContent += `${entry.ip}\n`;
    });
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `封锁IP列表导出_${new Date().toLocaleDateString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 在日志表格中封锁某个IP的操作
  const handleBlockIP = async (ip: string) => {
    try {
      await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      // 更新前端黑名单状态
      if (!blacklist.find(item => item.ip === ip)) {
        setBlacklist(prev => [...prev, { ip }]);
      }
      message.success(`IP ${ip} 已封锁`);
      // （提示信息也可以省略，由后端 WebSocket 通知统一提醒）
    } catch (err) {
      console.error('封锁IP失败', err);
      message.error('封锁IP时发生错误');
    }
  };

  // 在封锁列表表格中解除封锁某IP的操作
  const handleUnblockIP = async (ip: string) => {
    try {
      await fetch(`/api/blacklist/${ip}`, { method: 'DELETE' });
      // 更新前端黑名单状态：从列表移除该IP
      setBlacklist(prev => prev.filter(item => item.ip !== ip));
      message.success(`IP ${ip} 已解除封锁`);
    } catch (err) {
      console.error('解除封锁失败', err);
      message.error('解除封锁时发生错误');
    }
  };

  // 定义蜜罐日志表格的列配置
  const logColumns: ColumnsType<LogEntry> = [
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: '25%'
    },
    {
      title: '触发路径',
      dataIndex: 'path',
      key: 'path',
      width: '25%'
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: '30%',
      render: (text) => {
        // 将 ISO 时间字符串格式化为更可读的形式
        const date = new Date(text);
        const localeString = date.toLocaleString('zh-CN', { hour12: false });
        return localeString;  // 显示如 "2025/5/19 14:30:00"
      }
    },
    {
      title: '操作',
      key: 'action',
      width: '20%',
      render: (_, record) => {
        const ip = record.ip;
        const isBlocked = !!blacklist.find(item => item.ip === ip);
        return (
          <Button 
            type="link" 
            danger 
            disabled={isBlocked} 
            onClick={() => handleBlockIP(ip)}
          >
            {isBlocked ? '已封锁' : '封锁IP'}
          </Button>
        );
      }
    }
  ];

  // 定义封锁IP表格的列配置
  const blacklistColumns: ColumnsType<BlacklistEntry> = [
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: '70%'
    },
    {
      title: '操作',
      key: 'action',
      width: '30%',
      render: (_, record) => {
        const ip = record.ip;
        return (
          <Button type="link" onClick={() => handleUnblockIP(ip)}>
            解除封锁
          </Button>
        );
      }
    }
  ];

  // 日期范围选择变化处理，将选择结果转换为 ISO 字符串格式保存
  const onDateRangeChange: RangePickerProps['onChange'] = (_, dateStrings) => {
    if (dateStrings[0] && dateStrings[1]) {
      // 将日期范围的开始设为当天00:00:00，结束设为当天23:59:59，以包含整天
      const start = dateStrings[0] + ' 00:00:00';
      const end = dateStrings[1] + ' 23:59:59';
      setFilterDateRange([start, end]);
    } else {
      setFilterDateRange(null);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <Tabs defaultActiveKey="logs">
        <TabPane tab="蜜罐日志" key="logs">
          {/* 筛选搜索栏：包含IP、类型、时间范围筛选和刷新/搜索/导出按钮 */}
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handleRefresh}>刷新日志</Button>
            <Space>
              <Input 
                placeholder="按IP筛选" 
                value={filterIP} 
                onChange={e => setFilterIP(e.target.value)} 
                style={{ width: 120 }} 
              />
              <Input 
                placeholder="按类型/路径筛选" 
                value={filterPath} 
                onChange={e => setFilterPath(e.target.value)} 
                style={{ width: 150 }} 
              />
              <RangePicker onChange={onDateRangeChange} />
              <Button type="primary" onClick={handleSearch}>搜索</Button>
              <Button onClick={exportLogsToCSV}>导出 CSV</Button>
            </Space>
          </div>
          {/* 蜜罐日志数据表格 */}
          <Table 
            rowKey={(record) => record.ip + record.time} 
            columns={logColumns} 
            dataSource={logs} 
            pagination={{ pageSize: 10 }} 
          />
        </TabPane>
        <TabPane tab="封锁IP" key="blacklist">
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            {/* 封锁IP页的导出按钮 */}
            <Button onClick={exportBlacklistToCSV}>导出 CSV</Button>
          </div>
          {/* 封锁IP列表数据表格 */}
          <Table 
            rowKey="ip" 
            columns={blacklistColumns} 
            dataSource={blacklist} 
            pagination={{ pageSize: 10 }} 
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default LogAndBlacklistPage;
