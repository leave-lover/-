# 能源防御与攻击平台API文档

## 1. API概述

能源防御与攻击平台提供了一系列RESTful API接口，用于前后端通信和功能扩展。本文档详细描述了这些API接口的功能、请求参数和响应格式。

## 2. 基础信息

### 2.1 API地址

开发环境: `http://localhost:5000/api`

生产环境: 根据部署配置而定

### 2.2 请求方法

支持的HTTP请求方法：

- GET: 获取资源
- POST: 创建或更新资源
- PUT: 更新资源
- DELETE: 删除资源

### 2.3 响应格式

所有API响应均采用JSON格式，包含以下字段：

```json
{
  "success": true/false,      // 操作是否成功
  "message": "string",        // 操作结果描述
  "data": { ... },            // 响应数据
  "error": "string"           // 错误信息（仅当success为false时存在）
}
```

### 2.4 错误代码

| 错误代码 | 描述 |
|---------|------|
| 400 | 请求参数错误 |
| 401 | 未授权访问 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 3. 认证与授权

当前版本的API暂不要求认证，但在未来版本中可能会添加JWT认证机制。

## 4. API接口列表

### 4.1 拓扑数据API

#### 4.1.1 获取拓扑数据

**接口**: GET /api/topology

**功能**: 获取能源系统拓扑数据

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| system_type | string | 可选 | 系统类型（"power"、"gas"或"coupled"） |

**响应数据**:

```json
{
  "nodes": [ ... ],  // 节点列表
  "links": [ ... ]   // 边列表
}
```

#### 4.1.2 加载拓扑数据

**接口**: POST /api/topology/load

**功能**: 从文件加载拓扑数据

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| file_path | string | 是 | 数据文件路径 |
| system_type | string | 是 | 系统类型 |

**响应数据**:

```json
{
  "nodes_count": 39,  // 节点数量
  "links_count": 46   // 边数量
}
```

### 4.2 攻击模拟API

#### 4.2.1 开始攻击模拟

**接口**: POST /api/attack/start

**功能**: 开始攻击模拟

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| attack_type | string | 是 | 攻击类型（"node"、"link"或"combined"） |
| targets | array | 是 | 攻击目标列表 |
| intensity | number | 可选 | 攻击强度（默认值：1.0） |
| algorithm | string | 可选 | 攻击算法（默认值："random"） |

**响应数据**:

```json
{
  "attack_id": "uuid",  // 攻击ID
  "status": "running"   // 攻击状态
}
```

#### 4.2.2 获取攻击结果

**接口**: GET /api/attack/result/{attack_id}

**功能**: 获取攻击模拟结果

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| attack_id | string | 是 | 攻击ID |

**响应数据**:

```json
{
  "attack_id": "uuid",
  "status": "completed",
  "start_time": "2023-01-01T12:00:00Z",
  "end_time": "2023-01-01T12:01:00Z",
  "results": {
    "affected_nodes": [ ... ],  // 受影响的节点
    "affected_links": [ ... ],   // 受影响的边
    "performance_metrics": { ... }  // 性能指标变化
  }
}
```

#### 4.2.3 停止攻击模拟

**接口**: POST /api/attack/stop/{attack_id}

**功能**: 停止正在进行的攻击模拟

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| attack_id | string | 是 | 攻击ID |

**响应数据**:

```json
{
  "attack_id": "uuid",
  "status": "stopped"
}
```

### 4.3 防御模拟API

#### 4.3.1 开始防御模拟

**接口**: POST /api/defense/start

**功能**: 开始防御模拟

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| defense_type | string | 是 | 防御类型（"node"、"link"或"system"） |
| targets | array | 是 | 防御目标列表 |
| intensity | number | 可选 | 防御强度（默认值：1.0） |
| resources | number | 可选 | 防御资源（默认值：100） |
| algorithm | string | 可选 | 防御算法（默认值："greedy"） |

**响应数据**:

```json
{
  "defense_id": "uuid",  // 防御ID
  "status": "running"    // 防御状态
}
```

#### 4.3.2 获取防御结果

**接口**: GET /api/defense/result/{defense_id}

**功能**: 获取防御模拟结果

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| defense_id | string | 是 | 防御ID |

**响应数据**:

