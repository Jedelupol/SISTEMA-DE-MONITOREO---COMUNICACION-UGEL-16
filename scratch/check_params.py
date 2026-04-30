import pandas as pd

file_path = r"e:\ANTIGRAVITY PROJECTS\PRUEBA SKILLS\INFORMACION BASE\SISTEMA_EVALUACION_DIAGNOSTICA_LIMA_PROVINCIAS.xlsx"

try:
    df = pd.read_excel(file_path, sheet_name='PARAMETROS')
    print("Columns in PARAMETROS:", df.columns.tolist())
    for col in df.columns:
        print(f"\n--- {col} ---")
        print(df[col].dropna().unique().tolist())
except Exception as e:
    print(f"Error: {e}")
