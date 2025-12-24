#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
解析攻击策略数据，用于节点数据对比
"""

import re
import json

# 示例攻击策略文本，从终端输出复制
attack_strategy_text = """最佳攻击策略:
  电力攻击节点: [ 7 18 25 27 28 39]
  天然气攻击节点: [ 3  8 16]
  电力攻击强度:
    节点7: -45.335 MW
    节点18: -30.637 MW
    节点25: -43.435 MW
    节点27: -54.487 MW
    节点28: -39.944 MW
    节点39: 213.838 MW
  天然气攻击强度:
    节点3: 0.081735
    节点8: -0.081735
    节点16: 0.000000"""

def parse_attack_strategy(text):
    """
    解析攻击策略文本，提取节点数据
    
    Args:
        text (str): 攻击策略文本
    
    Returns:
        dict: 包含节点数据的结构化字典
    """
    # 初始化结果字典
    result = {
        "attacked_nodes": [],
        "summary": {
            "electric_nodes": [],
            "gas_nodes": [],
            "total_electric_attack": 0.0,
            "total_gas_attack": 0.0
        }
    }
    
    # 提取电力攻击节点
    electric_nodes_match = re.search(r'电力攻击节点: \[([\d\s]+)\]', text)
    if electric_nodes_match:
        electric_nodes = list(map(int, electric_nodes_match.group(1).split()))
        result["summary"]["electric_nodes"] = electric_nodes
    
    # 提取天然气攻击节点
    gas_nodes_match = re.search(r'天然气攻击节点: \[([\d\s]+)\]', text)
    if gas_nodes_match:
        gas_nodes = list(map(int, gas_nodes_match.group(1).split()))
        result["summary"]["gas_nodes"] = gas_nodes
    
    # 提取电力攻击强度
    electric_strengths = re.findall(r'节点(\d+):\s+([\d\.-]+)\s+MW', text)
    total_electric_attack = 0.0
    for node_id, strength in electric_strengths:
        node_id = int(node_id)
        strength = float(strength)
        total_electric_attack += strength
        
        # 添加到节点数据列表
        result["attacked_nodes"].append({
            "node_id": f"elec-{node_id}",
            "original_id": node_id,
            "type": "electric",
            "original_load": 0.0,  # 原始负荷值需要从其他地方获取
            "attack_injection": strength,
            "attacked_load": 0.0,  # 攻击后负荷值需要计算
            "load_shedding": 0.0   # 切负荷量需要计算
        })
    result["summary"]["total_electric_attack"] = total_electric_attack
    
    # 提取天然气攻击强度
    gas_strengths = re.findall(r'天然气攻击强度:(.*?)(?:$|电力|$)', text, re.DOTALL)[0]
    gas_strengths = re.findall(r'节点(\d+):\s+([\d\.-]+)', gas_strengths)
    total_gas_attack = 0.0
    for node_id, strength in gas_strengths:
        node_id = int(node_id)
        strength = float(strength)
        total_gas_attack += strength
        
        # 添加到节点数据列表
        result["attacked_nodes"].append({
            "node_id": f"gas-{node_id}",
            "original_id": node_id,
            "type": "gas",
            "original_load": 0.0,  # 原始负荷值需要从其他地方获取
            "attack_injection": strength,
            "attacked_load": 0.0,  # 攻击后负荷值需要计算
            "load_shedding": 0.0   # 切负荷量需要计算
        })
    result["summary"]["total_gas_attack"] = total_gas_attack
    
    # 按照节点ID排序
    result["attacked_nodes"].sort(key=lambda x: (x["type"], x["original_id"]))
    
    return result

def main():
    """
    主函数，解析攻击策略并输出结果
    """
    # 解析攻击策略
    parsed_data = parse_attack_strategy(attack_strategy_text)
    
    # 输出JSON格式
    print("\n=== 解析后的攻击策略数据 ===")
    print(json.dumps(parsed_data, ensure_ascii=False, indent=2))
    
    # 输出表格形式，用于对比
    print("\n=== 节点数据对比表格 ===")
    print(f"{'节点类型':<10} {'节点ID':<10} {'原始负荷':<10} {'攻击注入量':<12} {'攻击后负荷':<12} {'切负荷量':<10}")
    print("-" * 66)
    
    for node in parsed_data["attacked_nodes"]:
        print(f"{node['type']:<10} {node['original_id']:<10} {node['original_load']:<10.4f} {node['attack_injection']:<12.4f} {node['attacked_load']:<12.4f} {node['load_shedding']:<10.4f}")
    
    # 保存到文件
    with open("attack_strategy_parsed.json", "w", encoding="utf-8") as f:
        json.dump(parsed_data, f, ensure_ascii=False, indent=2)
    print("\n数据已保存到 attack_strategy_parsed.json 文件")

if __name__ == "__main__":
    main()
