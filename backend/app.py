from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 设置静态文件目录
STATIC_FOLDER = os.path.join(os.path.dirname(__file__), 'data', 'processed')

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)