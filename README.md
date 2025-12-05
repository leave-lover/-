# 能源防御与攻击平台

## 项目简介

能源防御与攻击平台是一个综合性的能源系统监控、分析和防御平台，采用前后端分离架构，具备以下核心功能：

1. 基于深度学习的能源系统异常检测与防御
2. 能源网络拓扑可视化（电力网络和天然气网络）
3. 实时监测能源系统运行状态，检测异常行为
4. 提供丰富的可视化分析工具

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

对于拓扑图可视化功能，还需要以下文件（放在 `backend/data/raw/` 目录）：

- `power_grid_data.xlsx` - 电力网络数据
- `gas_network_data.xlsx` - 天然气网络数据

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

#### 首次启动准备

首次启动前，请确保已处理能源网络数据：

```bash
# 在frontend目录下运行
npm run process:data
```

或者直接运行 Python 脚本：

```bash
cd backend
python data_processor.py
```

这将生成拓扑图所需的 JSON 数据文件。

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
│   ├── data_processor.py      # 能源网络数据处理脚本
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
│   │   │   ├── TopologyGraph.tsx # 能源网络拓扑图组件
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

### 拓扑图数据接口

| 接口地址                 | 请求方法 | 描述                   |
| ------------------------ | -------- | ---------------------- |
| `/api/topology/electric` | GET      | 获取电力网络拓扑数据   |
| `/api/topology/gas`      | GET      | 获取天然气网络拓扑数据 |

### 返回数据格式

```json
{
  "nodes": [
    {
      "id": "node1",
      "group": "electric", // 或 "gas"
      "name": "变电站A"
    }
  ],
  "links": [
    {
      "source": "node1",
      "target": "node2",
      "value": 100 // 连接强度或容量
    }
  ]
}
```

## 功能说明

### 能源网络拓扑可视化

平台新增了能源网络拓扑可视化功能，可以直观地展示电力网络和天然气网络的结构关系。该功能具有以下特点：

1. **双网络展示**：在同一界面中展示电力网络和天然气网络的拓扑结构
2. **力导向布局**：使用 D3 力导向算法自动计算节点位置，使网络结构更加清晰
3. **交互式操作**：支持节点拖拽、缩放、平移等交互操作
4. **节点分类**：不同类型节点使用不同颜色标识（电力节点为蓝色，天然气节点为橙色）
5. **实时统计**：动态显示网络统计信息（节点数量、连接数量等）

### 异常检测与防御

基于深度学习的异常检测模型，能够实时监测能源系统的运行状态，识别潜在的安全威胁和异常行为。

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
