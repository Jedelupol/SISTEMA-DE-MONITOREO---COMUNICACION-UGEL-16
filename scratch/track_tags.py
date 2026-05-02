
import re

def track_tags_range(filename, start, end):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()[start-1:end]

    stack = []
    for i, line in enumerate(lines):
        line_num = i + start
        all_starts = re.finditer(r'<div(?:\s|>|$)', line)
        for match in all_starts:
            rest_of_line = line[match.end():]
            closing_bracket = rest_of_line.find('>')
            if closing_bracket != -1:
                tag_content = rest_of_line[:closing_bracket]
                if tag_content.strip().endswith('/'):
                    continue
            stack.append(line_num)
            print(f"L{line_num}: OPEN (Stack size: {len(stack)})")
        ends = re.findall(r'</div>', line)
        for _ in ends:
            if stack:
                popped = stack.pop()
                print(f"L{line_num}: CLOSE (Matching L{popped}, Stack size: {len(stack)})")
            else:
                print(f"L{line_num}: ERROR (Unexpected CLOSE)")
    if stack:
        print(f"Final Stack: {stack}")
    else:
        print("Balanced at end.")

track_tags_range(r'e:\ANTIGRAVITY PROJECTS\PRUEBA SKILLS\edu-metrics-pro\components\Dashboard.tsx', 157, 620)
