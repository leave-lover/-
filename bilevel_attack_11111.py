"""
电力-天然气耦合系统虚假数据注入攻击双层优化模型
动态惩罚系数版本：LOADSHED_PENALTY = 1000.0 * upper_objective
"""

import numpy as np
from gurobipy import Model, GRB, QuadExpr, quicksum
import sys
import warnings
warnings.filterwarnings('ignore')

# 导入数据
from elec39_gas20 import get_case_data

LOADSHED_PENALTY_BASE = 1000.0
LOADSHED_PENALTY_MULTIPLIER = 1000.0  # 乘数系数


def make_Bdc(baseMVA, bus, branch):
    """
    计算直流潮流的导纳矩阵
    返回: Bbus, Bf
    """
    n_bus = bus.shape[0]
    n_branch = branch.shape[0]
    
    # 计算支路导纳
    b = np.zeros(n_branch)
    for i in range(n_branch):
        if branch[i, 3] != 0:  # x != 0
            tap = branch[i, 8] if branch[i, 8] != 0 else 1.0
            b[i] = 1.0 / (branch[i, 3] * tap)
    
    # 构建Bf矩阵 (branch-bus)
    Bf = np.zeros((n_branch, n_bus))
    for i in range(n_branch):
        f = int(branch[i, 0]) - 1  # from bus (0-indexed)
        t = int(branch[i, 1]) - 1  # to bus (0-indexed)
        Bf[i, f] = b[i]
        Bf[i, t] = -b[i]
    
    # 构建Bbus矩阵
    Bbus = np.zeros((n_bus, n_bus))
    for i in range(n_branch):
        f = int(branch[i, 0]) - 1
        t = int(branch[i, 1]) - 1
        Bbus[f, f] += b[i]
        Bbus[t, t] += b[i]
        Bbus[f, t] -= b[i]
        Bbus[t, f] -= b[i]
    
    return Bbus, Bf


def solve_electric_subproblem(mpc, PD_attacked, y, GasGenNeed_prev, rho, 
                               gt_idx, gt_to_gasgen_map, GenIncMatrix, Bbus, Bf,
                               eta_gt, QLHV, baseMVA, loadshed_penalty):
    """
    求解电力子问题
    
    """
    bus = mpc['bus']
    gen = mpc['gen']
    branch = mpc['branch']
    gencost = mpc['gencost']
    
    n_bus = bus.shape[0]
    n_gen = gen.shape[0]
    n_branch = branch.shape[0]
    n_gt = len(gt_idx)
    
    # 找到参考节点 (type == 3)
    ref_bus = np.where(bus[:, 1] == 3)[0][0]
    
    try:
        model = Model("Electric_Subproblem")
        model.setParam('OutputFlag', 0)
        model.setParam('NonConvex', 2)
        model.setParam('NumericFocus', 3)  # 最高数值精度
        model.setParam('FeasibilityTol', 1e-6)
        
        # 决策变量
        gen_P = {}
        for i in range(n_gen):
            gen_P[i] = model.addVar(lb=0, ub=gen[i, 8]/baseMVA, name=f"gen_P_{i}")
        
        Va = {}
        for i in range(n_bus):
            Va[i] = model.addVar(lb=-np.pi, ub=np.pi, name=f"Va_{i}")
        
        u_state = {}
        for i in range(n_gen):
            u_state[i] = model.addVar(vtype=GRB.BINARY, name=f"u_state_{i}")
        
        phi_g_sh = {}
        for i in range(n_bus):
            phi_g_sh[i] = model.addVar(lb=0, ub=max(0, PD_attacked[i]), name=f"phi_g_sh_{i}")
        
        model.update()
        
        # 约束
        # 1. 功率平衡约束
        for i in range(n_bus):
            gen_sum = quicksum(GenIncMatrix[i, g] * gen_P[g] for g in range(n_gen))
            bus_flow = quicksum(Bbus[i, j] * Va[j] for j in range(n_bus))
            model.addConstr(gen_sum - PD_attacked[i] == bus_flow + phi_g_sh[i], 
                           name=f"power_balance_{i}")
        
        # 2. 线路潮流约束
        for l in range(n_branch):
            line_flow = quicksum(Bf[l, j] * Va[j] for j in range(n_bus))
            model.addConstr(line_flow <= branch[l, 5] / baseMVA, name=f"line_max_{l}")
            model.addConstr(line_flow >= -branch[l, 5] / baseMVA, name=f"line_min_{l}")
        
        # 3. 参考节点约束
        model.addConstr(Va[ref_bus] == 0, name="ref_bus")
        
        # 4. 机组出力约束
        for i in range(n_gen):
            model.addConstr(gen_P[i] >= u_state[i] * gen[i, 9] / baseMVA, name=f"gen_min_{i}")
            model.addConstr(gen_P[i] <= u_state[i] * gen[i, 8] / baseMVA, name=f"gen_max_{i}")
        
        # 目标函数 
        obj = QuadExpr()
        
        # 发电成本 (使用线性成本系数)
        for k in range(n_gen):
            obj += gencost[k, 5] * gen_P[k] * 100
        

        for i in range(n_bus):
            obj += loadshed_penalty * phi_g_sh[i]
        
        # 耦合惩罚项
        for k in range(n_gt):
            gt_gen_idx = gt_idx[k]
            gasgen_idx = gt_to_gasgen_map[k]
            if gasgen_idx >= 0:
                gas_term = eta_gt * QLHV * GasGenNeed_prev[gasgen_idx] / baseMVA
                # 线性项
                obj += y[k] * (gen_P[gt_gen_idx] - gas_term)
                # 二次项
                obj += (rho / 2) * (gen_P[gt_gen_idx] * gen_P[gt_gen_idx] 
                                    - 2 * gas_term * gen_P[gt_gen_idx] 
                                    + gas_term * gas_term)
        
        model.setObjective(obj, GRB.MINIMIZE)
        model.optimize()
        
        if model.status == GRB.OPTIMAL or model.status == GRB.SUBOPTIMAL:
            Pg_result = np.array([gen_P[i].X for i in range(n_gen)])
            Va_result = np.array([Va[i].X for i in range(n_bus)])
            phi_g_result = np.array([phi_g_sh[i].X for i in range(n_bus)])
            elec_cost = sum(gencost[k, 5] * Pg_result[k] * 100 for k in range(n_gen))
            return True, Pg_result, Va_result, phi_g_result, elec_cost
        else:
            print(f"警告：电力子问题求解状态: {model.status}")
            return False, None, None, None, None
            
    except Exception as e:
        print(f"电力子问题求解错误: {e}")
        return False, None, None, None, None


