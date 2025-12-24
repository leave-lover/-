"""
电力-天然气耦合系统虚假数据注入攻击双层优化模型
增加保密设备：部署保密设备的节点完全不可被攻击
全节点防护模式

"""

import numpy as np
from gurobipy import Model, GRB, QuadExpr, quicksum
import warnings
warnings.filterwarnings('ignore')

from elec39_gas20 import get_case_data

LOADSHED_PENALTY_BASE = 1000.0
LOADSHED_PENALTY_MULTIPLIER = 1000.0


# ==================== 保密设备模块 ====================

class SecureDeviceSystem:
    """
    保密设备系统类
    
    功能：
    1. 在节点部署保密设备，使该节点完全免疫攻击
    2. 攻击者无法选择已部署保密设备的节点作为攻击目标
    3. 即使攻击者尝试攻击，攻击向量也会被完全阻止
    """
    
    def __init__(self, n_bus, n_GasBus, secure_params=None):
        """
        初始化保密设备系统
        
        参数:
            n_bus: 电力系统节点数
            n_GasBus: 天然气系统节点数
            secure_params: 保密设备参数
        """
        self.n_bus = n_bus
        self.n_GasBus = n_GasBus
        
        # 默认参数
        default_params = {
            'full_protection': True,           # 全节点保护模式
            'elec_secure_nodes': None,         # 电力保密节点列表（None表示全部）
            'gas_secure_nodes': None,          # 天然气保密节点列表（None表示全部）
            'protection_level': 1.0,           # 保护等级 (1.0 = 100%完全保护)
        }
        
        self.params = default_params if secure_params is None else {**default_params, **secure_params}
        
        # 初始化保密设备部署状态
        if self.params['full_protection']:
            # 全节点部署保密设备
            self.elec_secure_mask = np.ones(n_bus, dtype=bool)
            self.gas_secure_mask = np.ones(n_GasBus, dtype=bool)
        else:
            # 指定节点部署
            self.elec_secure_mask = np.zeros(n_bus, dtype=bool)
            self.gas_secure_mask = np.zeros(n_GasBus, dtype=bool)
            
            if self.params['elec_secure_nodes'] is not None:
                for node in self.params['elec_secure_nodes']:
                    if 0 <= node < n_bus:
                        self.elec_secure_mask[node] = True
            
            if self.params['gas_secure_nodes'] is not None:
                for node in self.params['gas_secure_nodes']:
                    if 0 <= node < n_GasBus:
                        self.gas_secure_mask[node] = True
        
        # 统计信息
        self.attacks_blocked_elec = np.zeros(n_bus)
        self.attacks_blocked_gas = np.zeros(n_GasBus)
        self.total_attack_attempts = 0
        self.total_attacks_blocked = 0
        
        self._print_deployment_info()
    
    def _print_deployment_info(self):
        """打印保密设备部署信息"""
        print(f"\n{'='*60}")
        print("           保密设备系统初始化完成")
        print(f"{'='*60}")
        print(f"  电力系统保密节点: {np.sum(self.elec_secure_mask)}/{self.n_bus} "
              f"({100*np.sum(self.elec_secure_mask)/self.n_bus:.1f}%)")
        print(f"  天然气系统保密节点: {np.sum(self.gas_secure_mask)}/{self.n_GasBus} "
              f"({100*np.sum(self.gas_secure_mask)/self.n_GasBus:.1f}%)")
        print(f"  保护等级: {self.params['protection_level']*100:.0f}%")
        
        if self.params['full_protection']:
            print(f"\n  [全节点保护模式] 所有节点均部署保密设备")
            print(f"  → 攻击者无法对任何节点发起攻击")
        else:
            elec_protected = np.where(self.elec_secure_mask)[0] + 1
            gas_protected = np.where(self.gas_secure_mask)[0] + 1
            print(f"\n  电力保密节点: {elec_protected}")
            print(f"  天然气保密节点: {gas_protected}")
    
    def get_attackable_nodes(self):
        """
        获取可被攻击的节点（未部署保密设备的节点）
        
        返回:
            elec_attackable: 电力系统可攻击节点索引
            gas_attackable: 天然气系统可攻击节点索引
        """
        elec_attackable = np.where(~self.elec_secure_mask)[0]
        gas_attackable = np.where(~self.gas_secure_mask)[0]
        return elec_attackable, gas_attackable
    
    def get_secure_nodes(self):
        """
        获取已部署保密设备的节点
        
        返回:
            elec_secure: 电力系统保密节点索引
            gas_secure: 天然气系统保密节点索引
        """
        elec_secure = np.where(self.elec_secure_mask)[0]
        gas_secure = np.where(self.gas_secure_mask)[0]
        return elec_secure, gas_secure
    
    def block_attack(self, z_a_d, z_a_l, u_a_d, u_a_l, verbose=True):
        """
        阻止对保密节点的攻击
        
        参数:
            z_a_d: 电力系统攻击向量
            z_a_l: 天然气系统攻击向量
            u_a_d: 电力系统攻击节点指示
            u_a_l: 天然气系统攻击节点指示
            verbose: 是否打印信息
            
        返回:
            z_a_d_blocked: 阻止后的电力攻击向量
            z_a_l_blocked: 阻止后的天然气攻击向量
            u_a_d_blocked: 阻止后的电力攻击指示
            u_a_l_blocked: 阻止后的天然气攻击指示
            block_report: 阻止报告
        """
        protection_level = self.params['protection_level']
        
        z_a_d_blocked = z_a_d.copy()
        z_a_l_blocked = z_a_l.copy()
        u_a_d_blocked = u_a_d.copy()
        u_a_l_blocked = u_a_l.copy()
        
        elec_blocked_count = 0
        gas_blocked_count = 0
        elec_blocked_nodes = []
        gas_blocked_nodes = []
        
        # 阻止电力系统攻击
        for i in range(self.n_bus):
            if self.elec_secure_mask[i]:
                if abs(z_a_d[i]) > 1e-10 or u_a_d[i] > 0.5:
                    # 记录被阻止的攻击
                    self.attacks_blocked_elec[i] += 1
                    elec_blocked_count += 1
                    elec_blocked_nodes.append(i + 1)
                    
                    # 完全阻止攻击
                    z_a_d_blocked[i] = z_a_d[i] * (1 - protection_level)
                    u_a_d_blocked[i] = 0
        
        # 阻止天然气系统攻击
        for j in range(self.n_GasBus):
            if self.gas_secure_mask[j]:
                if abs(z_a_l[j]) > 1e-10 or u_a_l[j] > 0.5:
                    self.attacks_blocked_gas[j] += 1
                    gas_blocked_count += 1
                    gas_blocked_nodes.append(j + 1)
                    
                    z_a_l_blocked[j] = z_a_l[j] * (1 - protection_level)
                    u_a_l_blocked[j] = 0
        
        self.total_attack_attempts += elec_blocked_count + gas_blocked_count
        self.total_attacks_blocked += elec_blocked_count + gas_blocked_count
        
        block_report = {
            'elec_attacks_blocked': elec_blocked_count,
            'gas_attacks_blocked': gas_blocked_count,
            'elec_blocked_nodes': elec_blocked_nodes,
            'gas_blocked_nodes': gas_blocked_nodes,
            'total_blocked': elec_blocked_count + gas_blocked_count,
            'original_attack_magnitude_elec': np.sum(np.abs(z_a_d)),
            'blocked_attack_magnitude_elec': np.sum(np.abs(z_a_d)) - np.sum(np.abs(z_a_d_blocked)),
            'original_attack_magnitude_gas': np.sum(np.abs(z_a_l)),
            'blocked_attack_magnitude_gas': np.sum(np.abs(z_a_l)) - np.sum(np.abs(z_a_l_blocked)),
        }
        
        if verbose and block_report['total_blocked'] > 0:
            print(f"\n  [保密设备阻止报告]")
            print(f"    阻止电力攻击: {elec_blocked_count} 个节点 {elec_blocked_nodes}")
            print(f"    阻止天然气攻击: {gas_blocked_count} 个节点 {gas_blocked_nodes}")
            print(f"    电力攻击削减: {block_report['blocked_attack_magnitude_elec']:.6f}")
            print(f"    天然气攻击削减: {block_report['blocked_attack_magnitude_gas']:.6f}")
        
        return z_a_d_blocked, z_a_l_blocked, u_a_d_blocked, u_a_l_blocked, block_report
    
    def get_statistics(self):
        """获取保密设备统计信息"""
        return {
            'total_attack_attempts': self.total_attack_attempts,
            'total_attacks_blocked': self.total_attacks_blocked,
            'block_rate': self.total_attacks_blocked / max(1, self.total_attack_attempts),
            'elec_block_counts': self.attacks_blocked_elec.copy(),
            'gas_block_counts': self.attacks_blocked_gas.copy(),
            'elec_protected_nodes': np.sum(self.elec_secure_mask),
            'gas_protected_nodes': np.sum(self.gas_secure_mask),
        }


