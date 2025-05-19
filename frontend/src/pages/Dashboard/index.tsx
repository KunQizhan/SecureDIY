import React, { useState, useEffect } from 'react';
// 引入 Recharts 图表所需组件 (确保已安装 recharts 库)
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { Card } from 'antd';

interface HourlyStat {
  time: string;
  count: number;
}
interface DailyStat {
  date: string;
  count: number;
}

const DashboardPage: React.FC = () => {
  // 状态：按小时统计数据 和 按天统计数据
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);

  useEffect(() => {
    // 组件挂载时，从后端获取统计数据
    fetch('/api/logs/stats')
      .then(res => res.json())
      .then(data => {
        // 假定后端返回形如 { hourly: [...], daily: [...] }
        setHourlyStats(data.hourly || []);
        setDailyStats(data.daily || []);
      })
      .catch(err => {
        console.error('获取统计数据失败', err);
      });
  }, []);

  return (
    <div style={{ padding: '16px' }}>
      <h2>蜜罐触发频率仪表盘</h2>
      {/* 使用卡片组件包装图表，增加样式 */}
      <Card style={{ marginBottom: '24px' }} title="按小时统计（最近触发情况）">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={hourlyStats}>
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis dataKey="time" angle={-45} textAnchor="end" height={60} tickFormatter={(value: string) => value.replace(' ', '\n')} />
            {/*
              X轴使用 time 字段，由于包含日期和小时，这里将空格替换为换行以在刻度标签上分两行显示（日期在上，小时在下），提升可读性
            */}
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" name="触发次数" stroke="#1890ff" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card title="按天统计（每日触发总次数）">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyStats}>
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" name="触发次数" fill="#ffc658" barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default DashboardPage;
