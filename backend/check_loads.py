import json
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 读取节点数据
with open('data/processed/nodes.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 分离电力母线、天然气节点和天然气气源
electric_buses = [n for n in data if n.get('type') == 'electric_bus']
gas_nodes = [n for n in data if n.get('type') == 'gas_node']
gas_sources = [n for n in data if n.get('type') == 'gas_source']

# 检查电力系统负载
logger.info('Electric buses with load:')
count = 0
for n in electric_buses:
    pd = n.get('pd', 0)
    qd = n.get('qd', 0)
    if pd > 0 or qd > 0:
        logger.info(f'  Bus {n["id"]}: PD={pd}, QD={qd}')
        count += 1
logger.info(f'Total electric buses with load: {count}')

# 检查天然气系统负载
logger.info('\nGas nodes with load:')
count = 0
for n in gas_nodes:
    load = n.get('load', 0)
    if load > 0:
        logger.info(f'  Node {n["id"]}: Load={load}')
        count += 1
logger.info(f'Total gas nodes with load: {count}')

# 单独统计天然气气源
logger.info('\nGas sources:')
count = 0
for n in gas_sources:
    min_w = n.get('min_w', 0)
    max_w = n.get('max_w', 0)
    logger.info(f'  Source {n["id"]}: Min_W={min_w}, Max_W={max_w}')
    count += 1
logger.info(f'Total gas sources: {count}')