```json
{
  "defense_id": "uuid",
  "status": "completed",
  "start_time": "2023-01-01T12:00:00Z",
  "end_time": "2023-01-01T12:01:00Z",
  "results": {
    "protected_nodes": [ ... ],  // 受保护的节点
    "protected_links": [ ... ],   // 受保护的边
    "performance_metrics": { ... },  // 性能指标变化
    "resources_used": 85          // 使用的防御资源
  }
}
```

#### 4.3.3 停止防御模拟

**接口**: POST /api/defense/stop/{defense_id}

**功能**: 停止正在进行的防御模拟

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| defense_id | string | 是 | 防御ID |

**响应数据**:

```json
{
  "defense_id": "uuid",
  "status": "stopped"
}
```

### 4.4 系统分析API

#### 4.4.1 统计分析

**接口**: GET /api/analysis/stats

**功能**: 获取系统统计数据

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| system_type | string | 可选 | 系统类型 |

**响应数据**:

```json
{
  "node_stats": {
    "total": 39,
    "types": {
      "generator": 9,
      "load": 10,
      "bus": 20
    }
  },
  "link_stats": {
    "total": 46,
    "types": {
      "transmission": 34,
      "distribution": 12
    }
  },
  "performance_metrics": {
    "efficiency": 0.92,
    "reliability": 0.99,
    "cost": 125000
  }
}
```

#### 4.4.2 脆弱性分析

**接口**: POST /api/analysis/vulnerability

**功能**: 进行系统脆弱性分析

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| algorithm | string | 可选 | 分析算法（默认值："betweenness"） |
| top_n | number | 可选 | 返回前N个关键节点/边（默认值：10） |

**响应数据**:

```json
{
  "critical_nodes": [
    { "id": "bus_1", "score": 0.85, "type": "bus" },
    { "id": "generator_1", "score": 0.78, "type": "generator" }
  ],
  "critical_links": [
    { "id": "line_1", "score": 0.92, "type": "transmission" },
    { "id": "line_2", "score": 0.88, "type": "transmission" }
  ],
  "vulnerability_score": 0.75  // 系统脆弱性评分
}
```

#### 4.4.3 参数敏感性分析

**接口**: POST /api/analysis/sensitivity

**功能**: 进行参数敏感性分析

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| parameter | string | 是 | 要分析的参数 |
| min_value | number | 是 | 参数最小值 |
| max_value | number | 是 | 参数最大值 |
| step | number | 可选 | 步长（默认值：0.1） |

**响应数据**:

```json
{
  "parameter": "load_factor",
  "range": [0.5, 1.5],
  "step": 0.1,
  "results": [
    { "value": 0.5, "performance": 0.95 },
    { "value": 0.6, "performance": 0.94 },
    // ...
  ],
  "sensitivity_score": 0.72  // 参数敏感性评分
}
```

#### 4.4.4 系统优化

**接口**: POST /api/analysis/optimize

**功能**: 进行系统优化

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| objective | string | 是 | 优化目标（"cost"、"reliability"或"efficiency"） |
| constraints | object | 可选 | 优化约束 |
| algorithm | string | 可选 | 优化算法（默认值："ga"） |

**响应数据**:

```json
{
  "objective": "cost",
  "initial_value": 125000,
  "optimized_value": 108000,
  "improvement": 13.6,  // 改进百分比
  "optimized_parameters": { ... },  // 优化后的参数
  "execution_time": 5.2  // 执行时间（秒）
}
```

### 4.5 数据管理API

#### 4.5.1 上传数据文件

**接口**: POST /api/data/upload

**功能**: 上传数据文件

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| file | file | 是 | 数据文件 |
| system_type | string | 是 | 系统类型 |

**响应数据**:

```json
{
  "file_path": "uploads/39-20.txt",
  "file_size": 12560,
  "system_type": "coupled"
}
```

#### 4.5.2 下载数据文件

**接口**: GET /api/data/download/{file_id}

**功能**: 下载数据文件

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| file_id | string | 是 | 文件ID或路径 |

**响应数据**:

文件流

#### 4.5.3 获取数据文件列表

**接口**: GET /api/data/files

**功能**: 获取数据文件列表

**请求参数**:

| 参数名 | 类型 | 必选 | 描述 |
|-------|------|------|------|
| system_type | string | 可选 | 系统类型 |

