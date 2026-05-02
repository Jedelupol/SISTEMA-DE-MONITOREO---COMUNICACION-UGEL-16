
import re

with open("e:/ANTIGRAVITY PROJECTS/PRUEBA SKILLS/edu-metrics-pro/components/Dashboard.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    line_num = i + 1
    # Simple tag finding
    tags = re.findall(r'<(/?\w+)', line)
    for tag in tags:
        if tag.startswith('/'):
            tag_name = tag[1:]
            if stack:
                last_tag, last_line = stack.pop()
                if last_tag != tag_name:
                    print(f"Mismatch at line {line_num}: found </{tag_name}>, expected </{last_tag}> (from line {last_line})")
            else:
                print(f"Extra closing tag at line {line_num}: </{tag_name}>")
        else:
            # Skip self-closing tags (very naive check)
            if not line.strip().endswith('/>') and not tag in ['img', 'br', 'hr', 'input']:
                stack.append((tag, line_num))

print(f"Stack at end: {stack}")
