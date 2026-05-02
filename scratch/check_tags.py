
import re
import sys

def check_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple tag extractor (ignores comments and strings for now, but good enough for a quick check)
    tags = re.findall(r'<(/?[a-zA-Z0-9]+)', content)
    
    stack = []
    self_closing = ['input', 'img', 'br', 'hr', 'col', 'base', 'link', 'meta', 'area', 'embed', 'param', 'source', 'track', 'wbr']
    
    # Component names can be self-closing with /> - this regex won't catch it easily.
    # Let's try a better approach: find all tags and see if they have /> at the end.
    
    tag_matches = re.finditer(r'<(/?[a-zA-Z0-9]+)([^>]*)>', content)
    for match in tag_matches:
        name = match.group(1)
        attrs = match.group(2)
        
        if name.startswith('/'):
            name = name[1:]
            if not stack:
                print(f"Unexpected closing tag: </{name}>")
            else:
                last = stack.pop()
                if last != name:
                    print(f"Tag mismatch: <{last}> closed by </{name}>")
        elif attrs.endswith('/') or name.lower() in self_closing:
            # Self-closing
            pass
        else:
            stack.append(name)
            
    if stack:
        print(f"Unclosed tags: {stack}")
    else:
        print("All tags balanced (within limits of this script)")

if __name__ == "__main__":
    check_tags(sys.argv[1])
