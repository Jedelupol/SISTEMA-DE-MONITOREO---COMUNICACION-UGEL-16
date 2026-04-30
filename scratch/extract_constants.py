import pandas as pd

file_path = r"e:\ANTIGRAVITY PROJECTS\PRUEBA SKILLS\INFORMACION BASE\SISTEMA_EVALUACION_DIAGNOSTICA_LIMA_PROVINCIAS.xlsx"

try:
    df = pd.read_excel(file_path, sheet_name='PARAMETROS')
    if 'Lista_UGEL' in df.columns:
        print("UGELS:", df['Lista_UGEL'].dropna().unique().tolist())
    if 'Lista_IE' in df.columns:
        print("INSTITUTIONS:", df['Lista_IE'].dropna().unique().tolist())
    if 'Lista_Secciones' in df.columns:
        print("SECTIONS:", df['Lista_Secciones'].dropna().unique().tolist())
except Exception as e:
    print(f"Error: {e}")
