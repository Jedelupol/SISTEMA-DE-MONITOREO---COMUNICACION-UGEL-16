
import re

with open("e:/ANTIGRAVITY PROJECTS/PRUEBA SKILLS/edu-metrics-pro/components/Dashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Count <div and </div
# This is a bit naive but can help
open_divs = len(re.findall(r'<div', content))
close_divs = len(re.findall(r'</div', content))

print(f"Open divs: {open_divs}")
print(f"Close divs: {close_divs}")

# Count return statements and their root divs
# In Dashboard component
# return (
#   <div ...
# ...
#   </div>
# );

# Let's count in the Dashboard component specifically (lines 57-619)
lines = content.splitlines()
dashboard_lines = lines[56:619]
dash_content = "\n".join(dashboard_lines)

dash_open = len(re.findall(r'<div', dash_content))
dash_close = len(re.findall(r'</div', dash_content))

print(f"Dashboard Open divs: {dash_open}")
print(f"Dashboard Close divs: {dash_close}")
