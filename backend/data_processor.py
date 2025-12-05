import json
import os
from typing import Dict, List, Any

def parse_matpower_data(file_path: str) -> Dict[str, Any]:
    """
    解析MATPOWER格式的数据文件
    """
    # 尝试不同的编码方式
    encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
    content = None
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                content = f.read()
            break
        except UnicodeDecodeError:
            continue
    
    if content is None:
        # 如果所有编码都失败，使用二进制模式读取并忽略错误
        with open(file_path, 'rb') as f:
            content = f.read().decode('utf-8', errors='ignore')
    
    # 初始化数据结构
    data = {
        'bus': [],
        'gen': [],
        'branch': [],
        'gas_bus': [],
        'gas_branch': [],
        'gas_gen': [],
        'gas_source': [],
        'gas_load': []
    }
    
    # 解析电力网络数据
    # 解析bus数据
    bus_section = extract_section(content, 'mpc.bus', ';')
    if bus_section:
        data['bus'] = parse_matrix_data(bus_section)
    
    # 解析generator数据
    gen_section = extract_section(content, 'mpc.gen', ';')
    if gen_section:
        data['gen'] = parse_matrix_data(gen_section)
    
    # 解析branch数据
    branch_section = extract_section(content, 'mpc.branch', ';')
    if branch_section:
        data['branch'] = parse_matrix_data(branch_section)
    
    # 解析天然气网络数据
    # 解析GasBus数据
    gas_bus_section = extract_section(content, 'mpc.GasBus', ';')
    if gas_bus_section:
        data['gas_bus'] = parse_matrix_data(gas_bus_section)
    
    # 解析GasBranch数据
    gas_branch_section = extract_section(content, 'mpc.GasBranch', ';')
    if gas_branch_section:
        data['gas_branch'] = parse_matrix_data(gas_branch_section)
    
    # 解析GasGen数据
    gas_gen_section = extract_section(content, 'mpc.GasGen', ';')
    if gas_gen_section:
        data['gas_gen'] = parse_matrix_data(gas_gen_section)
    
    # 解析GasSource数据
    gas_source_section = extract_section(content, 'mpc.GasSource', ';')
    if gas_source_section:
        data['gas_source'] = parse_matrix_data(gas_source_section)
    
    return data

def extract_section(content: str, section_name: str, end_char: str = ';') -> str:
    """
    从内容中提取指定部分的数据
    """
    start_idx = content.find(section_name + ' = [')
    if start_idx == -1:
        return ""
    
    start_idx = content.find('[', start_idx)
    if start_idx == -1:
        return ""
    
    # 找到匹配的结束括号
    bracket_count = 1
    end_idx = start_idx + 1
    
    while bracket_count > 0 and end_idx < len(content):
        if content[end_idx] == '[':
            bracket_count += 1
        elif content[end_idx] == ']':
            bracket_count -= 1
        end_idx += 1
    
    # 找到分号
    semicolon_idx = content.find(end_char, end_idx)
    if semicolon_idx != -1:
        end_idx = semicolon_idx + 1
    
    return content[start_idx:end_idx]

def parse_matrix_data(section_content: str) -> List[List[float]]:
    """
    解析矩阵数据
    """
    # 移除首尾的方括号
    content = section_content.strip()
    if content.startswith('['):
        content = content[1:]
    if content.endswith(']'):
        content = content[:-1]
    
    # 按行分割
    lines = content.split(';')
    matrix = []
    
    for line in lines:
        line = line.strip()
        if line:
            # 分割数字并转换为浮点数
            numbers = []
            for num_str in line.split():
                try:
                    # 处理科学计数法和其他数值格式
                    if 'e' in num_str.lower() or 'E' in num_str:
                        numbers.append(float(num_str))
                    else:
                        numbers.append(float(num_str))
                except ValueError:
                    # 忽略无法解析的值
                    continue
            if numbers:
                matrix.append(numbers)
    
    return matrix

def build_electric_network_graph(data: Dict[str, Any]) -> Dict[str, List[Dict]]:
    """
    构建电力网络图结构
    """
    nodes = []
    links = []
    
    # 创建节点（总线）
    bus_dict = {}  # bus_id -> node_info
    for i, bus_data in enumerate(data['bus']):
        if len(bus_data) >= 13:
            bus_id = int(bus_data[0])
            bus_type = int(bus_data[1])
            pd = bus_data[2]  # 有功负荷
            qd = bus_data[3]  # 无功负荷
            vm = bus_data[7]  # 电压幅值
            va = bus_data[8]  # 电压相角
            
            node = {
                'id': f'E{bus_id}',
                'name': f'Bus {bus_id}',
                'type': 'electric_bus',
                'bus_type': bus_type,
                'pd': pd,
                'qd': qd,
                'vm': vm,
                'va': va
            }
            nodes.append(node)
            bus_dict[bus_id] = node
    
    # 添加发电机节点
    gen_nodes = {}
    for i, gen_data in enumerate(data['gen']):
        if len(gen_data) >= 10:
            bus_id = int(gen_data[0])
            pg = gen_data[1]  # 有功出力
            qg = gen_data[2]  # 无功出力
            pmax = gen_data[8]  # 最大有功出力
            pmin = gen_data[9]  # 最小有功出力
            
            gen_id = f'G{i+1}'
            node = {
                'id': gen_id,
                'name': f'Generator {i+1}',
                'type': 'generator',
                'connected_bus': bus_id,
                'pg': pg,
                'qg': qg,
                'pmax': pmax,
                'pmin': pmin
            }
            nodes.append(node)
            gen_nodes[gen_id] = node
    
    # 创建支路连接（边）
    for branch_data in data['branch']:
        if len(branch_data) >= 4:
            fbus = int(branch_data[0])  # 起始节点
            tbus = int(branch_data[1])  # 终端节点
            r = branch_data[2]  # 电阻
            x = branch_data[3]  # 电抗
            
            link = {
                'source': f'E{fbus}',
                'target': f'E{tbus}',
                'type': 'electric_branch',
                'r': r,
                'x': x
            }
            links.append(link)
    
    # 连接发电机到母线
    for gen_id, gen_node in gen_nodes.items():
        bus_id = gen_node['connected_bus']
        link = {
            'source': gen_id,
            'target': f'E{bus_id}',
            'type': 'generator_connection',
            'value': gen_node['pg']
        }
        links.append(link)
    
    return {
        'nodes': nodes,
        'links': links
    }

