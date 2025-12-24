import numpy as np
import gurobipy as gp
from gurobipy import GRB

print("numpy version:", np.__version__)
print("gurobipy version:", gp.__version__)

# 测试简单的gurobi模型
try:
    model = gp.Model("test")
    x = model.addVar(name="x")
    y = model.addVar(name="y")
    model.setObjective(x + y, GRB.MINIMIZE)
    model.addConstr(x + y >= 1, "c1")
    model.optimize()
    print("Gurobi model solved successfully!")
    print(f"x = {x.X}, y = {y.X}")
except Exception as e:
    print(f"Error in Gurobi test: {e}")
