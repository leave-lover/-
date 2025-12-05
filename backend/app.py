from flask import Flask, jsonify
from flask_cors import CORS
import os
import json

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 基础路由
@app.route('/')
def index():
    return jsonify(message='Energy Defense Platform Backend API')

# 示例数据路由
@app.route('/api/data')
def get_data():
    return jsonify(data=[{'name': 'Sample', 'value': 123}])

# 获取图数据路由
@app.route('/api/graph')
def get_graph_data():
    """获取图结构数据用于前端可视化"""
    try:
        # 尝试从处理后的数据中读取
        processed_file = os.path.join('data', 'processed', 'graph.json')
        if os.path.exists(processed_file):
            with open(processed_file, 'r', encoding='utf-8') as f:
                graph_data = json.load(f)
            return jsonify(graph_data)
        else:
            # 如果没有处理后的数据，返回空结构
            return jsonify({
                'nodes': [],
                'links': []
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 获取节点数据路由
@app.route('/api/nodes')
def get_nodes():
    """获取所有节点数据"""
    try:
        processed_file = os.path.join('data', 'processed', 'nodes.json')
        if os.path.exists(processed_file):
            with open(processed_file, 'r', encoding='utf-8') as f:
                nodes_data = json.load(f)
            return jsonify(nodes_data)
        else:
            return jsonify([])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 获取连接数据路由
@app.route('/api/links')
def get_links():
    """获取所有连接数据"""
    try:
        processed_file = os.path.join('data', 'processed', 'links.json')
        if os.path.exists(processed_file):
            with open(processed_file, 'r', encoding='utf-8') as f:
                links_data = json.load(f)
            return jsonify(links_data)
        else:
            return jsonify([])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
