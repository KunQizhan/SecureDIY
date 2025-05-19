const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',  // 默认模式为开发模式（可被命令行参数覆盖）
  entry: './src/index.tsx',  // 前端应用入口
  output: {
    path: path.resolve(__dirname, 'dist'),      // 打包输出目录
    filename: 'bundle.js',                      // 输出的JS文件名
    clean: true                                 // 在生成新文件前清理旧的dist文件夹
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']  // 自动解析的扩展名，使 import 无需带扩展
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,        // 匹配 .js, .ts, .jsx, .tsx 文件
        exclude: /node_modules/,   // 排除第三方库
        use: {
          loader: 'babel-loader'   // 使用 Babel 加载器处理
          // .babelrc 中已经定义了 presets，这里无需重复配置选项
        }
      },
      {
        test: /\.css$/,            // 匹配 CSS 文件
        use: ['style-loader', 'css-loader']  // 使用 style-loader 和 css-loader 打包CSS
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'), // HTML模板路径
      filename: 'index.html'  // 输出的HTML文件名（会放在 dist/ 下）
    })
  ],
  devServer: {
    port: 3000,        // 开发服务器端口
    open: true,        // 自动打开浏览器
    hot: true          // 开启热模块替换(HMR)，实时刷新
    // 注意：我们使用了 CORS，因此这里不设置 proxy。如果没有启用CORS，可以配置 proxy 将API请求转发到后端。
  }
};
