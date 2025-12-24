import json
import os
import logging
import re
from typing import Dict, List, Any
from functools import lru_cache
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    logging.warning("numpy not available, using standard Python alternatives")

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False
    logging.warning("pandas not available, Excel file processing will be limited")

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 添加LRU缓存装饰器用于频繁调用的函数
@lru_cache(maxsize=128)
def cached_json_load(file_path: str) -> Dict[str, Any]:
    """带缓存的JSON文件加载函数"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def parse_matpower_data(filepath: str) -> Dict[str, Any]:
    """
    解析MATPOWER格式的数据文件
    使用更高效的文件读取和解析方法
    """
    # 尝试不同的编码方式
    encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
    content = None
    
    for encoding in encodings:
        try:
            with open(filepath, 'r', encoding=encoding) as f:
                content = f.read()
            break
        except UnicodeDecodeError:
            continue
    
    if content is None:
        # 如果所有编码都失败，使用二进制模式读取并忽略错误
        with open(filepath, 'rb') as f:
            content = f.read().decode('utf-8', errors='ignore')
    
    data = {
        'bus': [],
        'gen': [],
        'branch': [],
        'gas_bus': [],
        'gas_branch': [],
        'gas_gen': [],  # 初始化为空列表
        'gas_source': [],
        'gas_load': []
    }
    
    # 定义要解析的部分映射
    sections = {
        'bus': 'mpc.bus',
        'gen': 'mpc.gen',
        'branch': 'mpc.branch',
        'gas_bus': 'mpc.GasBus',
        'gas_branch': 'mpc.GasBranch',
        'gas_gen': 'mpc.GasGen',
        'gas_source': 'mpc.GasSource',
        'gas_load': 'mpc.GasLoad'
    }
    
    # 批量解析所有部分
    for key, section_name in sections.items():
        section = extract_section(content, section_name, ';')
        if section:
            data[key] = parse_matrix_data_optimized(section)
    
    return data

def parse_excel_data(filepath: str) -> Dict[str, Any]:
    """
    解析Excel格式的优化迭代数据文件
    """
    if not HAS_PANDAS:
        raise ImportError("pandas库不可用，无法处理Excel文件")
    
    try:
        # 读取Excel文件，不使用第一行作为标题
        df = pd.read_excel(filepath, header=None)
        
        # 初始化数据结构
        data = {
            'iterations': []
        }
        
        # 根据观察到的Excel格式进行解析
        # 查找包含迭代次数的列
        iteration_columns = []  # 存储(列索引, 迭代名称)元组
        for col in range(df.shape[1]):
            for row in range(min(20, df.shape[0])):  # 检查前20行
                cell_value = df.iloc[row, col]
                if isinstance(cell_value, str) and ('次迭代' in cell_value or '基准' in cell_value):
                    iteration_columns.append((col, cell_value))
                    break
        
        # 查找关键数据行
        generator_row = None
        flow_row = None
        for row in range(df.shape[0]):
            cell_value = df.iloc[row, 1] if df.shape[1] > 1 else None
            if isinstance(cell_value, str):
                if '发电机：' in cell_value:
                    generator_row = row
                elif '流量：' in cell_value:
                    flow_row = row
        
        # 如果找到了迭代列，提取数据
        if iteration_columns:
            # 为每次迭代创建数据
            for i, (col_idx, iter_name) in enumerate(iteration_columns):
                iteration_data = {
                    'iteration': i + 1,
                    'cost': 0.0,
                    'efficiency': 0.0,
                    'timestamp': '',
                    'details': {
                        'networkRouting': 0.0,
                        'resourceAllocation': 0.0,
                        'dataCompression': 0.0,
                        'cacheStrategy': 0.0,
                        'loadBalancing': 0.0
                    }
                }
                
                # 提取发电机数据（成本相关）- 第一行是成本数据
                if generator_row is not None:
                    gen_value_row = generator_row + 1
                    if gen_value_row < df.shape[0] and col_idx < df.shape[1]:
                        gen_value = df.iloc[gen_value_row, col_idx]
                        if pd.notna(gen_value) and isinstance(gen_value, (int, float)):
                            iteration_data['cost'] = float(gen_value)
                
                # 提取流量数据（网络路由优化）- 第一行是网络路由数据
                if flow_row is not None:
                    flow_value_row = flow_row + 1
                    if flow_value_row < df.shape[0] and col_idx < df.shape[1]:
                        flow_value = df.iloc[flow_value_row, col_idx]
                        if pd.notna(flow_value) and isinstance(flow_value, (int, float)):
                            iteration_data['details']['networkRouting'] = float(flow_value)
                
                # 提取其他详细指标数据
                # 从发电机行和流量行之后的行中提取数据
                if generator_row is not None and flow_row is not None:
                    # 收集所有可能的指标数据点
                    potential_metrics = []
                    
                    # 从发电机行之后收集数据（跳过第一行的成本数据）
                    # 根据调试发现，第3行(row+3)是resourceAllocation，第4行(row+4)是dataCompression等
                    if generator_row + 3 < df.shape[0] and col_idx < df.shape[1]:
                        value = df.iloc[generator_row + 3, col_idx]
                        if pd.notna(value) and isinstance(value, (int, float)):
                            iteration_data['details']['resourceAllocation'] = float(value)
                    
                    if generator_row + 4 < df.shape[0] and col_idx < df.shape[1]:
                        value = df.iloc[generator_row + 4, col_idx]
                        if pd.notna(value) and isinstance(value, (int, float)):
                            iteration_data['details']['dataCompression'] = float(value)
                    
                    if generator_row + 5 < df.shape[0] and col_idx < df.shape[1]:
                        value = df.iloc[generator_row + 5, col_idx]
                        if pd.notna(value) and isinstance(value, (int, float)):
                            iteration_data['details']['cacheStrategy'] = float(value)
                    
                    if generator_row + 7 < df.shape[0] and col_idx < df.shape[1]:
                        value = df.iloc[generator_row + 7, col_idx]
                        if pd.notna(value) and isinstance(value, (int, float)):
                            iteration_data['details']['loadBalancing'] = float(value)
                
                # 提取效率数据（基于成本计算）
                # 在实际应用中，应该根据具体需求计算效率
                iteration_data['efficiency'] = max(50, min(95, 100 - (iteration_data['cost'] / 10)))  # 简单映射
                
                data['iterations'].append(iteration_data)
        else:
            # 如果没有找到特殊的迭代列格式，使用通用方法
            excel_data = pd.read_excel(filepath, sheet_name=None)
            iteration_sheet = None
            for sheet_name, sheet_data in excel_data.items():
                if '迭代' in sheet_name or 'iteration' in sheet_name.lower():
                    iteration_sheet = sheet_data
                    break
            
            # 如果没找到特定名称的工作表，使用第一个工作表
            if iteration_sheet is None and excel_data:
                iteration_sheet = list(excel_data.values())[0]
            
            # 如果找到了包含迭代数据的工作表
            if iteration_sheet is not None:
                # 将DataFrame转换为字典列表
                iteration_records = iteration_sheet.to_dict('records')
                
                # 处理每一行数据
                for i, record in enumerate(iteration_records):
                    # 提取关键字段，使用默认值以防缺失
                    iteration_data = {
                        'iteration': record.get('迭代次数', record.get('iteration', record.get('Iteration', i + 1))),
                        'cost': record.get('成本', record.get('cost', record.get('Cost', 0))),
                        'efficiency': record.get('效率', record.get('efficiency', record.get('Efficiency', 0))),
                        'timestamp': record.get('时间戳', record.get('timestamp', record.get('Timestamp', ''))),
                        'details': {
                            'networkRouting': record.get('网络路由优化', record.get('network_routing', record.get('Network_Routing', 0))),
                            'resourceAllocation': record.get('资源分配优化', record.get('resource_allocation', record.get('Resource_Allocation', 0))),
                            'dataCompression': record.get('数据压缩', record.get('data_compression', record.get('Data_Compression', 0))),
                            'cacheStrategy': record.get('缓存策略优化', record.get('cache_strategy', record.get('Cache_Strategy', 0))),
                            'loadBalancing': record.get('负载均衡', record.get('load_balancing', record.get('Load_Balancing', 0)))
                        }
                    }
                    
                    # 确保数值类型正确
                    iteration_data['iteration'] = int(iteration_data['iteration'])
                    iteration_data['cost'] = float(iteration_data['cost'])
                    iteration_data['efficiency'] = float(iteration_data['efficiency'])
                    
                    # 处理详细指标
                    for key in iteration_data['details']:
                        iteration_data['details'][key] = float(iteration_data['details'][key])
                    
                    data['iterations'].append(iteration_data)
        
        return data
    except Exception as e:
        logging.error(f"解析Excel文件时出错: {str(e)}")
        raise

def extract_section(content: str, section_name: str, end_char: str = ';') -> str:
    """
    从内容中提取指定部分的数据
    优化版本，减少不必要的字符串操作
    """
    start_marker = section_name + ' = ['
    start_idx = content.find(start_marker)
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

def parse_matrix_data_optimized(section_content: str) -> List[List[float]]:
    """
    优化版本的矩阵数据解析函数
    使用更高效的字符串处理和数值转换方法（如果numpy可用）
    """
    # 移除首尾的方括号和空白字符
    content = section_content.strip()
    if content.startswith('['):
        content = content[1:]
    if content.endswith(']'):
        content = content[:-1]
    
    # 按行分割并处理，使用列表推导式提高效率
    lines = content.split(';')
    
    # 使用numpy进行向量化处理，提高数值转换效率
    matrix = []
    for line in lines:
        stripped_line = line.strip()
        if stripped_line:
            if HAS_NUMPY:
                try:
                    # 使用numpy.fromstring进行高效的数值解析
                    numbers = np.fromstring(stripped_line, sep=' ').tolist()
                    if numbers:  # 只添加非空行
                        matrix.append(numbers)
                except Exception:
                    # 回退到原来的解析方法
                    numbers = []
                    for num_str in stripped_line.split():
                        try:
                            numbers.append(float(num_str))
                        except ValueError:
                            continue
                    if numbers:
                        matrix.append(numbers)
            else:
                # 不使用numpy的标准Python实现，但优化split操作
                numbers = []
                # 使用生成器表达式提高效率
                num_strings = (s for s in stripped_line.split() if s)
                for num_str in num_strings:
                    try:
                        numbers.append(float(num_str))
                    except ValueError:
                        continue
                if numbers:
                    matrix.append(numbers)
    
    return matrix

def build_electric_network_graph(data: Dict[str, Any]) -> Dict[str, List[Dict]]:
    """
    构建电力网络图结构
    优化版本，使用更高效的数据结构和减少重复操作
    """
    nodes = []
    links = []
    
    # 创建节点（总线）
    bus_dict = {}  # bus_id -> node_info
    bus_data_list = data['bus']
    
    # 预分配列表大小以提高性能
    expected_nodes = len(bus_data_list) + len(data['gen'])
    nodes = [None] * expected_nodes
    node_index = 0
    
    # 批量处理总线数据
    for i, bus_data in enumerate(bus_data_list):
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
            nodes[node_index] = node
            node_index += 1
            bus_dict[bus_id] = node
    
    # 添加发电机节点
    gen_nodes = {}
    gen_data_list = data['gen']
    
    for i, gen_data in enumerate(gen_data_list):
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
            nodes[node_index] = node
            node_index += 1
            gen_nodes[gen_id] = node
    
    # 调整节点列表大小
    nodes = nodes[:node_index]
    
    # 预分配链接列表大小
    expected_links = len(data['branch']) + len(gen_nodes)
    links = [None] * expected_links
    link_index = 0
    
    # 创建支路连接（边）
    branch_data_list = data['branch']
    for branch_data in branch_data_list:
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
            links[link_index] = link
            link_index += 1
    
    # 连接发电机到母线
    for gen_id, gen_node in gen_nodes.items():
        bus_id = gen_node['connected_bus']
        link = {
            'source': gen_id,
            'target': f'E{bus_id}',
            'type': 'generator_connection',
            'value': gen_node['pg']
        }
        links[link_index] = link
        link_index += 1
    
    # 调整链接列表大小
    links = links[:link_index]
    
    return {
        'nodes': nodes,
        'links': links
    }

def build_gas_network_graph(data: Dict[str, Any]) -> Dict[str, List[Dict]]:
    """
    构建天然气网络图结构
    优化版本，使用更高效的数据结构和减少重复操作
    确保所有燃气系统编号从1开始，并建立完善的ID匹配关系
    """
    nodes = []
    links = []
    
    # 预分配列表大小
    expected_nodes = len(data['gas_bus']) + len(data['gas_source'])
    nodes = [None] * expected_nodes
    node_index = 0
    
    # 创建天然气节点 - 重新编号，确保从1开始
    gas_bus_dict = {}  # 原bus_id到新节点的映射
    gas_bus_old_to_new = {}  # 原bus_id到新bus_id的映射
    gas_bus_data_list = data['gas_bus']
    
    for i, gas_bus_data in enumerate(gas_bus_data_list):
        if len(gas_bus_data) >= 5:
            # 分配新的bus_id，从1开始
            new_bus_id = i + 1
            # 原bus_id，用于映射
            old_bus_id = int(gas_bus_data[0])
            
            pressure_max = gas_bus_data[1]
            pressure_min = gas_bus_data[2]
            load = gas_bus_data[4] if len(gas_bus_data) > 4 else 0
            
            node = {
                'id': f'gasnode{new_bus_id}',
                'name': f'Gas Node {new_bus_id}',
                'type': 'gas_node',
                'pressure_max': pressure_max,
                'pressure_min': pressure_min,
                'load': load
            }
            nodes[node_index] = node
            node_index += 1
            gas_bus_dict[new_bus_id] = node
            gas_bus_old_to_new[old_bus_id] = new_bus_id
    
    # 添加气源节点 - 重新编号，确保从1开始
    gas_source_dict = {}
    gas_source_old_to_new = {}  # 原source_id到新source_id的映射
    gas_source_data_list = data['gas_source']
    
    for i, source_data in enumerate(gas_source_data_list):
        if len(source_data) >= 4:  # 修正条件，只需要4个元素
            # 分配新的source_id，从1开始
            new_source_id = i + 1
            # 原source_id，用于映射
            old_source_id = int(source_data[0])
            
            # 获取连接的天然气节点ID，并转换为新的ID
            old_connected_bus_id = int(source_data[1])
            new_connected_bus_id = gas_bus_old_to_new.get(old_connected_bus_id, old_connected_bus_id)
            
            min_w = source_data[2]
            max_w = source_data[3]
            
            node = {
                'id': f'gassource{new_source_id}',  # 使用gassource{id}格式，与前端期望一致
                'name': f'Gas Source {new_source_id}',
                'type': 'gas_source',
                'connected_bus': new_connected_bus_id,
                'min_w': min_w,
                'max_w': max_w
            }
            nodes[node_index] = node
            node_index += 1
            gas_source_dict[new_source_id] = node
            gas_source_old_to_new[old_source_id] = new_source_id
    
    # 调整节点列表大小
    nodes = nodes[:node_index]
    
    # 预分配链接列表大小
    expected_links = len(data['gas_branch']) + len(gas_source_dict)
    links = [None] * expected_links
    link_index = 0
    
    # 创建管道连接 - 重新编号，确保从1开始
    gas_branch_data_list = data['gas_branch']
    for i, pipe_data in enumerate(gas_branch_data_list):
        if len(pipe_data) >= 4:
            # 获取管道连接的天然气节点ID，并转换为新的ID
            old_fbus = int(pipe_data[1])
            old_tbus = int(pipe_data[2])
            new_fbus = gas_bus_old_to_new.get(old_fbus, old_fbus)
            new_tbus = gas_bus_old_to_new.get(old_tbus, old_tbus)
            
            capacity = pipe_data[3]
            
            link = {
                'id': f'gaspipe{i+1}',  # 添加管道ID，从1开始
                'source': f'gasnode{new_fbus}',
                'target': f'gasnode{new_tbus}',
                'type': 'gas_pipe',
                'name': f'Gas Pipe {i+1}',  # 添加管道名称，从1开始
                'capacity': capacity
            }
            links[link_index] = link
            link_index += 1
    
    # 连接气源到节点 - 使用新的ID
    for new_source_id, source_node in gas_source_dict.items():
        connected_bus_id = source_node['connected_bus']
        link = {
                'source': f'gassource{new_source_id}',
                'target': f'gasnode{connected_bus_id}',
                'type': 'gas_source_connection',
                'value': source_node.get('max_w', 0)
            }
        links[link_index] = link
        link_index += 1
    
    # 调整链接列表大小
    links = links[:link_index]
    
    logger.info(f"Gas network nodes count: {len(nodes)}")  # 调试信息
    logger.info(f"Gas network links count: {len(links)}")  # 调试信息
    return {
        'nodes': nodes,
        'links': links
    }

def combine_networks(electric_graph: Dict[str, List[Dict]], gas_graph: Dict[str, List[Dict]], raw_data: Dict[str, Any]) -> Dict[str, List[Dict]]:
    """
    合并电力和天然气网络，并添加它们之间的耦合关系
    优化版本，使用更高效的数据结构和减少重复操作
    """
    # 预分配列表大小以提高性能
    total_nodes = len(electric_graph['nodes']) + len(gas_graph['nodes'])
    # 先按最大可能数量预估链接数（包括最多三个耦合连接）
    total_links = len(electric_graph['links']) + len(gas_graph['links']) + 3
    
    combined_nodes = [None] * total_nodes
    combined_links = [None] * total_links
    
    # 批量复制节点数据
    node_index = 0
    for node in electric_graph['nodes']:
        combined_nodes[node_index] = node
        node_index += 1
        
    for node in gas_graph['nodes']:
        combined_nodes[node_index] = node
        node_index += 1
    
    # 批量复制链接数据
    link_index = 0
    for link in electric_graph['links']:
        combined_links[link_index] = link
        link_index += 1
        
    for link in gas_graph['links']:
        combined_links[link_index] = link
        link_index += 1
    
    initial_link_count = link_index
    
    logger.info(f"Electric links count: {len(electric_graph['links'])}")
    logger.info(f"Gas links count: {len(gas_graph['links'])}")
    logger.info(f"Initial combined links count: {initial_link_count}")
    
    # 添加电力-天然气耦合连接
    # 根据mpc.GasGen数据建立天然气节点与电力母线的连接
    logger.info(f"Raw data keys: {raw_data.keys()}")
    coupling_count = 0
    if 'gas_gen' in raw_data:
        logger.info(f"Found gas_gen data: {raw_data['gas_gen']}")
        for gas_gen_data in raw_data['gas_gen']:
            if len(gas_gen_data) >= 2 and coupling_count < 3:  # 限制为最多3个耦合连接
                old_gas_bus_id = int(gas_gen_data[0])  # 原天然气节点ID
                power_bus_id = int(gas_gen_data[1])  # 电力母线ID
                
                # 查找新的天然气节点ID（如果存在映射关系）
                # 从gas_graph的nodes中查找对应的gas_node，获取新的ID
                new_gas_bus_id = old_gas_bus_id
                for node in gas_graph['nodes']:
                    if node['type'] == 'gas_node':
                        # 从节点名称中提取编号，例如"Gas Node 1"提取出1
                        name_match = re.match(r'Gas Node (\d+)', node['name'])
                        if name_match:
                            current_node_id = int(name_match.group(1))
                            # 查找当前gas_gen_data在raw_data['gas_gen']中的索引
                            gen_index = raw_data['gas_gen'].index(gas_gen_data)
                            # 假设gas_gen中的ID是按顺序对应的（第一个gas_gen对应第一个gas_node，以此类推）
                            if gen_index == current_node_id - 1:
                                new_gas_bus_id = current_node_id
                                break
                
                # 创建耦合连接
                coupling_link = {
                    'source': f'gasnode{new_gas_bus_id}',
                    'target': f'E{power_bus_id}',
                    'type': 'coupling',
                    'value': 'gas_to_power'
                }
                combined_links[link_index] = coupling_link
                link_index += 1
                coupling_count += 1
                logger.info(f"Added coupling link: {coupling_link}")
    else:
        logger.info("No gas_gen data found in raw_data")
    # 调整最终链接数组大小
    combined_links = combined_links[:link_index]
    final_link_count = len(combined_links)
    logger.info(f"Final combined links count: {final_link_count}")
    
    return {
        'nodes': combined_nodes,
        'links': combined_links
    }

def save_processed_data(data: Dict[str, Any], output_dir: str):
    """
    保存处理后的数据
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # 记录要保存的数据信息
    logger.info(f"Saving data with {len(data.get('nodes', []))} nodes and {len(data.get('links', []))} links")
    logger.info(f"Output directory: {os.path.abspath(output_dir)}")
    
    # 检查是否有耦合连接
    coupling_links = [link for link in data.get('links', []) if link.get('type') == 'coupling']
    logger.info(f"Found {len(coupling_links)} coupling links to save")
    for link in coupling_links:
        logger.info(f"Coupling link: {link}")
    
    # 保存节点数据 - 使用更高效的编码方式
    nodes_file = os.path.join(output_dir, 'nodes.json')
    logger.info(f"Nodes file path: {os.path.abspath(nodes_file)}")
    with open(nodes_file, 'w', encoding='utf-8') as f:
        # 对于生产环境，减少缩进以减小文件大小
        json.dump(data['nodes'], f, ensure_ascii=False, separators=(',', ':'))
    
    # 保存连接数据
    links_file = os.path.join(output_dir, 'links.json')
    logger.info(f"Links file path: {os.path.abspath(links_file)}")
    logger.info(f"About to save {len(data['links'])} links to {links_file}")
    # 再次检查即将保存的链接中是否有耦合连接
    temp_coupling_links = [link for link in data['links'] if link.get('type') == 'coupling']
    logger.info(f"Rechecking: Found {len(temp_coupling_links)} coupling links in data['links']")
    
    # 在保存之前先记录要保存的数据
    logger.info("Data to be saved:")
    for i, link in enumerate(data['links']):
        if link.get('type') == 'coupling':
            logger.info(f"  Link {i}: {link}")
    
    with open(links_file, 'w', encoding='utf-8') as f:
        # 对于生产环境，减少缩进以减小文件大小
        json.dump(data['links'], f, ensure_ascii=False, separators=(',', ':'))
    
    # 保存后立即读取验证
    with open(links_file, 'r', encoding='utf-8') as f:
        saved_data = json.load(f)
    saved_coupling = [link for link in saved_data if link.get('type') == 'coupling']
    logger.info(f"After saving, found {len(saved_coupling)} coupling links in the saved file")
    
    # 保存完整图数据
    graph_file = os.path.join(output_dir, 'graph.json')
    logger.info(f"Graph file path: {os.path.abspath(graph_file)}")
    logger.info(f"About to save graph data with {len(data.get('links', []))} links to {graph_file}")
    with open(graph_file, 'w', encoding='utf-8') as f:
        # 对于生产环境，减少缩进以减小文件大小
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    
    logger.info("Data saved successfully")

