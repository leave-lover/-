# Python文件直接运行指南

## 环境要求

### 必需依赖库
根据分析，项目主要需要以下Python库：
- **numpy**: 数值计算库
- **gurobipy**: Gurobi优化求解器
- **sys**: Python标准库
- **warnings**: Python标准库
- **json**: Python标准库

### 推荐环境配置
使用现有的Anaconda环境（已确认包含Gurobi）：
```bash
# 激活Anaconda环境
D:\anaconda\python.exe
```

## 项目文件结构

### 主要Python文件
1. **bilevel_attack_11111.py** - 主攻击模拟文件（双层优化模型）
2. **bilevel_attack_sensitivity.py** - 参数敏感性分析
3. **bilevel_attack_with_output.py** - 带详细输出的攻击模拟
4. **defense2.py** - 防御系统实现
5. **elec39_gas20.py** - 数据导入模块（39节点电力+20节点天然气系统）
6. **test_env.py** - 环境测试脚本
7. **parse_attack_strategy.py** - 攻击策略解析
8. **parse_iteration_results.py** - 迭代结果解析
9. **generate_iteration_json.py** - JSON结果生成
10. **test_numpy.py** - NumPy测试

### 备份文件（位于backup目录）
- 使用PuLP求解器的版本（only_gas.py, only_elec.py等）
- 早期版本的攻击模拟代码

## 运行指南

### 1. 环境验证
首先运行测试脚本验证环境：
```bash
D:\anaconda\python.exe test_env.py
```

### 2. 主要攻击模拟文件
```bash
# 运行主攻击模拟
D:\anaconda\python.exe bilevel_attack_11111.py

# 运行带详细输出的版本
D:\anaconda\python.exe bilevel_attack_with_output.py

# 运行参数敏感性分析
D:\anaconda\python.exe bilevel_attack_sensitivity.py
```

### 3. 防御系统
```bash
# 运行防御系统模拟
D:\anaconda\python.exe defense2.py
```

### 4. 数据解析工具
```bash
# 解析攻击策略
D:\anaconda\python.exe parse_attack_strategy.py

# 解析迭代结果
D:\anaconda\python.exe parse_iteration_results.py

# 生成JSON结果
D:\anaconda\python.exe generate_iteration_json.py
```

## 依赖管理策略

### 避免不必要的依赖安装
1. **使用现有环境**: 直接使用已配置好的Anaconda环境
2. **最小化依赖**: 项目仅需要核心科学计算库
3. **避免虚拟环境冲突**: 不创建新的虚拟环境

### 依赖检查清单
在运行任何文件前，确保以下库可用：
```python
import numpy as np
from gurobipy import Model, GRB, QuadExpr, quicksum
import sys
import warnings
import json
```

## 常见问题解决

### 1. Gurobi许可证错误
**症状**: `GurobiError: No Gurobi license found`
**解决方案**: 
- 检查Gurobi许可证文件位置
- 确保Anaconda环境正确配置
- 使用：`D:\anaconda\python.exe` 而非系统Python

### 2. 模块导入错误
**症状**: `ModuleNotFoundError: No module named 'gurobipy'`
**解决方案**:
```bash
# 确认使用正确的Python解释器
where python
D:\anaconda\python.exe --version
```

### 3. 文件路径问题
**症状**: `FileNotFoundError` 或权限错误
**解决方案**:
- 在项目根目录运行命令
- 确保文件路径不包含特殊字符
- 使用引号包围包含空格的文件名

### 4. 内存不足错误
**症状**: 程序运行缓慢或崩溃
**解决方案**:
- 关闭其他占用内存的程序
- 考虑减少问题规模进行测试

## 优化运行建议

### 性能优化
1. **分批运行**: 大型模拟分批次进行
2. **结果保存**: 使用JSON文件保存中间结果
3. **日志记录**: 启用详细日志记录调试信息

### 调试技巧
1. **逐步执行**: 先运行小规模测试
2. **参数调整**: 调整优化参数控制运行时间
3. **结果验证**: 使用解析工具检查输出格式

## 文件说明

### 核心算法文件
- **bilevel_attack_11111.py**: 实现电力-天然气耦合系统的虚假数据注入攻击双层优化模型
- **defense2.py**: 实现全节点保护的保密设备防御系统
- **elec39_gas20.py**: 提供标准的IEEE 39节点电力系统和20节点天然气系统测试数据

### 辅助工具
- 解析工具用于处理优化结果输出
- 测试脚本用于环境验证
- JSON生成工具用于结果格式化

## 注意事项

1. **许可证要求**: Gurobi需要有效的商业许可证
2. **计算资源**: 大型优化问题可能需要大量内存和计算时间
3. **结果解释**: 优化结果需要结合具体业务场景进行解释
4. **版本兼容**: 确保所有依赖库版本兼容

---

**创建日期**: 2025年12月22日  
**最后更新**: 2025年12月22日  
**适用环境**: Windows + Anaconda + Gurobi