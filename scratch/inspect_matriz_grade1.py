import pandas as pd
excel_file = r"e:/ANTIGRAVITY PROJECTS/PRUEBA SKILLS/INFORMACION BASE/REPORTE REFUERZO ESCOLAR MINEDU 1°A.xlsm"
df = pd.read_excel(excel_file, sheet_name='MATRIZ ')
print(df.head(10))
print(df.columns)