def solve_gas_subproblem(mpc, GasD_attacked, y, Pg_curr, rho,
                          gt_idx, gt_to_gasgen_map, 
                          GasBranchIncMatrix, GasSourceIncMatrix, GasGenIncMatrix,
                          eta_gt, QLHV, baseMVA, loadshed_penalty):
    """
    求解天然气子问题

    """
    GasBus = mpc['GasBus']
    GasBranch = mpc['GasBranch']
    GasSource = mpc['GasSource']
    GasGen = mpc['GasGen']
    
    n_GasBus = GasBus.shape[0]
    n_GasBranch = GasBranch.shape[0]
    n_GasSource = GasSource.shape[0]
    n_GasGen = GasGen.shape[0]
    n_gt = len(gt_idx)
    
    try:
        model = Model("Gas_Subproblem")
        model.setParam('OutputFlag', 0)
        model.setParam('NumericFocus', 3)
        model.setParam('FeasibilityTol', 1e-6)
        
        # 决策变量 - 使用合理的边界
        GasFlow = {}
        for k in range(n_GasBranch):
            # 根据管道容量设置流量边界
            C_ij = GasBranch[k, 3]
            max_flow = C_ij * 100  # 估计最大流量
            GasFlow[k] = model.addVar(lb=-max_flow, ub=max_flow, name=f"GasFlow_{k}")
        
        # 压力变量 
        GasPressure = {}
        for j in range(n_GasBus):
            p_min = max(GasBus[j, 2], 1.0)  # 确保最小压力为正
            p_max = GasBus[j, 1]
            GasPressure[j] = model.addVar(lb=p_min, ub=p_max, name=f"GasPressure_{j}")
        
        GasSourceOutput = {}
        for s in range(n_GasSource):
            GasSourceOutput[s] = model.addVar(lb=GasSource[s, 2], ub=GasSource[s, 3], 
                                               name=f"GasSourceOutput_{s}")
        
        GasGenNeed = {}
        for g in range(n_GasGen):
            GasGenNeed[g] = model.addVar(lb=0, ub=GRB.INFINITY, name=f"GasGenNeed_{g}")
        
        phi_q_sh = {}
        for j in range(n_GasBus):
            max_shed = max(0, GasD_attacked[j])
            phi_q_sh[j] = model.addVar(lb=0, ub=max_shed, name=f"phi_q_sh_{j}")
        
        model.update()
        
        # 约束
        # 1. 天然气平衡约束
        for j in range(n_GasBus):
            source_sum = quicksum(GasSourceIncMatrix[j, s] * GasSourceOutput[s] 
                                  for s in range(n_GasSource))
            branch_flow = quicksum(GasBranchIncMatrix[j, b] * GasFlow[b] 
                                   for b in range(n_GasBranch))
            gen_need = quicksum(GasGenIncMatrix[j, g] * GasGenNeed[g] 
                               for g in range(n_GasGen))
            model.addConstr(source_sum == branch_flow + gen_need + GasD_attacked[j] - phi_q_sh[j],
                           name=f"gas_balance_{j}")
        
        # 2. 管道约束 - 使用线性化的Weymouth方程
        
        for k in range(n_GasBranch):
            i_node = int(GasBranch[k, 1]) - 1  # from bus (0-indexed)
            j_node = int(GasBranch[k, 2]) - 1  # to bus (0-indexed)
            C_ij = GasBranch[k, 3]
            
            if C_ij > 0:
                # 使用简化的线性约束
                # 基于初始压力进行线性化
                pi_i_init = GasBus[i_node, 4] if GasBus.shape[1] > 4 else (GasBus[i_node, 1] + GasBus[i_node, 2]) / 2
                pi_j_init = GasBus[j_node, 4] if GasBus.shape[1] > 4 else (GasBus[j_node, 1] + GasBus[j_node, 2]) / 2
                
                # 确保初始压力为正
                pi_i_init = max(pi_i_init, 1.0)
                pi_j_init = max(pi_j_init, 1.0)
                
                # 线性化系数
                avg_pressure = (pi_i_init + pi_j_init) / 2
                lin_coeff = C_ij * avg_pressure

                
                # 简单处理：设置流量的绝对值约束
                model.addConstr(GasFlow[k] <= lin_coeff, name=f"pipe_flow_max_{k}")
                model.addConstr(GasFlow[k] >= -lin_coeff, name=f"pipe_flow_min_{k}")

        # 目标函数
        obj = QuadExpr()
        
        # 天然气成本
        for s in range(n_GasSource):
            obj += GasSource[s, 4] * GasSourceOutput[s]

        for j in range(n_GasBus):
            obj += loadshed_penalty * phi_q_sh[j]
        
        # 耦合惩罚项
        for k in range(n_gt):
            gt_gen_idx = gt_idx[k]
            gasgen_idx = gt_to_gasgen_map[k]
            if gasgen_idx >= 0:
                elec_term = Pg_curr[gt_gen_idx]
                gas_conversion = eta_gt * QLHV / baseMVA

                
                r_const = elec_term  # P_g 是常数
                
                # 线性项: y * (-gas_conversion * q) + (rho/2) * (-2 * r_const * gas_conversion * q)
                obj += -y[k] * gas_conversion * GasGenNeed[gasgen_idx]
                obj += -rho * r_const * gas_conversion * GasGenNeed[gasgen_idx]
                
                # 二次项: (rho/2) * gas_conversion^2 * q^2
                obj += (rho / 2) * gas_conversion * gas_conversion * GasGenNeed[gasgen_idx] * GasGenNeed[gasgen_idx]
                
                # 常数项
                obj += y[k] * r_const + (rho / 2) * r_const * r_const
        
        model.setObjective(obj, GRB.MINIMIZE)
        model.optimize()
        
        if model.status == GRB.OPTIMAL or model.status == GRB.SUBOPTIMAL:
            GasFlow_result = np.array([GasFlow[k].X for k in range(n_GasBranch)])
            GasPressure_result = np.array([GasPressure[j].X for j in range(n_GasBus)])
            GasSourceOutput_result = np.array([GasSourceOutput[s].X for s in range(n_GasSource)])
            GasGenNeed_result = np.array([GasGenNeed[g].X for g in range(n_GasGen)])
            phi_q_result = np.array([phi_q_sh[j].X for j in range(n_GasBus)])
            gas_cost = sum(GasSource[s, 4] * GasSourceOutput_result[s] for s in range(n_GasSource))
            return True, GasFlow_result, GasPressure_result, GasSourceOutput_result, GasGenNeed_result, phi_q_result, gas_cost
        else:
            print(f"警告：天然气子问题求解状态: {model.status}")
            # 尝试使用松弛模型
            return solve_gas_subproblem_relaxed(mpc, GasD_attacked, y, Pg_curr, rho,
                                                 gt_idx, gt_to_gasgen_map, 
                                                 GasBranchIncMatrix, GasSourceIncMatrix, GasGenIncMatrix,
                                                 eta_gt, QLHV, baseMVA, loadshed_penalty)
            
    except Exception as e:
        print(f"天然气子问题求解错误: {e}")
        return False, None, None, None, None, None, None


