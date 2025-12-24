from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from flask_caching import Cache
import json
import os
from werkzeug.utils import secure_filename
import os
import sys
import traceback
import logging
import asyncio
import concurrent.futures
from threading import Thread
from flask import request
import json
import re
import time
from subprocess import Popen, PIPE, STDOUT

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# 添加当前目录到Python路径，以便导入data_processor
sys.path.append(os.path.dirname(__file__))
from data_processor import parse_matpower_data, build_electric_network_graph, build_gas_network_graph, combine_networks, save_processed_data
from vulnerability_assessment import VulnerabilityAssessment

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置缓存
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

# 初始化全局存储变量
iteration_data_store = {
    'current_iteration': 0,
    'upper_objective': [],
    'lower_cost': [],
    'timestamp': time.time()
}

parameter_sensitivity_store = {
    'is_running': False,
    'results': [],
    'current_param': None,
    'total_params': 0,
    'timestamp': time.time()
}

# 设置静态文件目录
STATIC_FOLDER = os.path.join(os.path.dirname(__file__), 'data', 'processed')

# 文件上传配置
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'data', 'uploads')
ALLOWED_EXTENSIONS = {'txt', 'xlsx', 'xls'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# 确保上传目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """检查文件类型是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return jsonify({"message": "能源攻防平台后端服务", "status": "running"})

@app.route('/api/graph')
@cache.cached(timeout=300)  # 缓存5分钟
def get_graph_data():
    """获取图数据"""
    try:
        # 读取处理后的图数据
        graph_file = os.path.join(STATIC_FOLDER, 'graph.json')
        if os.path.exists(graph_file):
            with open(graph_file, 'r', encoding='utf-8') as f:
                graph_data = json.load(f)
            return jsonify(graph_data)
        else:
            return jsonify({"error": "图数据文件不存在"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/nodes')
@cache.cached(timeout=300)  # 缓存5分钟
def get_nodes():
    """获取节点数据"""
    try:
        nodes_file = os.path.join(STATIC_FOLDER, 'nodes.json')
        if os.path.exists(nodes_file):
            with open(nodes_file, 'r', encoding='utf-8') as f:
                nodes_data = json.load(f)
            return jsonify(nodes_data)
        else:
            return jsonify({"error": "节点数据文件不存在"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/links')
@cache.cached(timeout=300)  # 缓存5分钟
def get_links():
    """获取连接数据"""
    try:
        links_file = os.path.join(STATIC_FOLDER, 'links.json')
        if os.path.exists(links_file):
            with open(links_file, 'r', encoding='utf-8') as f:
                links_data = json.load(f)
            return jsonify(links_data)
        else:
            return jsonify({"error": "连接数据文件不存在"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stats')
@cache.cached(timeout=300)  # 缓存5分钟
def get_network_stats():
    """获取网络统计信息"""
    try:
        graph_file = os.path.join(STATIC_FOLDER, 'graph.json')
        if os.path.exists(graph_file):
            with open(graph_file, 'r', encoding='utf-8') as f:
                graph_data = json.load(f)
            
            # 计算统计信息
            node_count = len(graph_data.get('nodes', []))
            link_count = len(graph_data.get('links', []))
            
            # 分类统计
            node_types = {}
            link_types = {}
            
            for node in graph_data.get('nodes', []):
                node_type = node.get('type', 'unknown')
                node_types[node_type] = node_types.get(node_type, 0) + 1
            
            # 扩展连接类型统计，特别处理耦合连接
            # 统计所有可能的耦合连接类型
            coupling_count = 0
            for link in graph_data.get('links', []):
                link_type = link.get('type', 'unknown')
                
                # 检查是否为耦合连接（包括直接标记为coupling的和通过value属性标识的）
                if link_type == 'coupling' or link.get('value') in ['gas_to_power', 'power_to_gas']:
                    coupling_count += 1
                    # 如果不是直接标记为coupling但通过value标识为耦合，则仍按原类型统计
                    if link_type != 'coupling':
                        link_types[link_type] = link_types.get(link_type, 0) + 1
                else:
                    link_types[link_type] = link_types.get(link_type, 0) + 1
            
            # 确保耦合连接在统计中正确显示
            if coupling_count > 0:
                link_types['coupling'] = link_types.get('coupling', 0) + coupling_count
            
            # 添加日志以便调试
            logger.info(f"统计信息计算结果 - 总节点数: {node_count}, 总连接数: {link_count}")
            logger.info(f"节点类型统计: {node_types}")
            logger.info(f"连接类型统计: {link_types}")
            
            stats = {
                "total_nodes": node_count,
                "total_links": link_count,
                "node_types": node_types,
                "link_types": link_types
            }
            
            return jsonify(stats)
        else:
            return jsonify({"error": "数据文件不存在"}), 404
    except Exception as e:
        logger.error(f"获取网络统计信息时出错: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/system-status')
@cache.cached(timeout=300)  # 缓存5分钟
def get_system_status():
    """获取系统状态信息"""
    try:
        graph_file = os.path.join(STATIC_FOLDER, 'graph.json')
        if os.path.exists(graph_file):
            with open(graph_file, 'r', encoding='utf-8') as f:
                graph_data = json.load(f)
            
            # 发电机/气源出力分配
            generators = []
            gas_sources = []
            
            for node in graph_data.get('nodes', []):
                if node.get('type') == 'generator':
                    generators.append({
                        'id': node.get('id'),
                        'name': node.get('name', f'发电机{node.get("id")}'),
                        'output': node.get('pg', 0),
                        'unit': 'MW',
                        'type': 'electric',
                        'details': {
                            'connected_bus': node.get('connected_bus'),
                            'qg': node.get('qg', 0),  # 无功出力
                            'pmax': node.get('pmax', 0),  # 最大有功出力
                            'pmin': node.get('pmin', 0),  # 最小有功出力
                            'status': node.get('status', 'online')
                        }
                    })
                elif node.get('type') == 'gas_source':
                    gas_sources.append({
                        'id': node.get('id'),
                        'name': node.get('name', f'气源{node.get("id")}'),
                        'output': node.get('max_w', 0) * 1000 if node.get('max_w') else 0,  # 转换为 m³/h
                        'unit': 'm³/h',
                        'type': 'gas',
                        'details': {
                            'connected_bus': node.get('connected_bus'),
                            'min_w': node.get('min_w', 0),  # 最小供气量
                            'max_w': node.get('max_w', 0),  # 最大供气量
                            'status': node.get('status', 'online')
                        }
                    })
            
            # 线路/管道潮流分布
            electric_branches = []
            gas_pipes = []
            
            for i, link in enumerate(graph_data.get('links', [])):
                if link.get('type') == 'electric_branch':
                    electric_branches.append({
                        'id': link.get('id', f"line{i+1}"),
                        'name': link.get('name', f"线路{i+1}"),
                        'flow': round(abs(hash(f"{link.get('source')}-{link.get('target')}")) % 100 + 1, 2),  # 模拟数据
                        'unit': 'MW',
                        'type': 'electric',
                        'details': {
                            'source': link.get('source'),
                            'target': link.get('target'),
                            'resistance': link.get('r', 0),  # 电阻
                            'reactance': link.get('x', 0),   # 电抗
                            'capacity': link.get('capacity', 100),  # 容量
                            'status': link.get('status', 'operational')
                        }
                    })
                elif link.get('type') == 'gas_pipe':
                    # 使用link的id作为管道id，确保与data_processor生成的一致
                    gas_pipes.append({
                        'id': link.get('id'),
                        'name': link.get('name', f"Gas Pipe {i+1}"),
                        'flow': round(abs(hash(f"{link.get('source')}-{link.get('target')}")) % 3000 + 1000, 2),  # 模拟数据
                        'unit': 'm³/h',
                        'type': 'gas',
                        'details': {
                            'source': link.get('source'),
                            'target': link.get('target'),
                            'capacity': link.get('capacity', 5000),  # 容量
                            'status': link.get('status', 'operational')
                        }
                    })
            
            # 节点电压/压力分布
            electric_nodes = []
            gas_nodes = []
            
            for node in graph_data.get('nodes', []):
                if node.get('type') == 'electric_bus':
                    electric_nodes.append({
                        'id': node.get('id'),
                        'name': node.get('name', f'节点{node.get("id")}'),
                        'value': round(node.get('vm', 0), 2),
                        'unit': 'kV',
                        'type': 'electric',
                        'details': {
                            'bus_type': node.get('bus_type', 1),  # 母线类型
                            'pd': node.get('pd', 0),  # 有功负荷
                            'qd': node.get('qd', 0),  # 无功负荷
                            'va': node.get('va', 0),  # 电压相角
                            'status': node.get('status', 'normal')
                        }
                    })
                elif node.get('type') == 'gas_node':
                    gas_nodes.append({
                        'id': node.get('id'),
                        'name': node.get('name', f'节点{node.get("id")}'),
                        'value': round(node.get('pressure_min', 0), 2),
                        'unit': 'MPa',
                        'type': 'gas',
                        'details': {
                            'pressure_max': node.get('pressure_max', 0),  # 最大压力
                            'pressure_min': node.get('pressure_min', 0),  # 最小压力
                            'load': node.get('load', 0),  # 负荷
                            'status': node.get('status', 'normal')
                        }
                    })
            
            # 系统运行成本，直接设为0
            generation_cost = 0
            transmission_cost = 0
            total_cost = 0
            
            system_status = {
                "generatorOutput": generators + gas_sources,
                "flowDistribution": electric_branches + gas_pipes,  # 显示所有线路和管道
                "nodeStatus": electric_nodes + gas_nodes,  # 显示所有节点
                "systemCost": {
                    "generationCost": generation_cost,
                    "transmissionCost": transmission_cost,
                    "totalCost": total_cost,
                    "unit": "元/h"
                }
            }
            
            return jsonify(system_status)
        else:
            return jsonify({"error": "数据文件不存在"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/system-components')
@cache.cached(timeout=300)  # 缓存5分钟
def get_system_components():
    """获取系统所有组件的详细信息"""
    try:
        graph_file = os.path.join(STATIC_FOLDER, 'graph.json')
        if os.path.exists(graph_file):
            with open(graph_file, 'r', encoding='utf-8') as f:
                graph_data = json.load(f)
            
            # 分类整理所有组件
            components = {
                "generators": [],
                "gasSources": [],
                "electricNodes": [],
                "gasNodes": [],
                "electricBranches": [],
                "gasPipes": [],
                "couplingLinks": []
            }
            
            # 处理节点数据
            for node in graph_data.get('nodes', []):
                node_data = {
                    'id': node.get('id'),
                    'name': node.get('name', f'{node.get("type")} {node.get("id")}'),
                    'type': node.get('type'),
                    'properties': {k: v for k, v in node.items() if k not in ['id', 'name', 'type']}
                }
                
                if node.get('type') == 'generator':
                    components["generators"].append(node_data)
                elif node.get('type') == 'gas_source':
                    components["gasSources"].append(node_data)
                elif node.get('type') == 'electric_bus':
                    components["electricNodes"].append(node_data)
                elif node.get('type') == 'gas_node':
                    components["gasNodes"].append(node_data)
            
            # 处理连接数据
            for link in graph_data.get('links', []):
                link_data = {
                    'id': f"{link.get('source')}-{link.get('target')}",
                    'source': link.get('source'),
                    'target': link.get('target'),
                    'type': link.get('type'),
                    'properties': {k: v for k, v in link.items() if k not in ['source', 'target', 'type']}
                }
                
                if link.get('type') == 'electric_branch':
                    components["electricBranches"].append(link_data)
                elif link.get('type') == 'gas_pipe':
                    components["gasPipes"].append(link_data)
                elif link.get('type') == 'coupling':
                    components["couplingLinks"].append(link_data)
            
            return jsonify(components)
        else:
            return jsonify({"error": "数据文件不存在"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 创建线程池执行器用于异步处理
executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
# 存储正在进行的任务
processing_tasks = {}

@app.route('/api/import-data', methods=['POST'])
def import_data():
    """导入并处理新的数据文件"""
    try:
        # 检查是否有文件上传
        if 'file' not in request.files:
            return jsonify({"error": "没有文件被上传"}), 400
        
        file = request.files['file']
        
        # 检查文件名
        if file.filename == '':
            return jsonify({"error": "没有选择文件"}), 400
        
        # 检查文件类型
        if not allowed_file(file.filename):
            return jsonify({"error": "不支持的文件类型，仅支持.txt、.xlsx和.xls文件"}), 400
        
        # 保存上传的文件
        filename = secure_filename(file.filename)
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(upload_path)
        
        # 根据文件扩展名决定处理方式
        file_extension = filename.rsplit('.', 1)[1].lower()
        
        # 异步处理数据
        if file_extension in ['xlsx', 'xls']:
            # Excel文件处理
            future = executor.submit(process_excel_data_async, upload_path)
        else:
            # 文本文件处理
            future = executor.submit(process_data_async, upload_path)
        
        # 将任务存储在处理任务字典中
        task_id = filename  # 使用文件名作为任务ID
        processing_tasks[task_id] = {
            "future": future,
            "status": "processing",
            "result": None
        }
        
        # 立即返回响应，告知客户端数据处理已在后台开始
        return jsonify({
            "message": "数据导入已在后台开始处理",
            "task_id": task_id,
            "status": "processing"
        }), 202
        
    except Exception as e:
        # 记录详细的错误信息
        error_details = traceback.format_exc()
        logger.error(f"数据导入错误: {str(e)}")
        logger.error(error_details)
        return jsonify({"error": f"数据导入失败: {str(e)}"}), 500

def process_data_async(upload_path):
    """异步处理数据的函数"""
    try:
        logger.info(f"开始处理数据文件: {upload_path}")
        
        # 处理数据
        logger.info("正在解析MATPOWER数据...")
        raw_data = parse_matpower_data(upload_path)
        logger.info(f"数据解析完成，包含 {len(raw_data.get('bus', []))} 个母线节点")
        
        logger.info("正在构建电力网络图...")
        electric_graph = build_electric_network_graph(raw_data)
        logger.info(f"电力网络图构建完成，包含 {len(electric_graph['nodes'])} 个节点和 {len(electric_graph['links'])} 条支路")
        
        logger.info("正在构建天然气网络图...")
        gas_graph = build_gas_network_graph(raw_data)
        logger.info(f"天然气网络图构建完成，包含 {len(gas_graph['nodes'])} 个节点和 {len(gas_graph['links'])} 条管道")
        
        logger.info("正在合并电力和天然气网络...")
        combined_graph = combine_networks(electric_graph, gas_graph, raw_data)
        logger.info(f"网络合并完成，总节点数: {len(combined_graph['nodes'])}, 总连接数: {len(combined_graph['links'])}")
        
        # 保存处理后的数据，覆盖现有数据
        logger.info("正在保存处理后的数据...")
        save_processed_data(combined_graph, STATIC_FOLDER)
        logger.info("数据保存完成")
        
        # 清除所有缓存
        cache.clear()
        logger.info("缓存已清除")
        
        logger.info("数据导入和处理完成")
        return {
            "message": "数据导入成功",
            "nodes_count": len(combined_graph['nodes']),
            "links_count": len(combined_graph['links'])
        }
    except Exception as e:
        # 记录详细的错误信息
        error_details = traceback.format_exc()
        logger.error(f"异步数据处理错误: {str(e)}")
        logger.error(error_details)
        return {"error": f"数据处理失败: {str(e)}"}

def process_excel_data_async(upload_path):
    """异步处理Excel数据文件的函数"""
    try:
        logger.info(f"开始处理Excel数据文件: {upload_path}")
        
        # 导入数据处理器中的Excel解析函数
        from data_processor import parse_excel_data
        
        # 处理Excel数据
        logger.info("正在解析Excel数据...")
        excel_data = parse_excel_data(upload_path)
        logger.info(f"Excel数据解析完成，包含 {len(excel_data.get('iterations', []))} 次迭代数据")
        
        # 保存Excel处理结果到特定位置
        excel_output_dir = os.path.join(os.path.dirname(__file__), 'data', 'processed', 'excel_data')
        os.makedirs(excel_output_dir, exist_ok=True)
        
        # 保存迭代数据
        iterations_file = os.path.join(excel_output_dir, 'iterations.json')
        with open(iterations_file, 'w', encoding='utf-8') as f:
            json.dump(excel_data.get('iterations', []), f, ensure_ascii=False, separators=(',', ':'))
        
        logger.info("Excel数据保存完成")
        
        # 清除所有缓存
        cache.clear()
        logger.info("缓存已清除")
        
        logger.info("Excel数据导入和处理完成")
        return {
            "message": "Excel数据导入成功",
            "iterations_count": len(excel_data.get('iterations', [])),
            "file_type": "excel"
        }
    except Exception as e:
        # 记录详细的错误信息
        error_details = traceback.format_exc()
        logger.error(f"异步Excel数据处理错误: {str(e)}")
        logger.error(error_details)
        return {"error": f"Excel数据处理失败: {str(e)}"}

@app.route('/api/import-status/<task_id>')
def get_import_status(task_id):
    """获取数据导入任务的状态"""
    if task_id not in processing_tasks:
        return jsonify({"error": "任务不存在"}), 404
    
    task = processing_tasks[task_id]
    
    # 检查任务是否完成
    if task["future"].done():
        # 获取任务结果
        result = task["future"].result()
        task["status"] = "completed"
        task["result"] = result
        
        # 从处理任务中移除已完成的任务
        del processing_tasks[task_id]
        
        # 返回结果
        if "error" in result:
            return jsonify({
                "task_id": task_id,
                "status": "failed",
                "error": result["error"]
            }), 500
        else:
            return jsonify({
                "task_id": task_id,
                "status": "completed",
                "result": result
            }), 200
    else:
        # 任务仍在进行中
        return jsonify({
            "task_id": task_id,
            "status": "processing"
        }), 200



@app.route('/api/iteration-data')
@cache.cached(timeout=60)  # 缓存1分钟
def get_iteration_data():
    """获取优化迭代数据"""
    try:
        iterations_file = os.path.join(os.path.dirname(__file__), 'data', 'processed', 'excel_data', 'iterations.json')
        if os.path.exists(iterations_file):
            with open(iterations_file, 'r', encoding='utf-8') as f:
                iterations_data = json.load(f)
            return jsonify(iterations_data)
        else:
            return jsonify({"error": "迭代数据文件不存在"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/vulnerability')
@cache.cached(timeout=600)  # 缓存10分钟
def get_vulnerability_assessment():
    """获取系统脆弱性评估结果"""
    try:
        assessment = VulnerabilityAssessment()
        results = assessment.assess_vulnerability()
        return jsonify(results)
    except Exception as e:
        logger.error(f"脆弱性评估失败: {str(e)}")
        return jsonify({"error": f"脆弱性评估失败: {str(e)}"}), 500

@app.route('/api/vulnerability/node/<node_id>')
@cache.cached(timeout=600)  # 缓存10分钟
def get_node_vulnerability_details(node_id):
    """获取特定节点的脆弱性详细信息"""
    try:
        assessment = VulnerabilityAssessment()
        results = assessment.assess_vulnerability()
        
        # 在所有节点中查找指定节点
        all_nodes = results.get('electric_system', []) + results.get('gas_system', [])
        node_details = next((node for node in all_nodes if node['node_id'] == node_id), None)
        
        if node_details:
            return jsonify(node_details)
        else:
            return jsonify({"error": "节点不存在"}), 404
    except Exception as e:
        logger.error(f"获取节点脆弱性详情失败: {str(e)}")
        return jsonify({"error": f"获取节点脆弱性详情失败: {str(e)}"}), 500

@app.route('/api/run-optimization', methods=['POST'])
def run_optimization():
    """运行优化脚本并返回结果"""
    try:
        # 获取请求参数
        data = request.get_json()
        constraints = data.get('constraints', {})
        optimizationCode = constraints.get('optimizationCode', 3)
        
        logger.info(f"接收到优化请求，优化类型: {optimizationCode}")
        logger.info(f"约束条件: {constraints}")
        
        # 根据优化类型选择Python脚本
        script_name = "elec_gas_optimization_pulp.py"
        if optimizationCode == 1:
            script_name = "only_elec.py"
        elif optimizationCode == 2:
            script_name = "only_gas.py"
        
        script_path = os.path.join(os.path.dirname(__file__), "..", script_name)
        logger.info(f"执行脚本: {script_path}")
        
        # 执行Python脚本，使用Anaconda Python解释器
        anaconda_python = "D:\\anaconda\\python.exe"
        if os.path.exists(anaconda_python):
            python_executable = anaconda_python
        else:
            python_executable = "python"  # 回退到系统Python
        
        process = Popen(
            [python_executable, script_path, str(optimizationCode)],
            stdout=PIPE,
            stderr=STDOUT,
            text=True,
            cwd=os.path.dirname(script_path)
        )
        
        # 获取脚本输出
        stdout, _ = process.communicate()
        exit_code = process.returncode
        
        logger.info(f"脚本执行结束，退出代码: {exit_code}")
        
        # 解析脚本输出
        totalCost = 0
        generatorOutput = []
        gasFlow = []
        
        if exit_code == 0:
            logger.info("脚本执行成功，开始解析输出...")
            
            # 根据优化类型选择不同的解析逻辑
            if optimizationCode == 1:  # 电力优化
                # 严格按照原始输出格式解析，只解析存在的数据
                
                # 1. 提取总成本或电力成本
                total_cost_match = re.search(r'总成本: ([\d.]+)', stdout)
                if total_cost_match:
                    totalCost = float(total_cost_match.group(1))
                    logger.info(f"提取到总成本: {totalCost}")
                
                # 2. 提取发电机功率
                gen_power_section = re.search(r'发电机功率 \(MW\):([\s\S]*?)\n\n机组状态:', stdout)
                if gen_power_section:
                    gen_power_lines = gen_power_section.group(1).strip().split('\n')
                    for line in gen_power_lines:
                        line = line.strip()
                        if line:
                            gen_match = re.match(r'发电机 (\d+):\s*([\d.]+)\s*MW', line)
                            if gen_match:
                                gen_id = f"G{gen_match.group(1)}"
                                output = float(gen_match.group(2))
                                generatorOutput.append({
                                    "id": gen_id,
                                    "output": output,
                                    "name": f"发电机{gen_match.group(1)}"
                                })
                    logger.info(f"解析到 {len(generatorOutput)} 个发电机功率数据")
                
                # 3. 提取机组状态
                unit_status_section = re.search(r'机组状态:([\s\S]*?)\n\n电力成本:', stdout)
                if unit_status_section:
                    unit_status_lines = unit_status_section.group(1).strip().split('\n')
                    for line in unit_status_lines:
                        line = line.strip()
                        if line:
                            status_match = re.match(r'发电机 (\d+):\s*(\d+)', line)
                            if status_match:
                                gen_id = f"G{status_match.group(1)}"
                                status = int(status_match.group(2))
                                # 查找对应的发电机
                                for gen in generatorOutput:
                                    if gen['id'] == gen_id:
                                        gen['status'] = status
                                        break
                    logger.info(f"解析到 {len(unit_status_lines)} 个机组状态数据")
                else:
                    # 尝试匹配到文件末尾的情况
                    unit_status_section = re.search(r'机组状态:([\s\S]*)$', stdout)
                    if unit_status_section:
                        unit_status_lines = unit_status_section.group(1).strip().split('\n')
                        for line in unit_status_lines:
                            line = line.strip()
                            if line and not line.startswith('电力成本'):
                                status_match = re.match(r'发电机 (\d+):\s*(\d+)', line)
                                if status_match:
                                    gen_id = f"G{status_match.group(1)}"
                                    status = int(status_match.group(2))
                                    # 查找对应的发电机
                                    for gen in generatorOutput:
                                        if gen['id'] == gen_id:
                                            gen['status'] = status
                                            break
                        logger.info(f"解析到 {len(unit_status_lines)} 个机组状态数据")
                
                # 4. 提取电力成本
                electric_cost_match = re.search(r'电力成本: ([\d.]+)', stdout)
                if electric_cost_match:
                    electric_cost = float(electric_cost_match.group(1))
                    logger.info(f"提取到电力成本: {electric_cost}")
                    # 如果没有提取到总成本，使用电力成本
                    if totalCost == 0:
                        totalCost = electric_cost
            
            elif optimizationCode == 2:  # 燃气优化
                # 严格按照原始输出格式解析，只解析存在的数据
                
                # 1. 提取管道流量
                pipe_flow_section = re.search(r'管道流量:([\s\S]*?)\n\n管道压力', stdout)
                if pipe_flow_section:
                    flow_lines = pipe_flow_section.group(1).strip().split('\n')
                    for line in flow_lines:
                        line = line.strip()
                        if line:
                            flow_match = re.match(r'管道 (\d+):\s*([\d.-]+)', line)
                            if flow_match:
                                pipe_id = f"gasline{flow_match.group(1)}"
                                flow = float(flow_match.group(2))
                                gasFlow.append({
                                    "id": pipe_id,
                                    "flow": flow,
                                    "name": f"管道{flow_match.group(1)}"
                                })
                    logger.info(f"解析到 {len(gasFlow)} 个管道流量数据")
                
                # 2. 提取管道压力
                pipe_pressure_section = re.search(r'管道压力 \(bar\):([\s\S]*?)\n\n天然气成本:', stdout)
                if pipe_pressure_section:
                    pressure_lines = pipe_pressure_section.group(1).strip().split('\n')
                    for line in pressure_lines:
                        line = line.strip()
                        if line:
                            pressure_match = re.match(r'节点 (\d+):\s*([\d.]+)', line)
                            if pressure_match:
                                node_id = f"gasnode{pressure_match.group(1)}"
                                pressure = float(pressure_match.group(2))
                                gasFlow.append({
                                    "id": node_id,
                                    "pressure": pressure,
                                    "name": f"节点{pressure_match.group(1)}"
                                })
                    logger.info(f"解析到 {len(gasFlow)} 个管道压力数据")
                
                # 3. 提取天然气成本
                gas_cost_match = re.search(r'天然气成本: ([\d.]+)', stdout)
                if gas_cost_match:
                    totalCost = float(gas_cost_match.group(1))
                    logger.info(f"提取到天然气成本: {totalCost}")
                
                # 4. 提取气源出力
                gas_source_section = re.search(r'气源出力:([\s\S]*?)$', stdout)
                if gas_source_section:
                    source_lines = gas_source_section.group(1).strip().split('\n')
                    for line in source_lines:
                        line = line.strip()
                        if line:
                            source_match = re.match(r'气源 (\d+):\s*([\d.]+)', line)
                            if source_match:
                                source_id = f"gassource{source_match.group(1)}"
                                output = float(source_match.group(2))
                                # 只在燃气优化中添加气源数据
                                gasFlow.append({
                                    "id": source_id,
                                    "output": output,
                                    "name": f"气源{source_match.group(1)}"
                                })
                    logger.info(f"解析到 {len(gasFlow)} 个气源出力数据")
            
            else:  # 耦合优化
                # 严格按照原始输出格式解析，只解析存在的数据
                
                # 1. 提取总成本
                total_cost_match = re.search(r'总成本: ([\d.]+)', stdout)
                if total_cost_match:
                    totalCost = float(total_cost_match.group(1))
                    logger.info(f"提取到总成本: {totalCost}")
                
                # 2. 提取发电机功率
                gen_power_section = re.search(r'发电机功率 \(MW\):([\s\S]*?)\n\n机组状态', stdout)
                if gen_power_section:
                    gen_power_lines = gen_power_section.group(1).strip().split('\n')
                    for line in gen_power_lines:
                        line = line.strip()
                        if line:
                            gen_match = re.match(r'发电机 (\d+):\s*([\d.]+)\s*MW', line)
                            if gen_match:
                                gen_id = f"G{gen_match.group(1)}"
                                output = float(gen_match.group(2))
                                generatorOutput.append({
                                    "id": gen_id,
                                    "output": output,
                                    "name": f"发电机{gen_match.group(1)}"
                                })
                    logger.info(f"解析到 {len(generatorOutput)} 个发电机功率数据")
                
                # 3. 提取机组状态
                unit_status_section = re.search(r'机组状态:([\s\S]*?)\n\n管道流量', stdout)
                if unit_status_section:
                    unit_status_lines = unit_status_section.group(1).strip().split('\n')
                    for line in unit_status_lines:
                        line = line.strip()
                        if line:
                            status_match = re.match(r'发电机 (\d+):\s*(\d+)', line)
                            if status_match:
                                gen_id = f"G{status_match.group(1)}"
                                status = int(status_match.group(2))
                                # 查找对应的发电机
                                for gen in generatorOutput:
                                    if gen['id'] == gen_id:
                                        gen['status'] = status
                                        break
                    logger.info(f"解析到 {len(unit_status_lines)} 个机组状态数据")
                
                # 4. 提取管道流量
                pipe_flow_section = re.search(r'管道流量:([\s\S]*?)\n\n管道压力', stdout)
                if pipe_flow_section:
                    flow_lines = pipe_flow_section.group(1).strip().split('\n')
                    for line in flow_lines:
                        line = line.strip()
                        if line:
                            flow_match = re.match(r'管道 (\d+):\s*([\d.-]+)', line)
                            if flow_match:
                                pipe_id = f"gasline{flow_match.group(1)}"
                                flow = float(flow_match.group(2))
                                gasFlow.append({
                                    "id": pipe_id,
                                    "flow": flow,
                                    "name": f"管道{flow_match.group(1)}"
                                })
                    logger.info(f"解析到 {len(gasFlow)} 个管道流量数据")
                
                # 5. 提取管道压力
                pipe_pressure_section = re.search(r'管道压力 \(bar\):([\s\S]*?)\n\n天然气成本:', stdout)
                if pipe_pressure_section:
                    pressure_lines = pipe_pressure_section.group(1).strip().split('\n')
                    for line in pressure_lines:
                        line = line.strip()
                        if line:
                            pressure_match = re.match(r'节点 (\d+):\s*([\d.]+)', line)
                            if pressure_match:
                                node_id = f"gasnode{pressure_match.group(1)}"
                                pressure = float(pressure_match.group(2))
                                gasFlow.append({
                                    "id": node_id,
                                    "pressure": pressure,
                                    "name": f"节点{pressure_match.group(1)}"
                                })
                    logger.info(f"解析到 {len(gasFlow)} 个管道压力数据")
                
                # 6. 提取气源出力
                gas_source_section = re.search(r'气源出力:([\s\S]*?)$', stdout)
                if gas_source_section:
                    source_lines = gas_source_section.group(1).strip().split('\n')
                    for line in source_lines:
                        line = line.strip()
                        if line:
                            source_match = re.match(r'气源 (\d+):\s*([\d.]+)', line)
                            if source_match:
                                source_id = f"gassource{source_match.group(1)}"
                                output = float(source_match.group(2))
                                gasFlow.append({
                                    "id": source_id,
                                    "output": output,
                                    "name": f"气源{source_match.group(1)}"
                                })
                    logger.info(f"解析到 {len(gasFlow)} 个气源出力数据")
        
        # 提取天然气成本和电力成本（如果存在）
        gasCost = 0
        electricCost = 0
        
        # 使用更灵活的正则表达式，允许不同的空格和行位置
        # 1. 提取天然气成本
        gas_cost_match = re.search(r'天然气成本:\s*([\d.]+)', stdout, re.MULTILINE)
        if gas_cost_match:
            gasCost = float(gas_cost_match.group(1))
            logger.info(f"提取到天然气成本: {gasCost}")
        else:
            logger.info("未找到天然气成本")
        
        # 2. 提取电力成本
        electric_cost_match = re.search(r'电力成本:\s*([\d.]+)', stdout, re.MULTILINE)
        if electric_cost_match:
            electricCost = float(electric_cost_match.group(1))
            logger.info(f"提取到电力成本: {electricCost}")
        else:
            logger.info("未找到电力成本")
        
        # 调用get_system_status获取初始状态
        system_status_response = get_system_status()
        system_status = system_status_response.get_json()
        
        # 更新初始数据中的值
        if system_status:
            # 只在电力优化或耦合优化时更新发电机数据
            if optimizationCode in [1, 3]:
                # 更新发电机输出和状态
                for gen in system_status.get('generatorOutput', []):
                    for new_gen in generatorOutput:
                        if gen['id'] == new_gen['id']:
                            # 只更新原始输出中存在的发电机数据
                            gen['output'] = new_gen['output']
                            # 只有在原始输出中存在状态时才更新
                            if 'status' in new_gen:
                                gen['details']['status'] = '运行中' if new_gen['status'] == 1 else '停止'
                            break
            
            # 只在燃气优化或耦合优化时更新管道流量和气源出力
            if optimizationCode in [2, 3]:
                # 分离管道流量、管道压力和气源出力数据
                pipe_data = [flow for flow in gasFlow if flow['id'].startswith('gasline')]
                pressure_data = [flow for flow in gasFlow if flow['id'].startswith('gasnode')]
                source_data = [flow for flow in gasFlow if flow['id'].startswith('gassource')]
                
                # 更新燃气管道流量
                for flow in system_status.get('flowDistribution', []):
                    if flow['type'] == 'gas':
                        # 直接使用管道编号来匹配，例如gasline1对应gaspipe1
                        pipe_number = ''
                        if flow['id'].startswith('gaspipe'):
                            # 系统状态中的管道ID格式是gaspipe{id}
                            pipe_number = flow['id'].replace('gaspipe', '')
                        
                        if pipe_number:
                            # 查找对应的管道流量数据，优化结果中的管道ID格式是gasline{id}
                            for new_flow in pipe_data:
                                if new_flow['id'] == f"gasline{pipe_number}":
                                    flow['flow'] = new_flow['flow']
                                    # 添加管道状态，确保前端能正确显示实际流量
                                    flow['details']['status'] = 'optimized'
                                    break
                
                # 更新燃气节点压力
                for node in system_status.get('nodeStatus', []):
                    if node['type'] == 'gas':
                        # 系统状态中的节点ID格式是gasnode{id}
                        node_number = ''
                        if node['id'].startswith('gasnode'):
                            node_number = node['id'].replace('gasnode', '')
                        
                        if node_number:
                            matching_pressure_id = f"gasnode{node_number}"
                            for new_pressure in pressure_data:
                                if new_pressure['id'] == matching_pressure_id:
                                    node['value'] = new_pressure['pressure']
                                    node['details']['pressure_min'] = new_pressure['pressure']
                                    node['details']['pressure_max'] = new_pressure['pressure']
                                    # 添加节点状态，确保前端能正确显示实际压力
                                    node['details']['status'] = 'optimized'
                                    break
                
                # 更新气源出力
                for gen in system_status.get('generatorOutput', []):
                    if gen['type'] == 'gas':
                        # 系统状态中的气源ID格式是gassource{id}
                        gen_number = ''
                        if gen['id'].startswith('gassource'):
                            gen_number = gen['id'].replace('gassource', '')
                        
                        if gen_number:
                            # 查找对应的气源数据，优化结果中的气源ID格式是gassource{id}
                            for new_source in source_data:
                                if new_source['id'] == f"gassource{gen_number}":
                                    gen['output'] = new_source['output']
                                    # 添加运行状态，确保前端能正确显示实际出力
                                    gen['details']['status'] = '运行中'
                                    break
            
            # 更新系统总成本，只使用原始输出中提取到的成本
            if totalCost > 0:
                system_status['systemCost']['totalCost'] = totalCost
            
            # 更新天然气成本和电力成本
            if gasCost > 0:
                system_status['systemCost']['gasCost'] = gasCost
            
            if electricCost > 0:
                system_status['systemCost']['electricCost'] = electricCost
        
        # 返回响应
        response = {
            "success": exit_code == 0,
            "totalCost": totalCost,
            "gasCost": gasCost,
            "electricCost": electricCost,
            "generatorOutput": generatorOutput,
            "gasFlow": gasFlow,
            "originalOutput": stdout,
            "systemStatus": system_status,
            "executionStatus": "success" if exit_code == 0 else "failed",
            "exitCode": exit_code,
            "errorMessage": "" if exit_code == 0 else stdout
        }
        
        logger.info(f"优化请求处理完成，返回结果: {response}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"优化请求处理失败: {str(e)}")
        logger.error(traceback.format_exc())
        
        # 调用get_system_status获取初始状态
        system_status_response = get_system_status()
        system_status = system_status_response.get_json()
        
        # 返回错误响应
        return jsonify({
            "success": True,
            "totalCost": 0,
            "generatorOutput": [],
            "gasFlow": [],
            "originalOutput": f"系统异常: {str(e)}\n错误栈: {traceback.format_exc()}",
            "systemStatus": system_status,
            "executionStatus": "error",
            "errorMessage": str(e)
        })

@app.route('/api/attack-simulation', methods=['POST'])
def run_attack_simulation():
    """运行攻击模拟 - 简化版，仅处理tauD参数"""
    try:
        # 获取前端传递的参数 - 现在只包含tauD
        params = request.get_json()
        
        if not params or 'tauD' not in params:
            return jsonify({"error": "缺少tauD参数"}), 400
        
        # 使用固定参数，仅tauD来自用户输入
        simulation_params = {
            "maxBilevelIter": 50,
            "bilevelTol": 0.001,
            "tauD": params['tauD'],  # 用户输入的tauD参数
            "baPS": 6,
            "baGS": 3,
            "rhoInitial": 0.1,
            "rhoMax": 10.0,
            "rhoMin": 0.01,
            "rhoUpdateFactor": 2.0,
            "etaGt": 0.35,
            "qlhv": 9700,
        }
        
        logger.info(f"接收到攻击模拟参数: {simulation_params}")
        
        # 调用攻击模拟函数
        result = run_bilevel_attack_simulation(simulation_params)
        
        return jsonify({
            "success": True,
            "message": "攻击模拟执行成功",
            "data": result
        })
        
    except Exception as e:
        logger.error(f"攻击模拟执行失败: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "message": f"攻击模拟执行失败: {str(e)}",
            "data": None
        }), 500

def run_bilevel_attack_simulation(params):
    """运行双层攻击模拟 - 调用外部bilevel_attack_11111.py脚本"""
    try:
        import subprocess
        import os
        
        # 外部脚本路径
        script_path = "c:\\Users\\Lenovo\\Desktop\\Energy defense and attack platformEnergy defense and attack platform\\bilevel_attack_with_output.py"
        
        # 检查脚本是否存在
        if not os.path.exists(script_path):
            logger.error(f"外部脚本不存在: {script_path}")
            # 脚本不存在，返回错误信息
            raise FileNotFoundError(f"外部脚本不存在: {script_path}")
        
        logger.info(f"调用外部脚本: {script_path}")
        
        # 重置迭代数据存储
        global iteration_data_store
        iteration_data_store = {
            'current_iteration': 0,
            'upper_objective': [],
            'lower_cost': [],
            'timestamp': time.time()
        }
        
        # 使用Popen替代run，以便实时读取输出
        # 通过环境变量传递tauD参数
        env = os.environ.copy()
        env['TAU_D'] = str(params['tauD'])
        
        # 使用Anaconda基础环境的Python解释器，确保有必要的科学计算库
        python_path = "D:\\anaconda\\python.exe"
        
        # 检查Anaconda Python是否可用
        if not os.path.exists(python_path):
            # 如果Anaconda路径不存在，使用系统Python
            python_path = "python"
            logger.info(f"使用系统Python解释器: {python_path}")
        else:
            logger.info(f"使用Anaconda Python解释器: {python_path}")
        
        process = subprocess.Popen(
            [python_path, script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=os.path.dirname(script_path),
            env=env
        )
        
        # 实时读取输出
        output = ""
        # 逐行读取输出
        while process.poll() is None:
            line = process.stdout.readline()
            if line:
                output += line
                logger.debug(f"脚本输出: {line.strip()}")
        
        # 读取剩余输出
        remaining_output = process.stdout.read()
        output += remaining_output
        
        # 检查脚本执行结果
        if process.returncode != 0:
            stderr_output = process.stderr.read()
            logger.error(f"外部脚本执行失败，返回码: {process.returncode}")
            logger.error(f"脚本输出: {output}")
            logger.error(f"脚本错误: {stderr_output}")
            # 脚本执行失败，抛出异常
            raise RuntimeError(f"外部脚本执行失败，返回码: {process.returncode}, 错误信息: {stderr_output}")
        
        # 解析脚本输出，提取JSON格式数据
        logger.info("外部脚本执行成功，开始解析输出")
        
        # 首先尝试找到"JSON输出结果:"标记后的JSON数据，这是最可靠的方法
        json_marker = "JSON输出结果:"
        json_marker_pos = output.find(json_marker)
        attack_result_json = None
        
        if json_marker_pos != -1:
            # 从标记位置开始查找JSON
            json_start = output.find("{", json_marker_pos)
            if json_start != -1:
                # 找到标记后的最后一个右大括号
                json_end = output.rfind("}")
                if json_end != -1 and json_end > json_start:
                    json_output = output[json_start:json_end+1]
                    try:
                        attack_result_json = json.loads(json_output)
                        logger.info(f"从标记位置提取到JSON数据")
                    except json.JSONDecodeError as e:
                        logger.warning(f"从标记位置解析JSON失败: {e}")
        
        # 如果找不到标记或解析失败，尝试其他方法
        if attack_result_json is None:
            logger.warning(f"未找到JSON输出结果标记，尝试其他解析方法")
            
            # 尝试找到最后一个完整的JSON对象
            # 查找最后一个左大括号
            json_start = output.rfind("{")
            if json_start == -1:
                logger.error("未找到JSON数据，解析失败")
                raise RuntimeError("未找到JSON数据")
            
            # 查找最后一个右大括号
            json_end = output.rfind("}")
            if json_end == -1 or json_end < json_start:
                logger.error("未找到有效的JSON结束位置，解析失败")
                raise RuntimeError("未找到有效的JSON结束位置")
            
            # 提取完整的JSON数据
            json_output = output[json_start:json_end+1]
            
            # 清理JSON数据，移除可能的额外字符
            json_output = json_output.strip()
            
            try:
                # 尝试直接解析
                attack_result_json = json.loads(json_output)
                logger.info(f"从最后一个JSON对象提取到数据")
            except json.JSONDecodeError as e:
                logger.warning(f"直接JSON解析失败，尝试逐行查找: {e}")
                
                # 如果仍然失败，尝试逐行查找有效的JSON
                lines = output.split('\n')
                for line in reversed(lines):
                    line = line.strip()
                    if line.startswith('{') and line.endswith('}'):
                        try:
                            attack_result_json = json.loads(line)
                            logger.info(f"从行中提取到JSON数据")
                            break
                        except json.JSONDecodeError:
                            continue
            
            if attack_result_json is None:
                logger.error("所有JSON解析尝试都失败了")
                raise RuntimeError(f"JSON解析失败")
        
        logger.info(f"成功解析JSON数据: {attack_result_json}")
        
        # 更新迭代数据存储
        iteration_data_store['upper_objective'] = attack_result_json.get('upper_objective', [])
        iteration_data_store['lower_cost'] = attack_result_json.get('lower_cost', [])
        iteration_data_store['current_iteration'] = len(attack_result_json.get('upper_objective', []))
        iteration_data_store['timestamp'] = time.time()
        
        # 生成攻击节点数据
        attacked_nodes = []
        
        # 添加电力攻击节点
        electric_nodes = attack_result_json['best_strategy']['electric_attack_nodes']
        for node_id in electric_nodes:
            attack_injection = attack_result_json['best_strategy']['electric_attack_intensity'].get(str(node_id), 0)
            
            # 暂时使用模拟数据作为原始负荷值
            original_load = 100.0  # 模拟原始负荷值
            # 攻击后负荷值 = 原始负荷值 + 攻击注入量
            attacked_load = original_load + attack_injection
            
            attacked_nodes.append({
                "node_id": f"elec-{node_id}",
                "original_id": node_id,
                "type": "electric",
                "original_load": original_load,
                "attack_injection": attack_injection,
                "attacked_load": attacked_load,
                "load_shedding": abs(attack_injection)  # 使用攻击注入量的绝对值作为切负荷量
            })
        
        # 添加天然气攻击节点
        gas_nodes = attack_result_json['best_strategy']['gas_attack_nodes']
        for node_id in gas_nodes:
            attack_injection = attack_result_json['best_strategy']['gas_attack_intensity'].get(str(node_id), 0)
            
            # 暂时使用模拟数据作为原始负荷值
            original_load = 50.0  # 模拟原始负荷值
            # 攻击后负荷值 = 原始负荷值 + 攻击注入量
            attacked_load = original_load + attack_injection
            
            attacked_nodes.append({
                "node_id": f"gas-{node_id}",
                "original_id": node_id,
                "type": "gas",
                "original_load": original_load,
                "attack_injection": attack_injection,
                "attacked_load": attacked_load,
                "load_shedding": abs(attack_injection)  # 使用攻击注入量的绝对值作为切负荷量
            })
        
        # 生成迭代详情
        upper_objective = attack_result_json.get('upper_objective', [])
        lower_cost = attack_result_json.get('lower_cost', [])
        iteration_details = []
        for i in range(max(len(upper_objective), len(lower_cost))):
            iteration_details.append({
                "iteration": i + 1,
                "alpha": upper_objective[i] if i < len(upper_objective) else 0,
                "cost": lower_cost[i] if i < len(lower_cost) else 0
            })
        
        # 构建返回结果
        attack_result = {
            "baseline_cost": attack_result_json.get('baseline_cost', 0),
            "upper_objective": upper_objective,
            "lower_cost": lower_cost,
            "iterationDetails": iteration_details,
            "convergenceInfo": {
                "converged": len(upper_objective) > 0,
                "computationTime": 0,
                "iterations": len(upper_objective)
            },
            "attacked_nodes": attacked_nodes,
            "best_strategy": {
                "electric_attack_nodes": electric_nodes,
                "gas_attack_nodes": gas_nodes
            }
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON解析失败: {e}")
        logger.error(f"JSON数据: {json_output}")
        raise RuntimeError(f"JSON解析失败: {e}")
    except KeyError as e:
        logger.error(f"JSON数据缺少必要字段: {e}")
        raise RuntimeError(f"JSON数据缺少必要字段: {e}")
    
    logger.info(f"解析完成，返回结果: {attack_result}")
    return attack_result

@app.route('/api/attack-simulation/script-info')
def get_script_info():
    """获取攻击模拟脚本信息"""
    try:
        import os
        import stat
        import time
        
        # 外部脚本路径
        script_path = "c:\\Users\\Lenovo\\Desktop\\Energy defense and attack platformEnergy defense and attack platform\\bilevel_attack_sensitivity.py"
        
        script_info = {
            "script_path": script_path,
            "exists": os.path.exists(script_path),
            "message": ""
        }
        
        if script_info["exists"]:
            # 获取文件属性
            file_stats = os.stat(script_path)
            
            script_info.update({
                "size_bytes": file_stats.st_size,
                "size_kb": round(file_stats.st_size / 1024, 2),
                "last_modified": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(file_stats.st_mtime)),
                "last_accessed": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(file_stats.st_atime)),
                "creation_time": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(file_stats.st_ctime)),
                "is_readable": bool(os.access(script_path, os.R_OK)),
                "is_writable": bool(os.access(script_path, os.W_OK)),
                "is_executable": bool(os.access(script_path, os.X_OK)),
                "message": "脚本存在且可访问"
            })
        else:
            script_info["message"] = "脚本不存在或无法访问"
        
        return jsonify(script_info)
        
    except Exception as e:
        logger.error(f"获取脚本信息失败: {str(e)}")
        return jsonify({
            "script_path": r"c:\Users\Lenovo\Desktop\Energy defense and attack platformEnergy defense and attack platform\bilevel_attack_11111.py",
            "exists": False,
            "message": f"获取脚本信息失败: {str(e)}"
        })

def generate_simulated_results(params):
    """生成模拟攻击结果数据"""
    try:
        # 模拟迭代数据
        iterations = 5
        upper_objective = [0.1, 0.25, 0.45, 0.65, 0.85]
        lower_cost = [25000, 22000, 18000, 16000, 15000]
        baseline_cost = 12000
        
        # 生成迭代详情
        iteration_details = []
        for i in range(iterations):
            iteration_details.append({
                "iteration": i + 1,
                "alpha": upper_objective[i],  # 上层目标值
                "cost": lower_cost[i],        # 下层成本值
                "efficiency": 0.5 + i * 0.07,
                "attackStrategy": f"策略{i+1}"
            })
        
        # 模拟攻击模拟结果
        simulation_result = {
            "optimalAttack": {
                "attackStrategy": "最优攻击策略",
                "targetComponents": ["关键节点1", "关键节点2", "关键线路1"],
                "attackBudget": {
                    "electric": params.get('baPS', 6),
                    "gas": params.get('baGS', 3)
                },
                "attackEffectiveness": 0.85
            },
            "systemImpact": {
                "electricSystem": {
                    "loadShedding": 120.5,
                    "costIncrease": 15000,
                    "reliabilityDecrease": 0.25
                },
                "gasSystem": {
                    "supplyDisruption": 800,
                    "costIncrease": 8000,
                    "reliabilityDecrease": 0.18
                },
                "overallImpact": {
                    "totalCost": 23000,
                    "systemReliability": 0.72,
                    "recoveryTime": 4.5
                }
            },
            "upper_objective": upper_objective,  # 上层目标值数组
            "lower_cost": lower_cost,            # 下层成本值数组
            "baseline_cost": baseline_cost,      # 基准成本
            "iterationDetails": iteration_details,
            "convergenceInfo": {
                "converged": True,
                "iterations": iterations,
                "finalTolerance": 0.001,
                "computationTime": 12.5
            }
        }
        
        # 执行脆弱性评估
        assessment = VulnerabilityAssessment()
        vulnerability_results = assessment.assess_vulnerability()
        
        # 将脆弱性评估结果整合到攻击模拟结果中
        simulation_result["vulnerabilityAssessment"] = vulnerability_results
        
        return simulation_result
        
    except Exception as e:
        logger.error(f"生成模拟结果失败: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "error": str(e)
        }

@app.route('/api/parameter-sensitivity', methods=['POST'])
def run_parameter_sensitivity():
    """运行参数敏感性分析"""
    # 全局变量声明必须放在函数最顶部
    global parameter_sensitivity_store
    
    try:
        # 获取前端传递的参数
        params = request.get_json()
        
        if not params:
            return jsonify({"error": "缺少参数"}), 400
        
        # 提取参数敏感性分析所需的参数
        parameter = params.get('parameter', 'attack_amplitude')
        min_value = params.get('minValue', 0.1)
        max_value = params.get('maxValue', 1.0)
        step_value = params.get('stepValue', 0.1)
        
        logger.info(f"接收到参数敏感性分析请求: 参数={parameter}, 范围={min_value}-{max_value}, 步长={step_value}")
        
        # 生成参数值数组
        param_values = []
        current_value = min_value
        while current_value <= max_value:
            param_values.append(round(current_value, 2))
            current_value += step_value
        
        # 初始化参数敏感性分析存储
        parameter_sensitivity_store = {
            'is_running': True,
            'results': [],
            'current_param': None,
            'total_params': len(param_values),
            'timestamp': time.time()
        }
        
        # 定义线程函数，用于执行参数敏感性分析
        def run_sensitivity_analysis_thread():
            try:
                import subprocess
                import os
                import re
                
                script_path = "c:\\Users\\Lenovo\\Desktop\\Energy defense and attack platformEnergy defense and attack platform\\bilevel_attack_sensitivity.py"
                
                # 对于每个参数值，调用脚本
                for value in param_values:
                    logger.info(f"运行参数敏感性分析: {parameter} = {value}")
                    parameter_sensitivity_store.update({
                        'current_param': value,
                        'timestamp': time.time()
                    })
                    
                    # 初始化默认结果
                    final_cost = 0
                    attack_obj = 0
                    success = False
                    
                    # 修改脚本中的参数值 - 目前只支持修改tauD参数
                    if parameter == 'attack_amplitude':
                        # 调用脚本，通过环境变量传递参数
                        env = os.environ.copy()
                        env['TAU_D'] = str(value)
                        
                        # 调用外部脚本，添加超时设置
                        # 优先使用Anaconda Python，确保numpy等科学计算库可用
                        anaconda_python = "D:\\anaconda\\python.exe"
                        if os.path.exists(anaconda_python):
                            python_executable = anaconda_python
                        else:
                            python_executable = "python"  # 回退到系统Python
                        
                        try:
                            result = subprocess.run(
                                [python_executable, script_path],
                                capture_output=True,
                                text=True,
                                cwd=os.path.dirname(script_path),
                                env=env,
                                timeout=60  # 60秒超时
                            )
                            
                            # 解析脚本输出，提取最终成本
                            if result.returncode == 0:
                                # 查找JSON数据的起始位置，跳过"JSON输出结果:"前缀
                                # 先查找前缀，再从前缀后面找JSON开始
                                prefix_start = result.stdout.find("JSON输出结果:")
                                if prefix_start != -1:
                                    json_start = result.stdout.find("{", prefix_start)
                                else:
                                    json_start = result.stdout.find("{")
                                
                                if json_start != -1:
                                    json_output = result.stdout[json_start:]
                                    try:
                                        # 解析JSON数据
                                        analysis_result = json.loads(json_output)
                                        final_cost = analysis_result.get('best_attack_cost', 0)
                                        attack_obj = analysis_result.get('last_iteration_attack_objective', 0)
                                        logger.info(f"提取到最佳攻击结果成本: {final_cost}, 攻击目标值: {attack_obj}")
                                        success = True
                                    except json.JSONDecodeError as e:
                                        logger.error(f"参数值 {value} 分析结果JSON解析失败: {e}")
                                        logger.error(f"JSON内容: {json_output[:200]}...")
                                else:
                                    logger.warning(f"参数值 {value} 分析结果未找到JSON数据")
                                    logger.warning(f"脚本输出: {result.stdout}")
                            else:
                                logger.error(f"脚本执行失败，返回码: {result.returncode}")
                                logger.error(f"脚本输出: {result.stdout}")
                                logger.error(f"脚本错误: {result.stderr}")
                        except Exception as e:
                            logger.error(f"调用外部脚本时发生异常: {str(e)}")
                    
                    # 无论成功失败，都添加结果到存储，确保数据完整性
                    parameter_sensitivity_store['results'].append({
                        "parameter": value,
                        "cost": final_cost,
                        "attack_objective": attack_obj
                    })
                    
                    # 更新时间戳
                    parameter_sensitivity_store['timestamp'] = time.time()
                
            except Exception as e:
                logger.error(f"参数敏感性分析线程执行失败: {str(e)}")
                logger.error(traceback.format_exc())
            finally:
                # 分析完成，更新状态
                parameter_sensitivity_store.update({
                    'is_running': False,
                    'current_param': None,
                    'timestamp': time.time()
                })
        
        # 启动线程执行分析
        import threading
        thread = threading.Thread(target=run_sensitivity_analysis_thread)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "success": True,
            "message": "参数敏感性分析已启动",
            "data": {
                "total_params": len(param_values),
                "is_running": True
            }
        })
        
    except Exception as e:
        logger.error(f"参数敏感性分析执行失败: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "message": f"参数敏感性分析执行失败: {str(e)}",
            "data": None
        }), 500

def run_parameter_sensitivity_analysis(parameter, min_value, max_value, step_value):
    """执行参数敏感性分析，调用bilevel_attack_sensitivity.py脚本"""
    try:
        import subprocess
        import os
        import re
        
        script_path = "c:\\Users\\Lenovo\\Desktop\\Energy defense and attack platform\\bilevel_attack_sensitivity.py"
        
        # 检查脚本是否存在
        if not os.path.exists(script_path):
            logger.error(f"外部脚本不存在: {script_path}")
            # 脚本不存在，抛出异常
            raise FileNotFoundError(f"外部脚本不存在: {script_path}")
        
        # 生成参数值数组
        param_values = []
        current_value = min_value
        while current_value <= max_value:
            param_values.append(round(current_value, 2))
            current_value += step_value
        
        # 用于存储结果
        sensitivity_results = []
        
        # 对于每个参数值，调用脚本
        for value in param_values:
            logger.info(f"运行参数敏感性分析: {parameter} = {value}")
            
            # 修改脚本中的参数值 - 目前只支持修改tauD参数
            if parameter == 'attack_amplitude':
                # 调用脚本，通过环境变量传递参数
                env = os.environ.copy()
                env['TAU_D'] = str(value)
                
                # 调用外部脚本
                # 优先使用Anaconda Python，确保numpy等科学计算库可用
                anaconda_python = "D:\\anaconda\\python.exe"
                if os.path.exists(anaconda_python):
                    python_executable = anaconda_python
                else:
                    python_executable = "python"  # 回退到系统Python
                
                result = subprocess.run(
                    [python_executable, script_path],
                    capture_output=True,
                    text=True,
                    cwd=os.path.dirname(script_path),
                    env=env
                )
                
                # 解析脚本输出，提取最终成本
                final_cost = 0
                if result.returncode == 0:
                    # 查找JSON数据的起始位置
                    json_start = result.stdout.find("{")
                    if json_start != -1:
                        json_output = result.stdout[json_start:]
                        try:
                            # 解析JSON数据
                            analysis_result = json.loads(json_output)
                            final_cost = analysis_result.get('best_attack_cost', 0)
                            attack_obj = analysis_result.get('last_iteration_attack_objective', 0)
                            logger.info(f"提取到最佳攻击结果成本: {final_cost}, 攻击目标值: {attack_obj}")
                        except json.JSONDecodeError as e:
                            logger.error(f"参数值 {value} 分析结果JSON解析失败: {e}")
                            # 脚本执行失败，抛出异常
                            raise RuntimeError(f"JSON解析失败: {e}")
                    else:
                        logger.error(f"未找到JSON数据")
                        # 脚本执行失败，抛出异常
                        raise RuntimeError(f"未找到JSON数据")
                else:
                    logger.error(f"脚本执行失败，返回码: {result.returncode}")
                    logger.error(f"脚本输出: {result.stdout}")
                    logger.error(f"脚本错误: {result.stderr}")
                    # 脚本执行失败，抛出异常
                    raise RuntimeError(f"脚本执行失败，返回码: {result.returncode}, 错误信息: {result.stderr}")
                
                # 保存结果
                sensitivity_results.append({
                    "parameter": value,
                    "cost": final_cost,
                    "attack_objective": attack_obj
                })
        
        return sensitivity_results
        
    except Exception as e:
        logger.error(f"参数敏感性分析执行失败: {str(e)}")
        logger.error(traceback.format_exc())
        # 发生异常，直接抛出，不使用模拟数据
        raise



# 用于存储实时迭代数据的全局变量
iteration_data_store = {
    'current_iteration': 0,
    'upper_objective': [],
    'lower_cost': [],
    'timestamp': 0
}

# 用于存储参数敏感性分析的实时结果
parameter_sensitivity_store = {
    'is_running': False,
    'results': [],
    'current_param': None,
    'total_params': 0,
    'timestamp': 0
}

@app.route('/api/parameter-sensitivity/results', methods=['GET'])
def get_parameter_sensitivity_results():
    """获取参数敏感性分析的实时结果"""
    try:
        return jsonify({
            "success": True,
            "data": parameter_sensitivity_store
        })
    except Exception as e:
        logger.error(f"获取参数敏感性分析结果失败: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "message": f"获取参数敏感性分析结果失败: {str(e)}",
            "data": None
        }), 500

@app.route('/api/attack-simulation/iterations', methods=['GET'])
def get_attack_iterations():
    """获取攻击模拟的实时迭代数据"""
    try:
        return jsonify({
            "success": True,
            "data": iteration_data_store
        })
    except Exception as e:
        logger.error(f"获取迭代数据失败: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"获取迭代数据失败: {str(e)}",
            "data": None
        }), 500

@app.route('/api/attack-simulation/reset-iterations', methods=['POST'])
def reset_attack_iterations():
    """重置迭代数据存储"""
    try:
        global iteration_data_store
        iteration_data_store = {
            'current_iteration': 0,
            'upper_objective': [],
            'lower_cost': [],
            'timestamp': 0
        }
        return jsonify({
            "success": True,
            "message": "迭代数据已重置"
        })
    except Exception as e:
        logger.error(f"重置迭代数据失败: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"重置迭代数据失败: {str(e)}"
        }), 500

@app.route('/api/pmu-placement', methods=['POST'])
def pmu_placement():
    """PMU优化配置接口预留"""
    try:
        # 获取请求参数
        data = request.get_json()
        
        # 接口预留，仅返回成功响应
        return jsonify({
            "success": True,
            "message": "PMU优化配置接口预留成功",
            "data": {
                "optimal_placement": [],
                "observability": 0,
                "cost": 0
            }
        })
    except Exception as e:
        logger.error(f"PMU优化配置接口出错: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"PMU优化配置接口出错: {str(e)}",
            "data": None
        }), 500

@app.route('/api/defense-allocation', methods=['POST'])
def defense_allocation():
    """防御资源优化配置接口预留"""
    try:
        # 获取请求参数
        data = request.get_json()
        
        # 接口预留，仅返回成功响应
        return jsonify({
            "success": True,
            "message": "防御资源优化配置接口预留成功",
            "data": {
                "allocation_result": [],
                "defense_effectiveness": 0,
                "total_cost": 0
            }
        })
    except Exception as e:
        logger.error(f"防御资源优化配置接口出错: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"防御资源优化配置接口出错: {str(e)}",
            "data": None
        }), 500

@app.route('/api/game-analysis', methods=['POST'])
def game_analysis():
    """攻防博弈分析接口预留"""
    try:
        # 获取请求参数
        data = request.get_json()
        
        # 接口预留，仅返回成功响应
        return jsonify({
            "success": True,
            "message": "攻防博弈分析接口预留成功",
            "data": {
                "nash_equilibrium": [],
                "attack_strategy": {},
                "defense_strategy": {},
                "system_security": 0
            }
        })
    except Exception as e:
        logger.error(f"攻防博弈分析接口出错: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"攻防博弈分析接口出错: {str(e)}",
            "data": None
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)