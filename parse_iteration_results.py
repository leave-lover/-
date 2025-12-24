#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
解析双层优化脚本的迭代历史结果，并生成JSON数据文件
"""

import re
import json
import sys

def parse_output(output_text):
    """
    解析脚本输出，提取迭代历史数据
    """
    # 提取基准情况总成本
    baseline_cost_match = re.search(r'基准情况:\s*\n\s*总成本: ([\d.]+)', output_text)
    baseline_cost = None
    if baseline_cost_match:
        baseline_cost = float(baseline_cost_match.group(1))
    
    # 提取上层目标历史，允许键值之间有任意空格
    upper_hist_match = re.search(r'上层目标历史\s*:\s*\[(.*?)\]', output_text)
    if not upper_hist_match:
        print("未找到上层目标历史")
        return None
    
    # 提取下层成本历史，允许键值之间有任意空格
    lower_hist_match = re.search(r'下层成本历史\s*:\s*\[(.*?)\]', output_text)
    if not lower_hist_match:
        print("未找到下层成本历史")
        return None
    
    # 提取最佳攻击策略信息
    best_strategy = {}
    
    # 电力攻击节点
    elec_nodes_match = re.search(r'电力攻击节点: \[(.*?)\]', output_text)
    if elec_nodes_match:
        best_strategy['electric_nodes'] = list(map(int, re.findall(r'\d+', elec_nodes_match.group(1))))
    
    # 天然气攻击节点
    gas_nodes_match = re.search(r'天然气攻击节点: \[(.*?)\]', output_text)
    if gas_nodes_match:
        best_strategy['gas_nodes'] = list(map(int, re.findall(r'\d+', gas_nodes_match.group(1))))
    
    # 解析上层目标值
    upper_hist_str = upper_hist_match.group(1)
    # 移除字符串中的引号并转换为浮点数
    upper_hist = [float(val.strip()[1:-1]) for val in upper_hist_str.split(', ')]
    
    # 解析下层成本值
    lower_hist_str = lower_hist_match.group(1)
    # 移除字符串中的引号并转换为浮点数
    lower_hist = [float(val.strip()[1:-1]) for val in lower_hist_str.split(', ')]
    
    # 生成迭代轮次数据
    iterations = list(range(1, len(upper_hist) + 1))
    
    # 生成结果数据
    result_data = {
        "iterations": iterations,
        "upper_objective": upper_hist,
        "lower_cost": lower_hist,
        "best_strategy": best_strategy,
        "total_iterations": len(iterations),
        "baseline_cost": baseline_cost
    }
    
    return result_data

def main():
    # 从文件读取输出结果
    output_file = "bilevel_attack_output.txt"
    try:
        # 使用latin-1编码读取输出文件，避免UnicodeDecodeError
        with open(output_file, 'r', encoding='latin-1') as f:
            output_text = f.read()
    except FileNotFoundError:
        print(f"找不到输出文件 {output_file}")
        return 1
    
    # 解析输出
    result_data = parse_output(output_text)
    if not result_data:
        return 1
    
    # 保存为JSON文件
    with open("iteration_results.json", 'w', encoding='utf-8') as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)
    
    print("迭代历史解析完成，结果已保存到 iteration_results.json")
    print(f"总迭代轮次: {result_data['total_iterations']}")
    print(f"最佳迭代轮次: 1")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
