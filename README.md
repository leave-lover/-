# 能源防御与攻击平台

## 项目简介

能源防御与攻击平台是一个基于深度学习的能源系统异常检测与防御平台，采用前后端分离架构，能够实时监测能源系统运行状态，检测异常行为，并提供可视化分析工具。

## 技术栈

### 前端技术栈

- **React 18** : 用户界面框架
- **TypeScript** : 类型安全
- **Vite** : 快速构建工具
- **Recharts** : 基础数据可视化图表库
- **React-Plotly.js** : 交互式科学可视化图表
- **TailwindCSS** : 样式框架
- **Lucide React** : 现代化图标库

### 后端技术栈

- **Flask** : Python Web 框架
- **Flask-CORS** : 跨域支持
- **TensorFlow/Keras** : 深度学习框架
- **NumPy/Pandas** : 数据处理
- **Scikit-learn** : 机器学习工具

## 环境要求

- Python 3.8+
- Node.js 16+
- npm 或 yarn

## 安装步骤

### 1. 安装 Python 依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 安装 Node.js 依赖

```bash
cd frontend
npm install

# 如果安装失败，清理缓存后重试
npm cache clean --force
npm install
```

### 3. 准备数据文件

将以下文件放入 `backend/data/` 目录：

- `after.csv` - 特征数据 (59 列)
- `tabels.csv` - 标签数据 (二分类: 0/1)

### 4. 启动服务

#### 方式一: 同时启动前后端 (推荐)

```bash
npm run dev:all
```

使用 `concurrently` 工具同时启动前后端，输出日志会合并显示。

#### 方式二: 分别启动

```bash
# 终端1: 启动后端
cd backend && python app.py

# 终端2: 启动前端
npx vite --port 5173 --host 0.0.0.0
```

#### 方式三: 后台启动

```bash
# 后台启动后端
cd backend && python app.py &

# 启动前端 (前台)
npx vite --port 5173 --host 0.0.0.0
```

## 访问系统

- 前端地址: http://localhost:5173 (或自动分配的端口)
- 后端 API: http://localhost:5000

## 项目结构

```
项目根目录/
├── backend/                    # 后端Python代码
│   ├── app.py                 # Flask主应用 & HTTP路由
│   ├── training_service.py    # 训练状态管理服务
│   ├── data_service.py        # 数据读写管理服务
│   ├── models/                # CNN模型实现
│   │   └── CNN_2_with_callback.py
│   ├── output/                # 输出数据目录
│   │   └── anomaly_data.json  # 异常检测结果 (JSON格式)
│   ├── data/                  # 原始数据文件目录
│   │   ├── raw/               # 原始数据
│   │   ├── processed/         # 处理后的数据
│   │   └── normalized/        # 归一化后的数据
│   └── requirements.txt       # Python依赖配置
│
├── frontend/                   # 前端React代码
│   ├── src/                   # 前端源码
│   │   ├── components/        # React组件
│   │   │   ├── Sidebar.tsx    # 侧边栏
│   │   │   ├── MetricCard.tsx # 指标卡片
│   │   │   ├── TimeStepChart.tsx # 时间序列图
│   │   │   ├── MeterStatusTable.tsx # 状态表格
│   │   │   └── tabs/          # 标签页组件
│   │   ├── hooks/             # 自定义Hooks
│   │   │   └── useTrainingState.ts # 训练状态管理 (轮询机制)
│   │   └── lib/               # 工具库
│   │       └── api.ts         # API接口
│   ├── index.html             # HTML入口
│   ├── package.json           # 前端依赖配置
│   ├── tsconfig.json          # TypeScript配置
│   ├── vite.config.ts         # Vite配置
│   └── dist/                  # 构建输出目录
│
└── README.md                  # 项目文档
```

## API 接口说明

## 功能说明

## 开发说明

### 前端开发

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### 后端开发

```bash
# 启动开发服务器
cd backend
python app.py
```

## 注意事项

## 许可证

MIT License