**响应数据**:

```json
{
  "files": [
    {
      "id": "39-20.txt",
      "name": "39-20.txt",
      "path": "uploads/39-20.txt",
      "size": 12560,
      "system_type": "coupled",
      "upload_time": "2023-01-01T12:00:00Z"
    },
    // ...
  ]
}
```

### 4.6 系统状态API

#### 4.6.1 获取系统状态

**接口**: GET /api/system/status

**功能**: 获取系统运行状态

**响应数据**:

```json
{
  "status": "running",
  "cpu_usage": 0.35,
  "memory_usage": 0.42,
  "disk_usage": 0.68,
  "uptime": 3600,
  "active_tasks": 2
}
```

#### 4.6.2 获取系统版本

**接口**: GET /api/system/version

**功能**: 获取系统版本信息

**响应数据**:

```json
{
  "version": "1.2.0",
  "build_date": "2023-01-01T10:00:00Z",
  "api_version": "1.0"
}
```

## 5. API使用示例

### 5.1 使用Python请求API

```python
import requests

# 获取拓扑数据
response = requests.get('http://localhost:5000/api/topology')
if response.status_code == 200:
    data = response.json()
    if data['success']:
        topology = data['data']
        print(f"获取到 {len(topology['nodes'])} 个节点和 {len(topology['links'])} 条边")

# 开始攻击模拟
attack_data = {
    'attack_type': 'node',
    'targets': ['bus_1', 'bus_2'],
    'intensity': 1.0,
    'algorithm': 'random'
}
response = requests.post('http://localhost:5000/api/attack/start', json=attack_data)
if response.status_code == 200:
    data = response.json()
    if data['success']:
        attack_id = data['data']['attack_id']
        print(f"攻击模拟已启动，攻击ID: {attack_id}")
```

### 5.2 使用JavaScript请求API

```javascript
// 获取拓扑数据
fetch('http://localhost:5000/api/topology')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      const topology = data.data;
      console.log(`获取到 ${topology.nodes.length} 个节点和 ${topology.links.length} 条边`);
    }
  })
  .catch(error => {
    console.error('请求失败:', error);
  });

// 开始攻击模拟
const attackData = {
  attack_type: 'node',
  targets: ['bus_1', 'bus_2'],
  intensity: 1.0,
  algorithm: 'random'
};

fetch('http://localhost:5000/api/attack/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(attackData)
})
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      const attackId = data.data.attack_id;
      console.log(`攻击模拟已启动，攻击ID: ${attackId}`);
    }
  })
  .catch(error => {
    console.error('请求失败:', error);
  });
```

## 6. API扩展

### 6.1 添加新API

如果需要添加新的API接口，可以按照以下步骤进行：

1. 在后端代码中添加新的路由处理函数
2. 实现API功能逻辑
3. 更新API文档
4. 测试API功能

### 6.2 API版本控制

当前版本的API没有使用版本控制，所有API都在`/api/`路径下。在未来版本中，可能会引入API版本控制，例如`/api/v1/`、`/api/v2/`等。

## 7. 最佳实践

### 7.1 请求频率限制

为了保护服务器资源，建议客户端限制API请求频率，避免频繁发送请求。

### 7.2 错误处理

客户端应该妥善处理API返回的错误信息，向用户提供友好的错误提示。

### 7.3 数据缓存

对于频繁访问且不经常变化的数据，客户端可以考虑进行本地缓存，减少API请求次数。

### 7.4 异步请求

对于耗时较长的操作（如攻击模拟、优化计算等），客户端应该使用异步方式处理，避免阻塞用户界面。

## 8. 变更日志

### v1.0.0

- 初始API版本
- 实现拓扑数据API
- 实现攻击模拟API
- 实现防御模拟API
- 实现系统分析API
- 实现数据管理API

### v1.1.0

- 优化API响应格式
- 增加错误代码
- 完善API文档

### v1.2.0

- 增加系统状态API
- 优化API性能
- 改进错误处理

## 9. 联系方式

如果您在使用API过程中遇到问题或有任何建议，请通过以下方式联系我们：

- **项目文档**: 查看项目README.md和docs目录下的文档
- **GitHub Issues**: 提交问题和建议
- **电子邮件**: 联系项目维护者