def solve_gas_subproblem_relaxed(mpc, GasD_attacked, y, Pg_curr, rho,
                                  gt_idx, gt_to_gasgen_map, 
                                  GasBranchIncMatrix, GasSourceIncMatrix, GasGenIncMatrix,
                                  eta_gt, QLHV, baseMVA, loadshed_penalty):
    """
    天然气子问题

    """
    GasBus = mpc['GasBus']
    GasBranch = mpc['GasBranch']
    GasSource = mpc['GasSource']
    GasGen = mpc['GasGen']
    
    n_GasBus = GasBus.shape[0]
    n_GasBranch = GasBranch.shape[0]
    n_GasSource = GasSource.shape[0]
    n_GasGen = GasGen.shape[0]
    n_gt = len(gt_idx)
    
    try:
        model = Model("Gas_Subproblem_Relaxed")
        model.setParam('OutputFlag', 0)
        model.setParam('NumericFocus', 3)
        
        # 决策变量
        GasFlow = {}
        for k in range(n_GasBranch):
            GasFlow[k] = model.addVar(lb=-GRB.INFINITY, ub=GRB.INFINITY, name=f"GasFlow_{k}")
        
        GasPressure = {}
        for j in range(n_GasBus):
            p_min = max(GasBus[j, 2], 0.1)
            p_max = GasBus[j, 1]
            GasPressure[j] = model.addVar(lb=p_min, ub=p_max, name=f"GasPressure_{j}")
        
        GasSourceOutput = {}
        for s in range(n_GasSource):
            GasSourceOutput[s] = model.addVar(lb=GasSource[s, 2], ub=GasSource[s, 3], 
                                               name=f"GasSourceOutput_{s}")
        
        GasGenNeed = {}
        for g in range(n_GasGen):
            GasGenNeed[g] = model.addVar(lb=0, ub=GRB.INFINITY, name=f"GasGenNeed_{g}")
        
        phi_q_sh = {}
        for j in range(n_GasBus):
            max_shed = max(0, GasD_attacked[j])
            phi_q_sh[j] = model.addVar(lb=0, ub=max_shed, name=f"phi_q_sh_{j}")
        
        model.update()
        
        # 天然气平衡约束
        for j in range(n_GasBus):
            source_sum = quicksum(GasSourceIncMatrix[j, s] * GasSourceOutput[s] 
                                  for s in range(n_GasSource))
            branch_flow = quicksum(GasBranchIncMatrix[j, b] * GasFlow[b] 
                                   for b in range(n_GasBranch))
            gen_need = quicksum(GasGenIncMatrix[j, g] * GasGenNeed[g] 
                               for g in range(n_GasGen))
            model.addConstr(source_sum == branch_flow + gen_need + GasD_attacked[j] - phi_q_sh[j],
                           name=f"gas_balance_{j}")
        
        # 目标函数
        obj = QuadExpr()
        
        for s in range(n_GasSource):
            obj += GasSource[s, 4] * GasSourceOutput[s]
        
        for j in range(n_GasBus):
            obj += loadshed_penalty * phi_q_sh[j]
        
        for k in range(n_gt):
            gt_gen_idx = gt_idx[k]
            gasgen_idx = gt_to_gasgen_map[k]
            if gasgen_idx >= 0:
                elec_term = Pg_curr[gt_gen_idx]
                gas_conversion = eta_gt * QLHV / baseMVA
                
                r_const = elec_term
                obj += -y[k] * gas_conversion * GasGenNeed[gasgen_idx]
                obj += -rho * r_const * gas_conversion * GasGenNeed[gasgen_idx]
                obj += (rho / 2) * gas_conversion * gas_conversion * GasGenNeed[gasgen_idx] * GasGenNeed[gasgen_idx]
                obj += y[k] * r_const + (rho / 2) * r_const * r_const
        
        model.setObjective(obj, GRB.MINIMIZE)
        model.optimize()
        
        if model.status == GRB.OPTIMAL or model.status == GRB.SUBOPTIMAL:
            GasFlow_result = np.array([GasFlow[k].X for k in range(n_GasBranch)])
            GasPressure_result = np.array([GasPressure[j].X for j in range(n_GasBus)])
            GasSourceOutput_result = np.array([GasSourceOutput[s].X for s in range(n_GasSource)])
            GasGenNeed_result = np.array([GasGenNeed[g].X for g in range(n_GasGen)])
            phi_q_result = np.array([phi_q_sh[j].X for j in range(n_GasBus)])
            gas_cost = sum(GasSource[s, 4] * GasSourceOutput_result[s] for s in range(n_GasSource))
            return True, GasFlow_result, GasPressure_result, GasSourceOutput_result, GasGenNeed_result, phi_q_result, gas_cost
        else:
            return False, None, None, None, None, None, None
            
    except Exception as e:
        print(f"松弛天然气子问题求解错误: {e}")
        return False, None, None, None, None, None, None


