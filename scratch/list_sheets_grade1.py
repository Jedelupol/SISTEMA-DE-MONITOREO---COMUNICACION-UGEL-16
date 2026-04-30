import pandas as pd
excel_file = r"e:/ANTIGRAVITY PROJECTS/PRUEBA SKILLS/INFORMACION BASE/REPORTE REFUERZO ESCOLAR MINEDU 1°A.xlsm"
xl = pd.ExcelFile(excel_file)
print(xl.sheet_names)