# ==================== 原有函数 ====================

def make_Bdc(baseMVA, bus, branch):
    """计算直流潮流的导纳矩阵"""
    n_bus = bus.shape[0]
    n_branch = branch.shape[0]
    
    b = np.zeros(n_branch)
    for i in range(n_branch):
        if branch[i, 3] != 0:
            tap = branch[i, 8] if branch[i, 8] != 0 else 1.0
            b[i] = 1.0 / (branch[i, 3] * tap)
    
    Bf = np.zeros((n_branch, n_bus))
    for i in range(n_branch):
        f = int(branch[i, 0]) - 1
        t = int(branch[i, 1]) - 1
        Bf[i, f] = b[i]
        Bf[i, t] = -b[i]
    
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
    """求解电力子问题"""
    bus = mpc['bus']
    gen = mpc['gen']
    branch = mpc['branch']
    gencost = mpc['gencost']
    
    n_bus = bus.shape[0]
    n_gen = gen.shape[0]
    n_branch = branch.shape[0]
    n_gt = len(gt_idx)
    
    ref_bus = np.where(bus[:, 1] == 3)[0][0]
    
    try:
        model = Model("Electric_Subproblem")
        model.setParam('OutputFlag', 0)
        model.setParam('NonConvex', 2)
        model.setParam('NumericFocus', 3)
        model.setParam('FeasibilityTol', 1e-6)
        
        gen_P = {i: model.addVar(lb=0, ub=gen[i, 8]/baseMVA, name=f"gen_P_{i}") 
                 for i in range(n_gen)}
        Va = {i: model.addVar(lb=-np.pi, ub=np.pi, name=f"Va_{i}") 
              for i in range(n_bus)}
        u_state = {i: model.addVar(vtype=GRB.BINARY, name=f"u_state_{i}") 
                   for i in range(n_gen)}
        phi_g_sh = {i: model.addVar(lb=0, ub=max(0, PD_attacked[i]), name=f"phi_g_sh_{i}") 
                    for i in range(n_bus)}
        
        model.update()
        
        for i in range(n_bus):
            gen_sum = quicksum(GenIncMatrix[i, g] * gen_P[g] for g in range(n_gen))
            bus_flow = quicksum(Bbus[i, j] * Va[j] for j in range(n_bus))
            model.addConstr(gen_sum - PD_attacked[i] == bus_flow + phi_g_sh[i])
        
        for l in range(n_branch):
            line_flow = quicksum(Bf[l, j] * Va[j] for j in range(n_bus))
            model.addConstr(line_flow <= branch[l, 5] / baseMVA)
            model.addConstr(line_flow >= -branch[l, 5] / baseMVA)
        
        model.addConstr(Va[ref_bus] == 0)
        
        for i in range(n_gen):
            model.addConstr(gen_P[i] >= u_state[i] * gen[i, 9] / baseMVA)
            model.addConstr(gen_P[i] <= u_state[i] * gen[i, 8] / baseMVA)
        
        obj = QuadExpr()
        for k in range(n_gen):
            obj += gencost[k, 5] * gen_P[k] * 100
        for i in range(n_bus):
            obj += loadshed_penalty * phi_g_sh[i]
        for k in range(n_gt):
            gt_gen_idx = gt_idx[k]
            gasgen_idx = gt_to_gasgen_map[k]
            if gasgen_idx >= 0:
                gas_term = eta_gt * QLHV * GasGenNeed_prev[gasgen_idx] / baseMVA
                obj += y[k] * (gen_P[gt_gen_idx] - gas_term)
                obj += (rho / 2) * (gen_P[gt_gen_idx] * gen_P[gt_gen_idx] 
                                    - 2 * gas_term * gen_P[gt_gen_idx] + gas_term * gas_term)
        
        model.setObjective(obj, GRB.MINIMIZE)
        model.optimize()
        
        if model.status in [GRB.OPTIMAL, GRB.SUBOPTIMAL]:
            Pg_result = np.array([gen_P[i].X for i in range(n_gen)])
            Va_result = np.array([Va[i].X for i in range(n_bus)])
            phi_g_result = np.array([phi_g_sh[i].X for i in range(n_bus)])
            elec_cost = sum(gencost[k, 5] * Pg_result[k] * 100 for k in range(n_gen))
            return True, Pg_result, Va_result, phi_g_result, elec_cost
        return False, None, None, None, None
    except Exception as e:
        print(f"电力子问题求解错误: {e}")
        return False, None, None, None, None


