#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import json
import numpy as np
import subprocess

if __name__ == "__main__":
    # 调用双层优化脚本并捕获输出
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bilevel_attack_11111.py")
    result = subprocess.run([sys.executable, script_path], capture_output=True, text=True, encoding='latin-1')
    output_text = result.stdout
    
    # 解析输出获取基准情况总成本
    import re
    baseline_cost_match = re.search(r'基准情况:\s*\n\s*总成本: ([\d.]+)', output_text)
    baseline_cost = None
    if baseline_cost_match:
        baseline_cost = float(baseline_cost_match.group(1))
    
    # 直接导入双层优化脚本的main函数，获取迭代数据
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from bilevel_attack_11111 import main
    
    # 调用双层优化脚本的main函数
    best_strategy, upper_hist, lower_hist, penalty_hist = main()
    
    # 提取最佳攻击策略
    best_elec_nodes = np.where(best_strategy['u_a_d'] > 0.5)[0] + 1
    best_gas_nodes = np.where(best_strategy['u_a_l'] > 0.5)[0] + 1
    
    # 生成结果数据
    result_data = {
        "iterations": list(range(1, len(upper_hist) + 1)),
        "upper_objective": upper_hist,
        "lower_cost": lower_hist,
        "best_strategy": {
            "electric_nodes": best_elec_nodes.tolist(),
            "gas_nodes": best_gas_nodes.tolist()
        },
        "total_iterations": len(upper_hist),
        "baseline_cost": baseline_cost
    }
    
    # 保存为JSON文件
    with open("iteration_results.json", 'w', encoding='utf-8') as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)
    
    print("\n迭代历史解析完成，结果已保存到 iteration_results.json")
    print(f"总迭代轮次: {len(upper_hist)}")
    print(f"最佳迭代轮次: 1")
    if baseline_cost is not None:
        print(f"基准情况总成本: {baseline_cost:.2f}")
