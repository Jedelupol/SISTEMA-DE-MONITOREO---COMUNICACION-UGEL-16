
import re

def check_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple tag finder for <div> and </div>
    tags = re.findall(r'<(div|/div|AnimatePresence|/AnimatePresence|motion\.div|/motion\.div|FullInstitutionalReport|/FullInstitutionalReport|KPICard|/KPICard|TabButton|/TabButton|ChartPanel|/ChartPanel|LevelChart|/LevelChart|CapacityChart|/CapacityChart|DataGroupsList|/DataGroupsList|EarlyWarningTable|/EarlyWarningTable|AIAdvisor|/AIAdvisor)', content)
    
    stack = []
    for tag in tags:
        if tag.startswith('/'):
            if not stack:
                print(f"Extra closing tag: </{tag[1:]}>")
            else:
                top = stack.pop()
                if top != tag[1:]:
                    print(f"Mismatched tag: </{tag[1:]}> (expected </{top}>)")
        else:
            stack.append(tag)
            
    for tag in stack:
        print(f"Unclosed tag: <{tag}>")

check_tags(r'e:\ANTIGRAVITY PROJECTS\PRUEBA SKILLS\edu-metrics-pro\components\Dashboard.tsx')