def solve_gas_subproblem(mpc, GasD_attacked, y, Pg_curr, rho,
                          gt_idx, gt_to_gasgen_map, 
                          GasBranchIncMatrix, GasSourceIncMatrix, GasGenIncMatrix,
                          eta_gt, QLHV, baseMVA, loadshed_penalty):
    """求解天然气子问题"""
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
        
        GasFlow = {}
        for k in range(n_GasBranch):
            C_ij = GasBranch[k, 3]
            max_flow = C_ij * 100
            GasFlow[k] = model.addVar(lb=-max_flow, ub=max_flow, name=f"GasFlow_{k}")
        
        GasPressure = {j: model.addVar(lb=max(GasBus[j, 2], 1.0), ub=GasBus[j, 1], 
                                        name=f"GasPressure_{j}") for j in range(n_GasBus)}
        GasSourceOutput = {s: model.addVar(lb=GasSource[s, 2], ub=GasSource[s, 3], 
                                            name=f"GasSourceOutput_{s}") for s in range(n_GasSource)}
        GasGenNeed = {g: model.addVar(lb=0, ub=GRB.INFINITY, name=f"GasGenNeed_{g}") 
                      for g in range(n_GasGen)}
        phi_q_sh = {j: model.addVar(lb=0, ub=max(0, GasD_attacked[j]), name=f"phi_q_sh_{j}") 
                    for j in range(n_GasBus)}
        
        model.update()
        
        for j in range(n_GasBus):
            source_sum = quicksum(GasSourceIncMatrix[j, s] * GasSourceOutput[s] for s in range(n_GasSource))
            branch_flow = quicksum(GasBranchIncMatrix[j, b] * GasFlow[b] for b in range(n_GasBranch))
            gen_need = quicksum(GasGenIncMatrix[j, g] * GasGenNeed[g] for g in range(n_GasGen))
            model.addConstr(source_sum == branch_flow + gen_need + GasD_attacked[j] - phi_q_sh[j])
        
        for k in range(n_GasBranch):
            i_node = int(GasBranch[k, 1]) - 1
            j_node = int(GasBranch[k, 2]) - 1
            C_ij = GasBranch[k, 3]
            if C_ij > 0:
                pi_i = GasBus[i_node, 4] if GasBus.shape[1] > 4 else (GasBus[i_node, 1] + GasBus[i_node, 2]) / 2
                pi_j = GasBus[j_node, 4] if GasBus.shape[1] > 4 else (GasBus[j_node, 1] + GasBus[j_node, 2]) / 2
                lin_coeff = C_ij * (max(pi_i, 1.0) + max(pi_j, 1.0)) / 2
                model.addConstr(GasFlow[k] <= lin_coeff)
                model.addConstr(GasFlow[k] >= -lin_coeff)
        
        obj = QuadExpr()
        for s in range(n_GasSource):
            obj += GasSource[s, 4] * GasSourceOutput[s]
        for j in range(n_GasBus):
            obj += loadshed_penalty * phi_q_sh[j]
        for k in range(n_gt):
            gasgen_idx = gt_to_gasgen_map[k]
            if gasgen_idx >= 0:
                elec_term = Pg_curr[gt_idx[k]]
                gas_conv = eta_gt * QLHV / baseMVA
                obj += -y[k] * gas_conv * GasGenNeed[gasgen_idx]
                obj += -rho * elec_term * gas_conv * GasGenNeed[gasgen_idx]
                obj += (rho / 2) * gas_conv * gas_conv * GasGenNeed[gasgen_idx] * GasGenNeed[gasgen_idx]
                obj += y[k] * elec_term + (rho / 2) * elec_term * elec_term
        
        model.setObjective(obj, GRB.MINIMIZE)
        model.optimize()
        
        if model.status in [GRB.OPTIMAL, GRB.SUBOPTIMAL]:
            return (True, 
                    np.array([GasFlow[k].X for k in range(n_GasBranch)]),
                    np.array([GasPressure[j].X for j in range(n_GasBus)]),
                    np.array([GasSourceOutput[s].X for s in range(n_GasSource)]),
                    np.array([GasGenNeed[g].X for g in range(n_GasGen)]),
                    np.array([phi_q_sh[j].X for j in range(n_GasBus)]),
                    sum(GasSource[s, 4] * GasSourceOutput[s].X for s in range(n_GasSource)))
        return False, None, None, None, None, None, None
    except Exception as e:
        print(f"天然气子问题求解错误: {e}")
        return False, None, None, None, None, None, None


