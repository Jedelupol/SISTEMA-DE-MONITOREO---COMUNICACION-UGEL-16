
def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    line_num = 1
    col_num = 1
    
    in_string = False
    string_char = ''
    in_comment = False
    comment_type = '' # 'line' or 'block'
    
    for i, char in enumerate(content):
        if char == '\n':
            line_num += 1
            col_num = 1
            if in_comment and comment_type == 'line':
                in_comment = False
            continue
        
        if in_comment:
            if comment_type == 'block' and content[i:i+2] == '*/':
                in_comment = False
            col_num += 1
            continue
            
        if in_string:
            if char == string_char and content[i-1] != '\\':
                in_string = False
            col_num += 1
            continue
            
        if content[i:i+2] == '//':
            in_comment = True
            comment_type = 'line'
            col_num += 1
            continue
        if content[i:i+2] == '/*':
            in_comment = True
            comment_type = 'block'
            col_num += 1
            continue
            
        if char in ['"', "'", '`']:
            in_string = True
            string_char = char
            col_num += 1
            continue
            
        if char in ['{', '(', '[']:
            stack.append((char, line_num, col_num))
        elif char in ['}', ')', ']']:
            if not stack:
                print(f"Extra closing {char} at line {line_num}, col {col_num}")
            else:
                opening, o_line, o_col = stack.pop()
                matches = {'}': '{', ')': '(', ']': '['}
                if matches[char] != opening:
                    print(f"Mismatched {char} at line {line_num}, col {col_num} (matches {opening} from line {o_line}, col {o_col})")
        
        col_num += 1
        
    for char, line, col in stack:
        print(f"Unclosed {char} from line {line}, col {col}")

check_braces(r'e:\ANTIGRAVITY PROJECTS\PRUEBA SKILLS\edu-metrics-pro\components\Dashboard.tsx')
