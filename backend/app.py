from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import json
import os
from werkzeug.utils import secure_filename
import sys
import traceback
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# 添加当前目录到Python路径，以便导入data_processor
sys.path.append(os.path.dirname(__file__))
from data_processor import parse_matpower_data, build_electric_network_graph, build_gas_network_graph, combine_networks, save_processed_data

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 设置静态文件目录
STATIC_FOLDER = os.path.join(os.path.dirname(__file__), 'data', 'processed')

# 文件上传配置
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'data', 'uploads')
ALLOWED_EXTENSIONS = {'txt'}
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
            
            for link in graph_data.get('links', []):
                link_type = link.get('type', 'unknown')
                link_types[link_type] = link_types.get(link_type, 0) + 1
            
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
        return jsonify({"error": str(e)}), 500

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
            return jsonify({"error": "不支持的文件类型，仅支持.txt文件"}), 400
        
        # 保存上传的文件
        filename = secure_filename(file.filename)
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(upload_path)
        
        # 处理数据
        raw_data = parse_matpower_data(upload_path)
        electric_graph = build_electric_network_graph(raw_data)
        gas_graph = build_gas_network_graph(raw_data)
        combined_graph = combine_networks(electric_graph, gas_graph, raw_data)
        
        # 保存处理后的数据，覆盖现有数据
        save_processed_data(combined_graph, STATIC_FOLDER)
        
        return jsonify({
            "message": "数据导入成功",
            "nodes_count": len(combined_graph['nodes']),
            "links_count": len(combined_graph['links'])
        }), 200
        
    except Exception as e:
        # 记录详细的错误信息
        error_details = traceback.format_exc()
        logger.error(f"数据导入错误: {str(e)}")
        logger.error(error_details)
        return jsonify({"error": f"数据导入失败: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)