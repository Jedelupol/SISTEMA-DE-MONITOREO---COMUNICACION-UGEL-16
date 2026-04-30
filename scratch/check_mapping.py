import pandas as pd
import json

excel_file = r"e:/ANTIGRAVITY PROJECTS/PRUEBA SKILLS/INFORMACION BASE/SISTEMA_EVALUACION_DIAGNOSTICA_LIMA_PROVINCIAS.xlsx"
df = pd.read_excel(excel_file, sheet_name='PARAMETROS')

# Check if there's a relationship between UGEL and IE in the same row
print(df[['Lista_UGEL', 'Lista_IE']].dropna().head(10))

# Actually, typically in these sheets, columns are independent lists. 
# But let's check if there's another sheet like 'BD_BRUTA' that has the mapping.
xl = pd.ExcelFile(excel_file)
if 'BD_BRUTA' in xl.sheet_names:
    df_bruta = pd.read_excel(excel_file, sheet_name='BD_BRUTA')
    print("Columns in BD_BRUTA:", df_bruta.columns.tolist())
    if 'UGEL' in df_bruta.columns and 'INSTITUCION' in df_bruta.columns:
        mapping = df_bruta[['UGEL', 'INSTITUCION']].drop_duplicates()
        print("Mapping UGEL -> INSTITUCION sample:")
        print(mapping.head(10))