def solve_upper_problem(mpc, PD, GasD, sensitivity_d, sensitivity_l, 
                        tau_d, B_a_PS, B_a_GS, baseMVA):
    """
    求解上层问题（攻击策略优化）
    """
    bus = mpc['bus']
    GasBus = mpc['GasBus']
    
    n_bus = bus.shape[0]
    n_GasBus = GasBus.shape[0]
    
    try:
        model = Model("Upper_Problem")
        model.setParam('OutputFlag', 0)
        
        # 决策变量
        z_a_d = {}
        u_a_d = {}
        for i in range(n_bus):
            M_d = tau_d * PD[i]
            z_a_d[i] = model.addVar(lb=-M_d, ub=M_d, name=f"z_a_d_{i}")
            u_a_d[i] = model.addVar(vtype=GRB.BINARY, name=f"u_a_d_{i}")
        
        z_a_l = {}
        u_a_l = {}
        for j in range(n_GasBus):
            M_l = tau_d * GasD[j]
            z_a_l[j] = model.addVar(lb=-M_l, ub=M_l, name=f"z_a_l_{j}")
            u_a_l[j] = model.addVar(vtype=GRB.BINARY, name=f"u_a_l_{j}")
        
        model.update()
        
        # 约束
        # 1. 攻击数量限制
        model.addConstr(quicksum(u_a_d[i] for i in range(n_bus)) <= B_a_PS, name="elec_attack_limit")
        model.addConstr(quicksum(u_a_l[j] for j in range(n_GasBus)) <= B_a_GS, name="gas_attack_limit")
        
        for i in range(n_bus):
            M_d = tau_d * PD[i]
            model.addConstr(z_a_d[i] >= -u_a_d[i] * M_d, name=f"z_d_bigM_lb_{i}")
            model.addConstr(z_a_d[i] <= u_a_d[i] * M_d, name=f"z_d_bigM_ub_{i}")
        
        for j in range(n_GasBus):
            M_l = tau_d * GasD[j]
            model.addConstr(z_a_l[j] >= -u_a_l[j] * M_l, name=f"z_l_bigM_lb_{j}")
            model.addConstr(z_a_l[j] <= u_a_l[j] * M_l, name=f"z_l_bigM_ub_{j}")
        
        # 隐蔽性约束 (攻击总和为零)
        model.addConstr(quicksum(z_a_d[i] for i in range(n_bus)) == 0, name="stealth_elec")
        model.addConstr(quicksum(z_a_l[j] for j in range(n_GasBus)) == 0, name="stealth_gas")
        
        # 目标函数: 最大化预期损失 
        obj = quicksum(sensitivity_d[i] * z_a_d[i] for i in range(n_bus)) + \
              quicksum(sensitivity_l[j] * z_a_l[j] for j in range(n_GasBus))
        
        model.setObjective(obj, GRB.MAXIMIZE)
        model.optimize()
        
        if model.status == GRB.OPTIMAL or model.status == GRB.SUBOPTIMAL:
            z_a_d_result = np.array([z_a_d[i].X for i in range(n_bus)])
            z_a_l_result = np.array([z_a_l[j].X for j in range(n_GasBus)])
            u_a_d_result = np.array([u_a_d[i].X for i in range(n_bus)])
            u_a_l_result = np.array([u_a_l[j].X for j in range(n_GasBus)])
            obj_val = model.objVal
            return True, z_a_d_result, z_a_l_result, u_a_d_result, u_a_l_result, obj_val
        else:
            print(f"警告：上层问题求解状态: {model.status}")
            return False, None, None, None, None, None
            
    except Exception as e:
        print(f"上层问题求解错误: {e}")
        return False, None, None, None, None, None


def compute_sensitivity(mpc, phi_g_values, phi_q_values, PD, GasD, 
                        gen, gt_idx, GasGen, branch, GasBranch):
    """
    计算敏感性系数
    """
    bus = mpc['bus']
    GasBus = mpc['GasBus']
    
    n_bus = bus.shape[0]
    n_GasBus = GasBus.shape[0]
    n_branch = branch.shape[0]
    n_GasBranch = GasBranch.shape[0]
    
    sensitivity_d = np.zeros(n_bus)
    sensitivity_l = np.zeros(n_GasBus)
    
    # 计算电力系统节点度数
    elec_degrees = np.zeros(n_bus)
    for j in range(n_bus):
        elec_degrees[j] = np.sum(branch[:, 0] == j + 1) + np.sum(branch[:, 1] == j + 1)
    max_elec_degree = max(elec_degrees) if max(elec_degrees) > 0 else 1
    
    # 计算天然气系统节点度数
    gas_degrees = np.zeros(n_GasBus)
    for j in range(n_GasBus):
        gas_degrees[j] = np.sum(GasBranch[:, 1] == j + 1) + np.sum(GasBranch[:, 2] == j + 1)
    max_gas_degree = max(gas_degrees) if max(gas_degrees) > 0 else 1
    
    # 计算电力系统敏感性
    total_PD = sum(PD) if sum(PD) > 0 else 1
    for i in range(n_bus):
        base_sensitivity = 0
        
        if phi_g_values[i] > 1e-6 and PD[i] > 1e-6:
            base_sensitivity = phi_g_values[i] / PD[i]
        else:
            base_sensitivity = PD[i] / total_PD
        
        topology_factor = 1 + 0.1 * elec_degrees[i] / max_elec_degree
        
        gen_factor = 1
        connected_gens = np.where(gen[:, 0] == i + 1)[0]
        if len(connected_gens) > 0:
            gen_capacity = np.sum(gen[connected_gens, 8])
            gen_factor = 1 + 0.2 * gen_capacity / max(gen[:, 8])
        
        coupling_factor = 1
        if any(gen[gt_idx, 0] == i + 1):
            coupling_factor = 2.0
        
        sensitivity_d[i] = base_sensitivity * topology_factor * gen_factor * coupling_factor
    
    # 计算天然气系统敏感性
    total_GasD = sum(GasD) if sum(GasD) > 0 else 1
    for j in range(n_GasBus):
        base_sensitivity = 0
        
        if phi_q_values[j] > 1e-6 and GasD[j] > 1e-6:
            base_sensitivity = phi_q_values[j] / GasD[j]
        else:
            base_sensitivity = GasD[j] / total_GasD
        
        topology_factor = 1 + 0.15 * gas_degrees[j] / max_gas_degree
        
        source_factor = 1
        GasSource = mpc['GasSource']
        connected_sources = np.where(GasSource[:, 1] == j + 1)[0]
        if len(connected_sources) > 0:
            source_capacity = np.sum(GasSource[connected_sources, 3])
            source_factor = 1 + 0.3 * source_capacity / max(GasSource[:, 3])
        
        coupling_factor = 1
        if any(GasGen[:, 0] == j + 1):
            coupling_factor = 2.5
        
        sensitivity_l[j] = base_sensitivity * topology_factor * source_factor * coupling_factor
    
    # 归一化
    if max(sensitivity_d) > 0:
        sensitivity_d = sensitivity_d / max(sensitivity_d)
    if max(sensitivity_l) > 0:
        sensitivity_l = sensitivity_l / max(sensitivity_l)
    
    return sensitivity_d, sensitivity_l