def build_gas_network_graph(data: Dict[str, Any]) -> Dict[str, List[Dict]]:
    """
    构建天然气网络图结构
    """
    nodes = []
    links = []
    
    # 创建天然气节点
    gas_bus_dict = {}
    for gas_bus_data in data['gas_bus']:
        if len(gas_bus_data) >= 5:
            bus_id = int(gas_bus_data[0])
            pressure_max = gas_bus_data[1]
            pressure_min = gas_bus_data[2]
            load = gas_bus_data[4] if len(gas_bus_data) > 4 else 0
            
            node = {
                'id': f'GAS{bus_id}',
                'name': f'Gas Node {bus_id}',
                'type': 'gas_node',
                'pressure_max': pressure_max,
                'pressure_min': pressure_min,
                'load': load
            }
            nodes.append(node)
            gas_bus_dict[bus_id] = node
    
    # 添加气源节点
    gas_source_dict = {}
    for source_data in data['gas_source']:
        if len(source_data) >= 6:
            bus_id = int(source_data[1])
            min_w = source_data[2]
            max_w = source_data[3]
            
            node = {
                'id': f'GS{bus_id}',
                'name': f'Gas Source {bus_id}',
                'type': 'gas_source',
                'connected_bus': bus_id,
                'min_w': min_w,
                'max_w': max_w
            }
            nodes.append(node)
            gas_source_dict[bus_id] = node
    
    # 创建管道连接
    for pipe_data in data['gas_branch']:
        if len(pipe_data) >= 4:
            fbus = int(pipe_data[1])
            tbus = int(pipe_data[2])
            capacity = pipe_data[3]
            
            link = {
                'source': f'GAS{fbus}',
                'target': f'GAS{tbus}',
                'type': 'gas_pipe',
                'capacity': capacity
            }
            links.append(link)
    
    # 连接气源到节点
    for source_bus_id, source_node in gas_source_dict.items():
        link = {
            'source': f'GS{source_bus_id}',
            'target': f'GAS{source_bus_id}',
            'type': 'gas_source_connection',
            'value': source_node.get('max_w', 0)
        }
        links.append(link)
    
    return {
        'nodes': nodes,
        'links': links
    }

def combine_networks(electric_graph: Dict[str, List[Dict]], gas_graph: Dict[str, List[Dict]]) -> Dict[str, List[Dict]]:
    """
    合并电力和天然气网络
    """
    combined_nodes = electric_graph['nodes'] + gas_graph['nodes']
    combined_links = electric_graph['links'] + gas_graph['links']
    
    # 添加电力-天然气耦合连接
    # 这里可以根据实际数据添加耦合关系
    
    return {
        'nodes': combined_nodes,
        'links': combined_links
    }

def save_processed_data(data: Dict[str, Any], output_dir: str):
    """
    保存处理后的数据
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # 保存节点数据
    nodes_file = os.path.join(output_dir, 'nodes.json')
    with open(nodes_file, 'w', encoding='utf-8') as f:
        json.dump(data['nodes'], f, ensure_ascii=False, indent=2)
    
    # 保存连接数据
    links_file = os.path.join(output_dir, 'links.json')
    with open(links_file, 'w', encoding='utf-8') as f:
        json.dump(data['links'], f, ensure_ascii=False, indent=2)
    
    # 保存完整图数据
    graph_file = os.path.join(output_dir, 'graph.json')
    with open(graph_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    """
    主函数
    """
    # 输入文件路径
    input_file = 'data/raw/电39-气20.txt'
    
    # 输出目录
    processed_dir = 'data/processed'
    normalized_dir = 'data/normalized'
    
    # 解析原始数据
    print("正在解析原始数据...")
    raw_data = parse_matpower_data(input_file)
    
    # 构建电力网络图
    print("正在构建电力网络图...")
    electric_graph = build_electric_network_graph(raw_data)
    
    # 构建天然气网络图
    print("正在构建天然气网络图...")
    gas_graph = build_gas_network_graph(raw_data)
    
    # 合并网络
    print("正在合并网络...")
    combined_graph = combine_networks(electric_graph, gas_graph)
    
    # 保存处理后的数据
    print("正在保存处理后的数据...")
    save_processed_data(combined_graph, processed_dir)
    
    print("数据处理完成！")
    print(f"节点数量: {len(combined_graph['nodes'])}")
    print(f"连接数量: {len(combined_graph['links'])}")

if __name__ == "__main__":
    main()