def main():
    """
    主函数
    """
    # 输入文件路径
    input_file = os.path.join(os.path.dirname(__file__), 'data', 'raw', '电39-气20.txt')
    
    # 输出目录 - 修复路径问题
    processed_dir = os.path.join(os.path.dirname(__file__), 'data', 'processed')
    normalized_dir = os.path.join(os.path.dirname(__file__), 'data', 'normalized')
    
    # 检查输入文件是否存在
    if not os.path.exists(input_file):
        logger.error(f"错误: 找不到输入文件 {input_file}")
        return
    
    # 解析原始数据
    logger.info("正在解析原始数据...")
    raw_data = parse_matpower_data(input_file)
    
    # 构建电力网络图
    logger.info("正在构建电力网络图...")
    electric_graph = build_electric_network_graph(raw_data)
    
    # 构建天然气网络图
    logger.info("正在构建天然气网络图...")
    gas_graph = build_gas_network_graph(raw_data)
    
    # 合并网络
    logger.info("正在合并网络...")
    combined_graph = combine_networks(electric_graph, gas_graph, raw_data)
    
    # 保存处理后的数据
    logger.info("正在保存处理后的数据...")
    save_processed_data(combined_graph, processed_dir)
    
    logger.info("数据处理完成！")
    logger.info(f"节点数量: {len(combined_graph['nodes'])}")
    logger.info(f"连接数量: {len(combined_graph['links'])}")

if __name__ == "__main__":
    main()