import pandas as pd
excel_file = r"e:/ANTIGRAVITY PROJECTS/PRUEBA SKILLS/INFORMACION BASE/SISTEMA_EVALUACION_DIAGNOSTICA_LIMA_PROVINCIAS.xlsx"
df = pd.read_excel(excel_file, sheet_name='MATRIZ_CLAVES')
print(df.head(20))
print(df.columns)