def solve_upper_problem_with_security(mpc, PD, GasD, sensitivity_d, sensitivity_l, 
                                       tau_d, B_a_PS, B_a_GS, baseMVA,
                                       secure_system=None):
    """
    求解上层问题（考虑保密设备约束）
    
    保密设备约束：已部署保密设备的节点不能被选为攻击目标
    """
    bus = mpc['bus']
    GasBus = mpc['GasBus']
    
    n_bus = bus.shape[0]
    n_GasBus = GasBus.shape[0]
    
    # 获取可攻击节点
    if secure_system is not None:
        elec_attackable, gas_attackable = secure_system.get_attackable_nodes()
    else:
        elec_attackable = np.arange(n_bus)
        gas_attackable = np.arange(n_GasBus)
    
    # 如果全部节点都被保护，直接返回零攻击
    if len(elec_attackable) == 0 and len(gas_attackable) == 0:
        print("  [保密设备] 所有节点均受保护，攻击者无法发起攻击！")
        return (True, np.zeros(n_bus), np.zeros(n_GasBus), 
                np.zeros(n_bus), np.zeros(n_GasBus), 0.0)
    
    try:
        model = Model("Upper_Problem_Secure")
        model.setParam('OutputFlag', 0)
        
        z_a_d = {}
        u_a_d = {}
        for i in range(n_bus):
            M_d = tau_d * PD[i]
            if i in elec_attackable:
                z_a_d[i] = model.addVar(lb=-M_d, ub=M_d, name=f"z_a_d_{i}")
                u_a_d[i] = model.addVar(vtype=GRB.BINARY, name=f"u_a_d_{i}")
            else:
                # 保密节点：攻击向量固定为0
                z_a_d[i] = model.addVar(lb=0, ub=0, name=f"z_a_d_{i}")
                u_a_d[i] = model.addVar(lb=0, ub=0, name=f"u_a_d_{i}")
        
        z_a_l = {}
        u_a_l = {}
        for j in range(n_GasBus):
            M_l = tau_d * GasD[j]
            if j in gas_attackable:
                z_a_l[j] = model.addVar(lb=-M_l, ub=M_l, name=f"z_a_l_{j}")
                u_a_l[j] = model.addVar(vtype=GRB.BINARY, name=f"u_a_l_{j}")
            else:
                z_a_l[j] = model.addVar(lb=0, ub=0, name=f"z_a_l_{j}")
                u_a_l[j] = model.addVar(lb=0, ub=0, name=f"u_a_l_{j}")
        
        model.update()
        
        # 攻击数量限制（只能在可攻击节点中选择）
        if len(elec_attackable) > 0:
            model.addConstr(quicksum(u_a_d[i] for i in elec_attackable) <= B_a_PS)
        if len(gas_attackable) > 0:
            model.addConstr(quicksum(u_a_l[j] for j in gas_attackable) <= B_a_GS)
        
        # Big-M约束（只对可攻击节点）
        for i in elec_attackable:
            M_d = tau_d * PD[i]
            model.addConstr(z_a_d[i] >= -u_a_d[i] * M_d)
            model.addConstr(z_a_d[i] <= u_a_d[i] * M_d)
        
        for j in gas_attackable:
            M_l = tau_d * GasD[j]
            model.addConstr(z_a_l[j] >= -u_a_l[j] * M_l)
            model.addConstr(z_a_l[j] <= u_a_l[j] * M_l)
        
        # 隐蔽性约束
        model.addConstr(quicksum(z_a_d[i] for i in range(n_bus)) == 0)
        model.addConstr(quicksum(z_a_l[j] for j in range(n_GasBus)) == 0)
        
        # 目标函数
        obj = quicksum(sensitivity_d[i] * z_a_d[i] for i in range(n_bus)) + \
              quicksum(sensitivity_l[j] * z_a_l[j] for j in range(n_GasBus))
        
        model.setObjective(obj, GRB.MAXIMIZE)
        model.optimize()
        
        if model.status in [GRB.OPTIMAL, GRB.SUBOPTIMAL]:
            return (True,
                    np.array([z_a_d[i].X for i in range(n_bus)]),
                    np.array([z_a_l[j].X for j in range(n_GasBus)]),
                    np.array([u_a_d[i].X for i in range(n_bus)]),
                    np.array([u_a_l[j].X for j in range(n_GasBus)]),
                    model.objVal)
        return False, None, None, None, None, None
    except Exception as e:
        print(f"上层问题求解错误: {e}")
        return False, None, None, None, None, None


