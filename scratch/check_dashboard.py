import re
import sys

def check_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    braces = 0
    tags = []
    
    for i, line in enumerate(lines):
        ln = i + 1
        # Simple brace counting (ignoring strings/comments for now, but good for overview)
        for char in line:
            if char == '{': braces += 1
            if char == '}': braces -= 1
        
        # Simple tag detection
        found_tags = re.findall(r'<(/?)([a-zA-Z0-9]+)', line)
        for is_close, tag_name in found_tags:
            if is_close:
                if not tags:
                    print(f"L{ln}: Extra closing tag </{tag_name}>")
                else:
                    last_tag = tags.pop()
                    if last_tag != tag_name:
                        print(f"L{ln}: Mismatched tag </{tag_name}> expected </{last_tag}>")
            else:
                # Ignore self-closing tags (very simple check)
                if not re.search(rf'<{tag_name}[^>]*/>', line):
                    tags.append(tag_name)
                    
        if braces < 0:
            print(f"L{ln}: Negative braces count!")
            braces = 0

    print(f"Final state: Braces={braces}, Tags={tags}")

if __name__ == "__main__":
    check_file(sys.argv[1])
