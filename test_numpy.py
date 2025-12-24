#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
print(f"Python解释器路径: {sys.executable}")
print(f"Python版本: {sys.version}")

# 尝试导入numpy
try:
    import numpy as np
    print(f"numpy版本: {np.__version__}")
    print("numpy导入成功!")
    print(f"numpy安装路径: {np.__file__}")
except ImportError as e:
    print(f"numpy导入失败: {e}")
    print("尝试查看可用的模块路径:")
    print(sys.path)

# 尝试导入gurobi
try:
    import gurobipy
    print(f"gurobi版本: {gurobipy.__version__}")
    print("gurobi导入成功!")
except ImportError as e:
    print(f"gurobi导入失败: {e}")