def compute_sensitivity(mpc, phi_g_values, phi_q_values, PD, GasD, 
                        gen, gt_idx, GasGen, branch, GasBranch):
    """计算敏感性系数"""
    n_bus = mpc['bus'].shape[0]
    n_GasBus = mpc['GasBus'].shape[0]
    
    sensitivity_d = np.zeros(n_bus)
    sensitivity_l = np.zeros(n_GasBus)
    
    total_PD = sum(PD) if sum(PD) > 0 else 1
    total_GasD = sum(GasD) if sum(GasD) > 0 else 1
    
    for i in range(n_bus):
        if phi_g_values[i] > 1e-6 and PD[i] > 1e-6:
            sensitivity_d[i] = phi_g_values[i] / PD[i]
        else:
            sensitivity_d[i] = PD[i] / total_PD
    
    for j in range(n_GasBus):
        if phi_q_values[j] > 1e-6 and GasD[j] > 1e-6:
            sensitivity_l[j] = phi_q_values[j] / GasD[j]
        else:
            sensitivity_l[j] = GasD[j] / total_GasD
    
    if max(sensitivity_d) > 0:
        sensitivity_d /= max(sensitivity_d)
    if max(sensitivity_l) > 0:
        sensitivity_l /= max(sensitivity_l)
    
    return sensitivity_d, sensitivity_l


