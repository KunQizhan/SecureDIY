import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 引入 Ant Design 全局样式
//import 'antd/dist/antd.min.css';


// 获取 HTML 中的根节点
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  // 渲染 React 应用的根组件 <App />
  root.render(<App />);
} else {
  console.error('无法找到 root 元素，请检查 public/index.html');
}