def initialize_attack_strategy(PD, GasD, B_a_PS, B_a_GS, tau_d, n_bus, n_GasBus):
    """
    初始化攻击策略
    """
    z_a_d_current = np.zeros(n_bus)
    z_a_l_current = np.zeros(n_GasBus)
    u_a_d_current = np.zeros(n_bus)
    u_a_l_current = np.zeros(n_GasBus)
    
    # 电力系统攻击初始化
    if B_a_PS > 0:
        sorted_load_idx = np.argsort(PD)[::-1]
        num_attack_nodes = min(B_a_PS, max(2, (B_a_PS // 2) * 2))
        
        if num_attack_nodes >= 2:
            half = num_attack_nodes // 2
            positive_nodes = sorted_load_idx[:half]
            negative_nodes = sorted_load_idx[half:num_attack_nodes]
            
            total_positive_capacity = sum(PD[positive_nodes])
            total_negative_capacity = sum(PD[negative_nodes])
            
            if total_positive_capacity > 0 and total_negative_capacity > 0:
                for node_idx in positive_nodes:
                    u_a_d_current[node_idx] = 1
                    z_a_d_current[node_idx] = tau_d * PD[node_idx] * (total_negative_capacity / total_positive_capacity)
                
                for node_idx in negative_nodes:
                    u_a_d_current[node_idx] = 1
                    z_a_d_current[node_idx] = -tau_d * PD[node_idx]
                
                current_sum = sum(z_a_d_current)
                if abs(current_sum) > 1e-10 and len(positive_nodes) > 0:
                    z_a_d_current[positive_nodes[0]] -= current_sum
    
    # 天然气系统攻击初始化
    if B_a_GS > 0:
        sorted_gas_load_idx = np.argsort(GasD)[::-1]
        num_gas_attack_nodes = min(B_a_GS, max(2, (B_a_GS // 2) * 2))
        
        if num_gas_attack_nodes >= 2:
            half = num_gas_attack_nodes // 2
            positive_gas_nodes = sorted_gas_load_idx[:half]
            negative_gas_nodes = sorted_gas_load_idx[half:num_gas_attack_nodes]
            
            total_positive_gas_capacity = sum(GasD[positive_gas_nodes])
            total_negative_gas_capacity = sum(GasD[negative_gas_nodes])
            
            if total_positive_gas_capacity > 0 and total_negative_gas_capacity > 0:
                for node_idx in positive_gas_nodes:
                    u_a_l_current[node_idx] = 1
                    z_a_l_current[node_idx] = tau_d * GasD[node_idx] * (total_negative_gas_capacity / total_positive_gas_capacity)
                
                for node_idx in negative_gas_nodes:
                    u_a_l_current[node_idx] = 1
                    z_a_l_current[node_idx] = -tau_d * GasD[node_idx]
                
                current_gas_sum = sum(z_a_l_current)
                if abs(current_gas_sum) > 1e-10 and len(positive_gas_nodes) > 0:
                    z_a_l_current[positive_gas_nodes[0]] -= current_gas_sum
    
    return z_a_d_current, z_a_l_current, u_a_d_current, u_a_l_current


def compute_dynamic_penalty(upper_objective, min_penalty=100.0):
    dynamic_penalty = LOADSHED_PENALTY_MULTIPLIER * upper_objective
    return max(min_penalty, dynamic_penalty)


def main():
    """
    主函数：双层优化求解
    """
    print("=" * 60)
    print("电力-天然气耦合系统虚假数据注入攻击双层优化")
    print("使用Gurobi求解器 + ADMM分解算法")
    print("=" * 60)
    
    # 获取数据
    mpc = get_case_data()
    
    baseMVA = mpc['baseMVA']
    bus = mpc['bus']
    gen = mpc['gen']
    branch = mpc['branch']
    gencost = mpc['gencost']
    GasBranch = mpc['GasBranch']
    GasBus = mpc['GasBus']
    GasSource = mpc['GasSource']
    GasGen = mpc['GasGen']
    
    # 系统参数
    n_gen = gen.shape[0]
    n_bus = bus.shape[0]
    n_branch = branch.shape[0]
    
    eta_gt = 0.35
    QLHV = 9.7 * 1000
    
    n_GasBus = GasBus.shape[0]
    n_GasBranch = GasBranch.shape[0]
    n_GasSource = GasSource.shape[0]
    n_GasGen = GasGen.shape[0]
    
    # 负荷数据处理
    PD = bus[:, 2] / baseMVA
    P_factor = PD / sum(PD) if sum(PD) > 0 else np.ones(n_bus) / n_bus
    P_sum = mpc['load'][0] / baseMVA
    PD = P_factor * P_sum
    
    # 天然气负荷
    GasFactor = np.ones(n_GasBus) * (1 / n_GasBus)
    GasD = GasFactor * mpc['GasLoad'][0]
    
    # 燃气轮机索引和映射
    gt_idx = np.where(gen[:, 16] == 2)[0]
    n_gt = len(gt_idx)
    gt_to_gasgen_map = -np.ones(n_gt, dtype=int)
    
    for k in range(n_gt):
        gt_bus = gen[gt_idx[k], 0]
        for g in range(n_GasGen):
            if GasGen[g, 1] == gt_bus:
                gt_to_gasgen_map[k] = g
                break
    
    print(f"\n系统规模:")
    print(f"  电力节点数: {n_bus}")
    print(f"  发电机数: {n_gen}")
    print(f"  燃气轮机数: {n_gt}")
    print(f"  天然气节点数: {n_GasBus}")
    print(f"  天然气管道数: {n_GasBranch}")
    
    # 计算导纳矩阵
    Bbus, Bf = make_Bdc(baseMVA, bus, branch)
    
    # 网络拓扑矩阵
    GenIncMatrix = np.zeros((n_bus, n_gen))
    for i in range(n_gen):
        GenIncMatrix[int(gen[i, 0]) - 1, i] = 1
    
    GasBranchIncMatrix = np.zeros((n_GasBus, n_GasBranch))
    for i in range(n_GasBranch):
        GasBranchIncMatrix[int(GasBranch[i, 1]) - 1, i] = 1
        GasBranchIncMatrix[int(GasBranch[i, 2]) - 1, i] = -1
    
    GasSourceIncMatrix = np.zeros((n_GasBus, n_GasSource))
    for i in range(n_GasSource):
        GasSourceIncMatrix[int(GasSource[i, 1]) - 1, i] = 1
    
    GasGenIncMatrix = np.zeros((n_GasBus, n_GasGen))
    for i in range(n_GasGen):
        GasGenIncMatrix[int(GasGen[i, 0]) - 1, i] = 1
    
    # 参数设置
    max_bilevel_iter = 15
    bilevel_tol = 1e-3
    
    # 从环境变量读取tau_d参数，如果没有设置则使用默认值
    import os
    tau_d = float(os.environ.get('TAU_D', 0.5))
    
    B_a_PS = min(6, n_bus // 6)
    B_a_GS = min(3, n_GasBus // 4)
    
    # ADMM参数
    rho_initial = 0.5
    rho_max = 10.0
    rho_min = 0.01
    rho_update_factor = 2.0
    max_ADMM_iter = 40
    ADMM_tol_initial = 1e-4
    ADMM_tol_min = 1e-6
    
    print(f"\n攻击参数:")
    print(f"  攻击幅度 tau_d: {tau_d}")
    print(f"  电力可攻击节点数: {B_a_PS}")
    print(f"  天然气可攻击节点数: {B_a_GS}")
    
    # ========== 计算基准情况 ==========
    print("\n" + "=" * 50)
    print("计算基准情况（无攻击）...")
    print("=" * 50)
    

    loadshed_penalty_baseline = LOADSHED_PENALTY_BASE
    
    y_baseline = np.zeros(n_gt)
    Pg_prev_baseline = np.zeros(n_gen)
    GasGenNeed_prev_baseline = np.zeros(n_GasGen)
    rho_baseline = rho_initial
    
    baseline_converged = False
    for admm_iter in range(max_ADMM_iter):
        success_elec, Pg_curr_baseline, Va_baseline, phi_g_baseline, elec_cost_baseline = \
            solve_electric_subproblem(mpc, PD, y_baseline, GasGenNeed_prev_baseline, rho_baseline,
                                      gt_idx, gt_to_gasgen_map, GenIncMatrix, Bbus, Bf,
                                      eta_gt, QLHV, baseMVA, loadshed_penalty_baseline)
        
        if not success_elec:
            print("基准电力子系统求解失败")
            break
        
        success_gas, GasFlow_baseline, GasPressure_baseline, GasSourceOutput_baseline, \
            GasGenNeed_curr_baseline, phi_q_baseline, gas_cost_baseline = \
            solve_gas_subproblem(mpc, GasD, y_baseline, Pg_curr_baseline, rho_baseline,
                                 gt_idx, gt_to_gasgen_map,
                                 GasBranchIncMatrix, GasSourceIncMatrix, GasGenIncMatrix,
                                 eta_gt, QLHV, baseMVA, loadshed_penalty_baseline)
        
        if not success_gas:
            print("基准天然气子系统求解失败")
            break
        
        primal_residual = np.zeros(n_gt)
        dual_residual = np.zeros(n_gt)
        
        for k in range(n_gt):
            gasgen_idx = gt_to_gasgen_map[k]
            if gasgen_idx >= 0:
                primal_residual[k] = GasGenNeed_curr_baseline[gasgen_idx] - \
                                     Pg_curr_baseline[gt_idx[k]] * baseMVA / (eta_gt * QLHV)
                dual_residual[k] = rho_baseline * (GasGenNeed_curr_baseline[gasgen_idx] - 
                                                   GasGenNeed_prev_baseline[gasgen_idx])
                y_baseline[k] += rho_baseline * primal_residual[k]
        
        primal_norm = np.linalg.norm(primal_residual)
        dual_norm = np.linalg.norm(dual_residual)
        
        Pg_prev_baseline = Pg_curr_baseline.copy()
        GasGenNeed_prev_baseline = GasGenNeed_curr_baseline.copy()
        
        total_residual = dual_norm
        if total_residual < ADMM_tol_initial:
            baseline_converged = True
            print(f"基准ADMM在第{admm_iter + 1}轮收敛，残差: {total_residual:.6f}")
            break
    
    if baseline_converged:
        total_loadshed_baseline = np.sum(phi_g_baseline) + np.sum(phi_q_baseline)
        baseline_cost = elec_cost_baseline + gas_cost_baseline + loadshed_penalty_baseline * total_loadshed_baseline
        baseline_cost_without_penalty = elec_cost_baseline + gas_cost_baseline
        
        print(f"\n基准运行结果:")
        print(f"  电力切负荷: {np.sum(phi_g_baseline) * baseMVA:.4f} MW")
        print(f"  天然气切负荷: {np.sum(phi_q_baseline):.6f}")
        print(f"  总成本: {baseline_cost:.2f}")
        print(f"发电机出力 (p.u.): {np.round(Pg_prev_baseline, 4)}")
    else:
        print("基准情况求解未收敛")
        baseline_cost = float('inf')
        baseline_cost_without_penalty = float('inf')
    
    # ========== 双层优化主循环 ==========
    print("\n" + "=" * 50)
    print("开始双层优化...")
    print("=" * 50)
    
    z_a_d_current, z_a_l_current, u_a_d_current, u_a_l_current = \
        initialize_attack_strategy(PD, GasD, B_a_PS, B_a_GS, tau_d, n_bus, n_GasBus)
    
    print(f"\n攻击策略初始化验证:")
    print(f"  电力系统总攻击量: {sum(z_a_d_current):.10f}")
    print(f"  天然气系统总攻击量: {sum(z_a_l_current):.10f}")
    print(f"  电力攻击节点数: {int(sum(u_a_d_current))}/{B_a_PS}")
    print(f"  天然气攻击节点数: {int(sum(u_a_l_current))}/{B_a_GS}")
    
    obj_upper_history = []
    obj_lower_history = []
    total_loadshed_history = []
    penalty_history = [] 
    
    best_upper_obj = -np.inf
    best_attack_strategy = {}
    

    current_upper_objective = 1.0  # 
    current_loadshed_penalty = LOADSHED_PENALTY_BASE  
    
    for bilevel_iter in range(max_bilevel_iter):
        print(f"\n{'=' * 40}")
        print(f"双层迭代第 {bilevel_iter + 1} 轮")
        print(f"{'=' * 40}")
        
        # ===== 第一步：求解下层问题 =====
        print("求解下层问题...")
        
        PD_attacked = PD + z_a_d_current
        GasD_attacked = GasD + z_a_l_current
        
        min_load_factor = 0.05
        PD_attacked = np.maximum(PD_attacked, min_load_factor * PD)
        GasD_attacked = np.maximum(GasD_attacked, min_load_factor * GasD)
        
        y = np.zeros(n_gt)
        Pg_prev = Pg_prev_baseline.copy() if baseline_converged else np.zeros(n_gen)
        GasGenNeed_prev = GasGenNeed_prev_baseline.copy() if baseline_converged else np.zeros(n_GasGen)
        rho = rho_initial
        
        ADMM_tol_current = max(ADMM_tol_min, ADMM_tol_initial / np.sqrt(bilevel_iter + 1))
        
        admm_converged = False
        lower_solve_success = True
        
        for admm_iter in range(max_ADMM_iter):
           
            success_elec, Pg_curr, Va_attack, phi_g_attack, elec_cost_attack = \
                solve_electric_subproblem(mpc, PD_attacked, y, GasGenNeed_prev, rho,
                                          gt_idx, gt_to_gasgen_map, GenIncMatrix, Bbus, Bf,
                                          eta_gt, QLHV, baseMVA, current_loadshed_penalty)
            
            if not success_elec:
                lower_solve_success = False
                break
            
            success_gas, GasFlow_attack, GasPressure_attack, GasSourceOutput_attack, \
                GasGenNeed_curr, phi_q_attack, gas_cost_attack = \
                solve_gas_subproblem(mpc, GasD_attacked, y, Pg_curr, rho,
                                     gt_idx, gt_to_gasgen_map,
                                     GasBranchIncMatrix, GasSourceIncMatrix, GasGenIncMatrix,
                                     eta_gt, QLHV, baseMVA, current_loadshed_penalty)
            
            if not success_gas:
                lower_solve_success = False
                break
            
            primal_residual = np.zeros(n_gt)
            dual_residual = np.zeros(n_gt)
            
            for k in range(n_gt):
                gasgen_idx = gt_to_gasgen_map[k]
                if gasgen_idx >= 0:
                    primal_residual[k] = GasGenNeed_curr[gasgen_idx] - \
                                         Pg_curr[gt_idx[k]] * baseMVA / (eta_gt * QLHV)
                    dual_residual[k] = rho * (GasGenNeed_curr[gasgen_idx] - GasGenNeed_prev[gasgen_idx])
                    y[k] += rho * primal_residual[k]
            
            primal_norm = np.linalg.norm(primal_residual)
            dual_norm = np.linalg.norm(dual_residual)
            
            if primal_norm > 10 * dual_norm and rho < rho_max:
                rho = min(rho * rho_update_factor, rho_max)
            elif dual_norm > 10 * primal_norm and rho > rho_min:
                rho = max(rho / rho_update_factor, rho_min)
            
            Pg_prev = Pg_curr.copy()
            GasGenNeed_prev = GasGenNeed_curr.copy()
            
            total_residual = primal_norm + dual_norm
            if total_residual < ADMM_tol_current:
                admm_converged = True
                print(f"  ADMM在第{admm_iter + 1}轮收敛，残差: {total_residual:.6f}")
                break
        
        if not lower_solve_success:
            print("下层问题求解失败，尝试减小攻击强度...")
            z_a_d_current *= 0.5
            z_a_l_current *= 0.5
            continue
        
        elec_loadshed = sum(phi_g_attack)
        gas_loadshed = sum(phi_q_attack)
        total_loadshed = elec_loadshed + gas_loadshed
        loadshed_penalty_cost = current_loadshed_penalty * total_loadshed
        current_total_cost = elec_cost_attack + gas_cost_attack + loadshed_penalty_cost
        
        print(f"  下层结果:")
        print(f"    电力切负荷: {elec_loadshed * baseMVA:.4f} MW")
        print(f"    天然气切负荷: {gas_loadshed:.6f}")
        print(f"    总成本: {current_total_cost:.2f}")
        
        obj_lower_history.append(current_total_cost)
        total_loadshed_history.append(total_loadshed)
        penalty_history.append(current_loadshed_penalty)
        
        
        # ===== 第二步：求解上层问题 =====
        print("求解上层问题...")
        
        sensitivity_d, sensitivity_l = compute_sensitivity(
            mpc, phi_g_attack, phi_q_attack, PD, GasD,
            gen, gt_idx, GasGen, branch, GasBranch
        )
        
        success_upper, z_a_d_new, z_a_l_new, u_a_d_new, u_a_l_new, upper_obj_val = \
            solve_upper_problem(mpc, PD, GasD, sensitivity_d, sensitivity_l,
                               tau_d, B_a_PS, B_a_GS, baseMVA)
        
        if not success_upper:
            print("上层问题求解失败，使用当前策略")
            z_a_d_new = z_a_d_current.copy()
            z_a_l_new = z_a_l_current.copy()
            u_a_d_new = u_a_d_current.copy()
            u_a_l_new = u_a_l_current.copy()
            upper_obj_val = current_upper_objective  # 保持之前的值
        
        obj_upper_history.append(upper_obj_val)
        print(f"  上层结果: 目标值={upper_obj_val:.6f}")
        
        current_upper_objective = upper_obj_val
        new_loadshed_penalty = compute_dynamic_penalty(current_upper_objective)
        current_loadshed_penalty = new_loadshed_penalty
        
        if upper_obj_val > best_upper_obj:
            best_upper_obj = upper_obj_val
            best_attack_strategy = {
                'z_a_d': z_a_d_new.copy(),
                'z_a_l': z_a_l_new.copy(),
                'u_a_d': u_a_d_new.copy(),
                'u_a_l': u_a_l_new.copy(),
                'upper_objective': upper_obj_val,
                'lower_objective': current_total_cost,
                'elec_cost': elec_cost_attack,
                'gas_cost': gas_cost_attack,
                'loadshed_penalty': loadshed_penalty_cost,
                'loadshed_penalty_coeff': current_loadshed_penalty,
                'total_loadshed': total_loadshed,
                'elec_loadshed': elec_loadshed,
                'gas_loadshed': gas_loadshed,
                'iteration': bilevel_iter + 1
            }
            print("  ✓ 更新最佳攻击策略！")
        
        strategy_change = np.linalg.norm(z_a_d_new - z_a_d_current) + \
                         np.linalg.norm(z_a_l_new - z_a_l_current) + \
                         np.linalg.norm(u_a_d_new - u_a_d_current) + \
                         np.linalg.norm(u_a_l_new - u_a_l_current)
        
        print(f"  策略变化: {strategy_change:.6f}")
        
        if strategy_change < bilevel_tol:
            print(f"双层迭代在第{bilevel_iter + 1}轮收敛！")
            break
        
        alpha = 0.7
        z_a_d_current = alpha * z_a_d_new + (1 - alpha) * z_a_d_current
        z_a_l_current = alpha * z_a_l_new + (1 - alpha) * z_a_l_current
        u_a_d_current = u_a_d_new.copy()
        u_a_l_current = u_a_l_new.copy()
        
        attacked_buses = np.where(u_a_d_current > 0.5)[0]
        attacked_gas_buses = np.where(u_a_l_current > 0.5)[0]
        print(f"  当前电力攻击节点: {attacked_buses + 1}")
        print(f"  当前天然气攻击节点: {attacked_gas_buses + 1}")
    
    # 保存最后一次迭代的总成本
    final_iteration_cost = current_total_cost
    
    # ========== 最终结果汇总 ==========
    print("\n" + "=" * 60)
    print("求解完成")
    print("=" * 60)
    
    print(f"\n基准情况:")
    print(f"  总成本: {baseline_cost:.2f}")

    if best_attack_strategy:
        print(f"\n最佳攻击结果:")
        print(f"  系统总成本: {final_iteration_cost:.2f}")
        print(f"  上层目标值: {best_attack_strategy['upper_objective']:.6f}")
        
        print(f"  总切负荷量: {best_attack_strategy['total_loadshed']:.6f}")
        print(f"    - 电力切负荷: {best_attack_strategy['elec_loadshed'] * baseMVA:.4f} MW")
        print(f"    - 天然气切负荷: {best_attack_strategy['gas_loadshed']:.6f}")
        print(f"  最佳迭代: {best_attack_strategy['iteration']}")
        
        best_elec_nodes = np.where(best_attack_strategy['u_a_d'] > 0.5)[0]
        best_gas_nodes = np.where(best_attack_strategy['u_a_l'] > 0.5)[0]
        print(f"\n最佳攻击策略:")
        print(f"  电力攻击节点: {best_elec_nodes + 1}")
        print(f"  天然气攻击节点: {best_gas_nodes + 1}")
        
        if len(best_elec_nodes) > 0:
            print(f"  电力攻击强度:")
            for node in best_elec_nodes:
                print(f"    节点{node + 1}: {best_attack_strategy['z_a_d'][node] * baseMVA:.3f} MW")
        
        if len(best_gas_nodes) > 0:
            print(f"  天然气攻击强度:")
            for node in best_gas_nodes:
                print(f"    节点{node + 1}: {best_attack_strategy['z_a_l'][node]:.6f}")
    
    if len(obj_upper_history) > 1:
        print(f"\n迭代历史:")
        print(f"  上层目标历史: {[f'{x:.4f}' for x in obj_upper_history]}")
        print(f"  下层成本历史: {[f'{x:.2f}' for x in obj_lower_history]}")

    return best_attack_strategy, obj_upper_history, obj_lower_history, penalty_history


if __name__ == "__main__":
    best_strategy, upper_hist, lower_hist, penalty_hist = main()
