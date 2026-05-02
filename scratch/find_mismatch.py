
import re

def find_mismatched_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Simple regex to find tags
    # This won't be perfect but it might help
    tags = re.findall(r'<(/?[a-zA-Z0-9.]+)', content)
    
    stack = []
    for tag in tags:
        if tag.startswith('/'):
            name = tag[1:]
            if not stack:
                print(f"Error: Unexpected closing tag </{name}>")
                continue
            last = stack.pop()
            if last != name:
                print(f"Error: Mismatched tag. Expected </{last}>, found </{name}>")
                # Put it back to try to recover
                # stack.append(last)
        else:
            # Check if it's self-closing - this is hard with regex
            # Let's just skip common self-closing tags if they appear with /> later
            # But the regex above only gets the start
            stack.append(tag)

    print("Stack at end:", stack)

# Let's try a better approach: search for common wrappers
def check_balanced(filename, start_tag, end_tag):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    opens = content.count(start_tag)
    closes = content.count(end_tag)
    print(f"{start_tag}: {opens}, {end_tag}: {closes}")

filename = r'e:\ANTIGRAVITY PROJECTS\PRUEBA SKILLS\edu-metrics-pro\components\Dashboard.tsx'
check_balanced(filename, '<AnimatePresence', '</AnimatePresence>')
check_balanced(filename, '<motion.div', '</motion.div>')
check_balanced(filename, '<div', '</div>')
check_balanced(filename, '<ResponsiveContainer', '</ResponsiveContainer>')
check_balanced(filename, '<ReChartsBar', '</ReChartsBar>')
check_balanced(filename, '<Bar', '</Bar>')
check_balanced(filename, '{', '}')
check_balanced(filename, '(', ')')
