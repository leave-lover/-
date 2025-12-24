# 能源防御与攻击平台

一个用于能源系统拓扑可视化、攻击模拟和优化的综合平台。

## 项目概述

能源防御与攻击平台是一个集前端可视化、后端计算和数据分析于一体的综合系统，用于研究和分析能源系统（电力系统和天然气系统）的脆弱性、攻击场景和优化策略。

该平台支持：

- 能源系统拓扑的交互式可视化
- 多种攻击场景的模拟与分析
- 系统优化算法的实现与展示
- 数据分析和报告生成
- 电力系统与天然气系统的耦合分析

## 项目结构

```
energy-defense-platform/
├── backend/                    # 后端服务
│   ├── app.py                  # 主应用入口
│   ├── data/                   # 数据文件
│   ├── data_processor.py       # 数据处理模块
│   ├── index.js                # Node.js入口（可选）
│   ├── package.json            # Node.js依赖
│   ├── package-lock.json       # Node.js依赖锁定
│   ├── requirements_conda.txt  # Conda依赖
│   ├── requirements_minimal.txt # 最小化依赖
│   └── vulnerability_assessment.py # 脆弱性评估模块
├── frontend/                   # 前端应用
│   ├── src/                    # 源代码
│   │   ├── modules/            # 功能模块
│   │   ├── styles/             # 样式文件
│   │   └── types/              # 类型定义
│   ├── index.html              # HTML入口
│   ├── package.json            # npm依赖
│   ├── package-lock.json       # npm依赖锁定
│   ├── README.md               # 前端文档
│   ├── tsconfig.json           # TypeScript配置
│   ├── tsconfig.node.json      # TypeScript Node配置
│   └── vite.config.ts          # Vite配置
├── .gitignore                  # Git忽略配置
├── start-all.bat               # Windows启动脚本
├── start-all.ps1               # PowerShell启动脚本
└── README.md                   # 项目主文档
```

## 技术栈

### 前端

- **框架**: React 18
- **语言**: TypeScript
- **构建工具**: Vite 5
- **可视化库**: act-force-graph-2d, recharts

### 后端

- **语言**: Python 3.8+, JavaScript
- **Web 框架**: Flask
- **计算库**: NumPy, Pandas, SciPy
- **优化求解器**: Gurobi/PuLP

## 核心功能

### 1. 拓扑可视化展示

- 交互式能源系统拓扑图
- 支持电力和天然气系统的耦合展示
- 节点和边的详细信息查询
- 拓扑图的缩放、平移和旋转
- 攻击路径的可视化

### 2. 攻击模拟

- 多种攻击场景的模拟
- 实时显示攻击效果
- 攻击算法的实现与分析
- 攻击路径的可视化展示

### 3. 防御模拟

- 多种防御策略的模拟
- 实时显示防御效果
- 防御算法的实现与分析

### 4. 系统分析

- 统计分析
- 报告生成
- 脆弱性分析
- 参数敏感性分析
- 优化算法的实现
- 数据导入和导出

## 安装与配置

### 前置要求

- **前端**: Node.js 18+, npm 9+
- **后端**: Python 3.8+, pip

### 快速启动

#### 使用启动脚本（推荐）

Windows 系统:

```bash
start-all.bat
```

PowerShell:

```bash
start-all.ps1
```

#### 手动启动

1. **启动后端服务**:

   ```bash
   cd backend
   python app.py
   ```

2. **启动前端开发服务器**:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **构建生产版本**:

   ```bash
   cd frontend
   npm run build
   ```

### 依赖安装

#### 前端依赖

```bash
cd frontend
npm install
```

#### 后端依赖

```bash
cd backend
pip install -r requirements_minimal.txt
# 或使用conda
conda install --file requirements_conda.txt
```

## 开发指南

### 前端开发

1. 进入前端目录:

   ```bash
   cd frontend
   ```

2. 安装依赖:

   ```bash
   npm install
   ```

3. 启动开发服务器:

   ```bash
   npm run dev
   ```

4. 构建生产版本:

   ```bash
   npm run build
   ```

### 后端开发

1. 进入后端目录:

   ```bash
   cd backend
   ```

2. 安装依赖:

   ```bash
   pip install -r requirements_minimal.txt
   ```

3. 启动开发服务器:

   ```bash
   python app.py
   ```

## 功能模块说明

### 1. 拓扑可视化模块

负责能源系统拓扑图的展示和交互，支持电力系统和天然气系统的耦合展示。

### 2. 攻击模拟模块

实现多种攻击场景的模拟，包括节点攻击、边攻击等，实时显示攻击效果。

### 3. 防御模拟模块

实现多种防御策略的模拟，包括节点加固、边保护等，实时显示防御效果。

### 4. 数据分析模块

负责系统数据的分析和可视化，包括统计分析、脆弱性分析、参数敏感性分析等。

### 5. 系统优化模块

实现系统优化算法，包括成本优化、可靠性优化等。

## 项目优化

### 优化内容

1. **项目结构优化**:

   - 清理了根目录中的冗余文件
   - 优化了后端目录结构
   - 简化了项目结构，提高了可维护性

2. **冗余文件移除**:

   - 移除了根目录中的临时文件和数据文件
   - 移除了未使用的代码文件
   - 清理了虚拟环境和依赖目录（通过.gitignore 管理）

3. **代码优化**:
   - 优化了前端代码结构
   - 简化了后端代码实现
   - 提高了代码的可维护性和可读性

## 致谢

感谢所有为该项目做出贡献的团队成员和社区开发者。

## 许可证

MIT License
