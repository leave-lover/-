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

- **Flask** : Python Web框架
- **Flask-CORS** : 跨域支持
- **TensorFlow/Keras** : 深度学习框架
- **NumPy/Pandas** : 数据处理
- **Scikit-learn** : 机器学习工具

## 环境要求

- Python 3.8+
- Node.js 16+
- npm 或 yarn

## 安装步骤

### 1. 安装Python依赖

```bash
cd backend
pip install -r ../requirements.txt
```

### 2. 安装Node.js依赖

```bash
# 在项目根目录
npm install

# 如果安装失败，清理缓存后重试
npm cache clean --force
npm install
```

### 3. 准备数据文件

将以下文件放入 `backend/data/` 目录：

- `after.csv` - 特征数据 (59列)
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
- 后端API: http://localhost:5000

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
│   └── data/                  # 原始数据文件目录
│       ├── after.csv          # 特征数据
│       └── tabels.csv         # 标签数据
│
├── src/                       # 前端React代码
│   ├── components/            # React组件
│   │   ├── Sidebar.tsx        # 侧边栏
│   │   ├── MetricCard.tsx     # 指标卡片
│   │   ├── TimeStepChart.tsx  # 时间序列图
│   │   ├── MeterStatusTable.tsx # 状态表格
│   │   └── tabs/              # 标签页组件
│   ├── hooks/                 # 自定义Hooks
│   │   └── useTrainingState.ts # 训练状态管理 (轮询机制)
│   └── lib/                   # 工具库
│       └── api.ts             # API接口
│
│
├── package.json               # 前端依赖配置
├── requirements.txt           # Python依赖配置
└── README.md                  # 项目文档
```

## API接口说明

### 训练相关

- `POST /api/train` - 开始训练模型
- `GET /api/training/status` - 获取训练状态
- `GET /api/metrics` - 获取训练指标

### 数据相关

- `GET /api/data/features` - 获取特征数据
- `GET /api/data/labels` - 获取标签数据
- `GET /api/data/anomalies` - 获取异常检测结果

### 模型相关

- `GET /api/model/evaluate` - 评估模型性能
- `POST /api/model/predict` - 使用模型进行预测

## 功能说明

### 1. 仪表盘

- 系统状态监控
- 关键指标展示
- 实时数据概览

### 2. 图表分析

- 时间序列分析
- 特征相关性分析
- 交互式图表探索

### 3. 异常检测

- 异常事件列表
- 异常趋势可视化
- 异常详情查看

### 4. 系统设置

- 模型训练参数配置
- 训练状态监控
- 系统信息查看

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

1. 确保数据文件格式正确，特征数据应为59列，标签数据应为二分类(0/1)
2. 训练模型可能需要较长时间，具体取决于数据集大小和硬件配置
3. 建议使用虚拟环境隔离Python依赖
4. 首次使用时，建议先运行模型训练以确保系统正常工作

## 许可证

MIT License