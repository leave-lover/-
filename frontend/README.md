# 能源防御平台前端

一个用于能源系统拓扑可视化、攻击模拟和优化的交互式前端应用。

## 项目概述

能源防御平台是一个基于 React 和 TypeScript 构建的 Web 应用，用于可视化能源系统拓扑结构，模拟攻击场景，并提供系统优化建议。该平台支持电力系统和天然气系统的耦合分析，帮助用户理解能源系统的脆弱性和优化潜力。

## 技术栈

- **前端框架**: React 18
- **编程语言**: TypeScript
- **构建工具**: Vite 5
- **状态管理**: React Hooks (useState, useEffect, useContext)
- **数据可视化**:
  - react-force-graph-2d (拓扑图可视化)
  - recharts (图表可视化)
- **UI 组件**: 自定义组件库
- **样式**: CSS Modules
- **依赖管理**: npm

## 核心功能

1. **拓扑可视化**:

   - 交互式能源系统拓扑图
   - 支持电力和天然气系统的耦合可视化
   - 节点和边的详细信息展示

2. **攻击模拟**:

   - 支持多种攻击场景模拟
   - 实时显示攻击效果
   - 攻击结果分析和报告

3. **系统优化**:

   - 系统状态监控
   - 脆弱性分析
   - 优化建议生成
   - 迭代优化过程可视化

4. **数据管理**:

   - 数据导入和导出
   - 系统状态数据实时更新
   - 历史数据查询

5. **扩展性**:
   - 支持插件扩展
   - 模块化设计，便于功能扩展

## 项目结构

```
frontend/
├── src/                      # 源代码目录
│   ├── modules/              # 功能模块
│   │   ├── attack-simulation/ # 攻击模拟模块
│   │   ├── data/             # 数据管理模块
│   │   ├── shared/           # 共享组件和工具
│   │   └── topology/         # 拓扑可视化模块
│   ├── types/                # TypeScript类型定义
│   ├── App.tsx               # 应用主组件
│   ├── index.css             # 全局样式
│   └── main.tsx              # 应用入口
├── public/                   # 静态资源
├── docs/                     # 文档
├── scripts/                  # 脚本文件
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript配置
├── tsconfig.node.json        # TypeScript Node配置
└── vite.config.ts           # Vite配置
```

## 安装与配置

### 前置要求

- Node.js 18+
- npm 9+ 或 yarn 1.22+

### 安装步骤

1. 克隆仓库:

   ```bash
   git clone <repository-url>
   cd energy-defense-platform/frontend
   ```

2. 安装依赖:

   ```bash
   npm install
   ```

3. 启动开发服务器:

   ```bash
   npm run dev
   ```

4. 在浏览器中访问:
   ```
   http://localhost:5173
   ```

### 构建生产版本

```bash
npm run build
```

构建产物将生成在 `dist` 目录中。

### 预览生产构建

```bash
npm run preview
```

## 使用指南

### 1. 拓扑可视化

- 在左侧边栏选择拓扑视图
- 拖动节点可以调整拓扑图布局
- 点击节点或边可以查看详细信息
- 使用缩放工具可以调整视图大小

### 2. 攻击模拟

- 在攻击模拟面板中选择攻击类型
- 设置攻击参数
- 点击"开始模拟"按钮
- 查看攻击结果和影响分析

### 3. 系统优化

- 在系统优化面板中查看系统状态
- 点击"开始优化"按钮
- 查看优化结果和建议
- 查看迭代优化过程

### 4. 数据管理

- 在数据导入面板中导入系统数据
- 支持多种数据格式
- 查看导入的数据状态
- 导出系统状态数据

## 开发指南

### 代码规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 规则
- 使用 CSS Modules 进行样式管理
- 遵循 React 最佳实践

### 组件开发

- 每个组件应该有清晰的职责
- 使用 TypeScript 接口定义组件属性
- 组件应该是可复用的
- 组件应该有良好的文档

### 测试

- 使用 Jest 进行单元测试
- 使用 React Testing Library 进行组件测试
- 确保测试覆盖率达到 80%以上

### 提交代码

- 遵循 Conventional Commits 规范
- 提交前运行 lint 和 test 命令
- 确保代码通过所有检查

## API 文档

### 后端 API

平台与后端 API 进行通信，获取系统状态数据和优化结果。API 文档请参考后端 README 文件。

### 主要 API 端点

- `/api/system-status` - 获取系统状态数据
- `/api/attack-simulation` - 模拟攻击
- `/api/optimization` - 执行系统优化
- `/api/vulnerability` - 分析系统脆弱性

## 贡献指南

1. Fork 仓库
2. 创建特性分支: `git checkout -b feature/your-feature-name`
3. 提交更改: `git commit -m "feat: add your feature"`
4. 推送到分支: `git push origin feature/your-feature-name`
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请联系项目团队。

---

© 2025 能源防御平台开发团队
