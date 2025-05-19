import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';                // 确保 i18n 配置文件被加载
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';     // 导入你初始化的 i18n 实例

// 引入 Ant Design 全局样式
//import 'antd/dist/antd.min.css';


// 获取 HTML 中的根节点
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  // 渲染 React 应用的根组件 <App />
  root.render(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  );
} else {
  console.error('无法找到 root 元素，请检查 public/index.html');
}