def initialize_attack_strategy(PD, GasD, B_a_PS, B_a_GS, tau_d, n_bus, n_GasBus, 
                                secure_system=None):
    """初始化攻击策略（考虑保密设备）"""
    z_a_d = np.zeros(n_bus)
    z_a_l = np.zeros(n_GasBus)
    u_a_d = np.zeros(n_bus)
    u_a_l = np.zeros(n_GasBus)
    
    # 获取可攻击节点
    if secure_system is not None:
        elec_attackable, gas_attackable = secure_system.get_attackable_nodes()
    else:
        elec_attackable = np.arange(n_bus)
        gas_attackable = np.arange(n_GasBus)
    
    # 如果没有可攻击节点，返回零向量
    if len(elec_attackable) == 0:
        print("  [保密设备] 电力系统全部节点受保护，无法初始化攻击")
    
    if len(gas_attackable) == 0:
        print("  [保密设备] 天然气系统全部节点受保护，无法初始化攻击")
    
    # 电力系统攻击初始化（只在可攻击节点中选择）
    if B_a_PS > 0 and len(elec_attackable) >= 2:
        attackable_PD = PD[elec_attackable]
        sorted_idx = np.argsort(attackable_PD)[::-1]
        num_attack = min(B_a_PS, len(elec_attackable), max(2, (B_a_PS // 2) * 2))
        
        if num_attack >= 2:
            half = num_attack // 2
            pos_nodes = elec_attackable[sorted_idx[:half]]
            neg_nodes = elec_attackable[sorted_idx[half:num_attack]]
            
            total_pos = sum(PD[pos_nodes])
            total_neg = sum(PD[neg_nodes])
            
            if total_pos > 0 and total_neg > 0:
                for node in pos_nodes:
                    u_a_d[node] = 1
                    z_a_d[node] = tau_d * PD[node] * (total_neg / total_pos)
                for node in neg_nodes:
                    u_a_d[node] = 1
                    z_a_d[node] = -tau_d * PD[node]
                
                # 确保零和
                z_a_d[pos_nodes[0]] -= sum(z_a_d)
    
    # 天然气系统攻击初始化
    if B_a_GS > 0 and len(gas_attackable) >= 2:
        attackable_GasD = GasD[gas_attackable]
        sorted_idx = np.argsort(attackable_GasD)[::-1]
        num_attack = min(B_a_GS, len(gas_attackable), max(2, (B_a_GS // 2) * 2))
        
        if num_attack >= 2:
            half = num_attack // 2
            pos_nodes = gas_attackable[sorted_idx[:half]]
            neg_nodes = gas_attackable[sorted_idx[half:num_attack]]
            
            total_pos = sum(GasD[pos_nodes])
            total_neg = sum(GasD[neg_nodes])
            
            if total_pos > 0 and total_neg > 0:
                for node in pos_nodes:
                    u_a_l[node] = 1
                    z_a_l[node] = tau_d * GasD[node] * (total_neg / total_pos)
                for node in neg_nodes:
                    u_a_l[node] = 1
                    z_a_l[node] = -tau_d * GasD[node]
                
                z_a_l[pos_nodes[0]] -= sum(z_a_l)
    
    return z_a_d, z_a_l, u_a_d, u_a_l


def main(enable_security=True, secure_params=None):
    """
    主函数：双层优化求解
    
    参数:
        enable_security: 是否启用保密设备
        secure_params: 保密设备参数
    """
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
    
    n_gen = gen.shape[0]
    n_bus = bus.shape[0]
    n_branch = branch.shape[0]
    n_GasBus = GasBus.shape[0]
    n_GasBranch = GasBranch.shape[0]
    n_GasSource = GasSource.shape[0]
    n_GasGen = GasGen.shape[0]
    
    eta_gt = 0.35
    QLHV = 9.7 * 1000
    
    # 负荷处理
    PD = bus[:, 2] / baseMVA
    P_factor = PD / sum(PD) if sum(PD) > 0 else np.ones(n_bus) / n_bus
    PD = P_factor * mpc['load'][0] / baseMVA
    
    GasFactor = np.ones(n_GasBus) / n_GasBus
    GasD = GasFactor * mpc['GasLoad'][0]
    
    # 燃气轮机映射
    gt_idx = np.where(gen[:, 16] == 2)[0]
    n_gt = len(gt_idx)
    gt_to_gasgen_map = -np.ones(n_gt, dtype=int)
    for k in range(n_gt):
        gt_bus = gen[gt_idx[k], 0]
        for g in range(n_GasGen):
            if GasGen[g, 1] == gt_bus:
                gt_to_gasgen_map[k] = g
                break
    
    print(f"\n{'='*60}")
    print("        电力-天然气耦合系统攻防分析")
    print(f"{'='*60}")
    print(f"系统规模: 电力{n_bus}节点, 天然气{n_GasBus}节点, {n_gt}台燃气轮机")
    
    # ===== 初始化保密设备系统 =====
    if enable_security:
        secure_system = SecureDeviceSystem(n_bus, n_GasBus, secure_params)
    else:
        secure_system = None
        print("\n[警告] 保密设备未部署！系统完全暴露于攻击风险中")
    
    # 网络矩阵
    Bbus, Bf = make_Bdc(baseMVA, bus, branch)
    
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
    
    # 参数
    max_bilevel_iter = 15
    bilevel_tol = 1e-3
    tau_d = 0.5
    B_a_PS = min(6, n_bus // 6)
    B_a_GS = min(3, n_GasBus // 4)
    
    rho_initial = 0.5
    max_ADMM_iter = 40
    ADMM_tol = 1e-4
    loadshed_penalty = LOADSHED_PENALTY_BASE
    
    print(f"\n攻击参数: 幅度={tau_d}, 电力可攻击数={B_a_PS}, 天然气可攻击数={B_a_GS}")
    
    # ========== 基准情况 ==========
    print("\n" + "-"*40)
    print("计算基准情况...")
    
    y = np.zeros(n_gt)
    Pg_prev = np.zeros(n_gen)
    GasGenNeed_prev = np.zeros(n_GasGen)
    rho = rho_initial
    
    for admm_iter in range(max_ADMM_iter):
        success_e, Pg, Va, phi_g, elec_cost = solve_electric_subproblem(
            mpc, PD, y, GasGenNeed_prev, rho, gt_idx, gt_to_gasgen_map, 
            GenIncMatrix, Bbus, Bf, eta_gt, QLHV, baseMVA, loadshed_penalty)
        
        if not success_e:
            break
        
        success_g, _, _, _, GasGenNeed, phi_q, gas_cost = solve_gas_subproblem(
            mpc, GasD, y, Pg, rho, gt_idx, gt_to_gasgen_map,
            GasBranchIncMatrix, GasSourceIncMatrix, GasGenIncMatrix,
            eta_gt, QLHV, baseMVA, loadshed_penalty)
        
        if not success_g:
            break
        
        residual = 0
        for k in range(n_gt):
            gasgen_idx = gt_to_gasgen_map[k]
            if gasgen_idx >= 0:
                r = GasGenNeed[gasgen_idx] - Pg[gt_idx[k]] * baseMVA / (eta_gt * QLHV)
                y[k] += rho * r
                residual += abs(r)
        
        Pg_prev = Pg.copy()
        GasGenNeed_prev = GasGenNeed.copy()
        
        if residual < ADMM_tol:
            break
    
    baseline_cost = elec_cost + gas_cost + loadshed_penalty * (sum(phi_g) + sum(phi_q))
    print(f"基准成本: {baseline_cost:.2f}")
    
    # ========== 攻防对抗 ==========
    print("\n" + "="*40)
    print("开始攻防对抗分析...")
    print("="*40)
    
    # 初始化攻击（考虑保密设备限制）
    z_a_d, z_a_l, u_a_d, u_a_l = initialize_attack_strategy(
        PD, GasD, B_a_PS, B_a_GS, tau_d, n_bus, n_GasBus, secure_system)
    
    best_result = None
    obj_history = []
    
    for bilevel_iter in range(max_bilevel_iter):
        print(f"\n--- 迭代 {bilevel_iter + 1} ---")
        
        # 保密设备阻止攻击
        if secure_system is not None:
            z_a_d, z_a_l, u_a_d, u_a_l, block_report = secure_system.block_attack(
                z_a_d, z_a_l, u_a_d, u_a_l)
        
        # 应用攻击
        PD_attacked = np.maximum(PD + z_a_d, 0.05 * PD)
        GasD_attacked = np.maximum(GasD + z_a_l, 0.05 * GasD)
        
        # ADMM求解
        y = np.zeros(n_gt)
        Pg_prev = np.zeros(n_gen)
        GasGenNeed_prev = np.zeros(n_GasGen)
        rho = rho_initial
        
        for admm_iter in range(max_ADMM_iter):
            success_e, Pg, Va, phi_g, elec_cost = solve_electric_subproblem(
                mpc, PD_attacked, y, GasGenNeed_prev, rho, gt_idx, gt_to_gasgen_map,
                GenIncMatrix, Bbus, Bf, eta_gt, QLHV, baseMVA, loadshed_penalty)
            
            if not success_e:
                break
            
            success_g, _, _, _, GasGenNeed, phi_q, gas_cost = solve_gas_subproblem(
                mpc, GasD_attacked, y, Pg, rho, gt_idx, gt_to_gasgen_map,
                GasBranchIncMatrix, GasSourceIncMatrix, GasGenIncMatrix,
                eta_gt, QLHV, baseMVA, loadshed_penalty)
            
            if not success_g:
                break
            
            residual = 0
            for k in range(n_gt):
                gasgen_idx = gt_to_gasgen_map[k]
                if gasgen_idx >= 0:
                    r = GasGenNeed[gasgen_idx] - Pg[gt_idx[k]] * baseMVA / (eta_gt * QLHV)
                    y[k] += rho * r
                    residual += abs(r)
            
            Pg_prev = Pg.copy()
            GasGenNeed_prev = GasGenNeed.copy()
            
            if residual < ADMM_tol:
                break
        
        total_loadshed = sum(phi_g) + sum(phi_q)
        total_cost = elec_cost + gas_cost + loadshed_penalty * total_loadshed
        
        print(f"  成本: {total_cost:.2f}")
        
        # 上层问题
        sensitivity_d, sensitivity_l = compute_sensitivity(
            mpc, phi_g, phi_q, PD, GasD, gen, gt_idx, GasGen, branch, GasBranch)
        
        success, z_new, zl_new, u_new, ul_new, obj = solve_upper_problem_with_security(
            mpc, PD, GasD, sensitivity_d, sensitivity_l, tau_d, B_a_PS, B_a_GS, 
            baseMVA, secure_system)
        
        if success:
            obj_history.append(obj)
            print(f"  上层目标: {obj:.6f}")
            
            if best_result is None or obj > best_result['objective']:
                best_result = {
                    'objective': obj,
                    'cost': total_cost,
                    'loadshed': total_loadshed,
                    'z_a_d': z_new.copy(),
                    'z_a_l': zl_new.copy(),
                }
            
            # 收敛检查
            change = np.linalg.norm(z_new - z_a_d) + np.linalg.norm(zl_new - z_a_l)
            if change < bilevel_tol:
                print(f"收敛于迭代 {bilevel_iter + 1}")
                break
            
            # 更新
            z_a_d = 0.7 * z_new + 0.3 * z_a_d
            z_a_l = 0.7 * zl_new + 0.3 * z_a_l
            u_a_d = u_new.copy()
            u_a_l = ul_new.copy()
    
    # ========== 结果汇总 ==========
    print("\n" + "="*60)
    print("                    结果汇总")
    print("="*60)
    
    print(f"\n基准成本（无攻击）: {baseline_cost:.2f}")
    
    if best_result:
        print(f"\n攻击后成本: {best_result['cost']:.2f}")
        print(f"攻击目标值: {best_result['objective']:.6f}")
        
        cost_increase = best_result['cost'] - baseline_cost
        print(f"\n成本增加: {cost_increase:.2f} ({cost_increase/baseline_cost*100:.2f}%)")
    
    if secure_system is not None:
        stats = secure_system.get_statistics()
        print(f"\n保密设备统计:")
        print(f"  保护电力节点: {stats['elec_protected_nodes']}/{n_bus}")
        print(f"  保护天然气节点: {stats['gas_protected_nodes']}/{n_GasBus}")
        print(f"  阻止攻击次数: {stats['total_attacks_blocked']}")
        
        if stats['elec_protected_nodes'] == n_bus and stats['gas_protected_nodes'] == n_GasBus:
            print(f"\n  ★ 全节点保护模式：系统完全免疫虚假数据注入攻击！")
    
    return best_result, obj_history


def compare_scenarios():
    """对比不同保护场景"""
    print("\n" + "="*70)
    print("              保密设备效果对比分析")
    print("="*70)
    
    # 场景1：无保护
    print("\n" + ">"*30 + " 场景1: 无保护 " + "<"*30)
    result_no_protect, _ = main(enable_security=False)
    
    # 场景2：部分保护（示例：保护前50%节点）
    print("\n" + ">"*30 + " 场景2: 部分保护(50%) " + "<"*30)
    mpc = get_case_data()
    n_bus = mpc['bus'].shape[0]
    n_GasBus = mpc['GasBus'].shape[0]
    
    partial_params = {
        'full_protection': False,
        'elec_secure_nodes': list(range(n_bus // 2)),
        'gas_secure_nodes': list(range(n_GasBus // 2)),
    }
    result_partial, _ = main(enable_security=True, secure_params=partial_params)
    
    # 场景3：全保护
    print("\n" + ">"*30 + " 场景3: 全节点保护 " + "<"*30)
    result_full, _ = main(enable_security=True, secure_params={'full_protection': True})
    
    # 对比结果
    print("\n" + "="*70)
    print("                    对比结果")
    print("="*70)
    print(f"\n{'场景':<20} {'系统成本':<15} {'切负荷':<15} {'攻击目标值':<15}")
    print("-"*65)
    
    if result_no_protect:
        print(f"{'无保护':<20} {result_no_protect['cost']:<15.2f} "
              f"{result_no_protect['loadshed']:<15.6f} {result_no_protect['objective']:<15.6f}")
    
    if result_partial:
        print(f"{'部分保护(50%)':<20} {result_partial['cost']:<15.2f} "
              f"{result_partial['loadshed']:<15.6f} {result_partial['objective']:<15.6f}")
    
    if result_full:
        print(f"{'全节点保护':<20} {result_full['cost']:<15.2f} "
              f"{result_full['loadshed']:<15.6f} {result_full['objective']:<15.6f}")
    
    # 效果分析
    if result_no_protect and result_full:
        cost_reduction = result_no_protect['cost'] - result_full['cost']

        
        print(f"\n全保护效果:")
        print(f"  成本降低: {cost_reduction:.2f} ({cost_reduction/result_no_protect['cost']*100:.1f}%)")
        print(f"  攻击目标值降低: {result_no_protect['objective'] - result_full['objective']:.6f}")


if __name__ == "__main__":
    # 运行全节点保护分析
    print("\n" + "#"*70)
    print("         运行全节点保密设备保护模式")
    print("#"*70)
    
    result, history = main(enable_security=True, secure_params={'full_protection': True})
    
    # 可选：运行完整对比分析
    # compare_scenarios()