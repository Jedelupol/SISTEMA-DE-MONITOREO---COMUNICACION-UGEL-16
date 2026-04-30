import pandas as pd
try:
    xl = pd.ExcelFile('e:/ANTIGRAVITY PROJECTS/PRUEBA SKILLS/INFORMACION BASE/SISTEMA_EVALUACION_DIAGNOSTICA_LIMA_PROVINCIAS.xlsx')
    print(f"Sheets: {xl.sheet_names}")
    # Try to find school and ugel info
    # Usually in a sheet like 'PARAMETROS' or 'DATOS'
    if 'PARAMETROS' in xl.sheet_names:
        df = xl.parse('PARAMETROS')
        ugels = df['Lista_UGEL'].dropna().unique().tolist()
        ies = df['Lista_IE'].dropna().unique().tolist()
        secciones = df['Lista_Secciones'].dropna().unique().tolist()
        print(f"UGELS: {ugels}")
        print(f"IES: {ies}")
        print(f"SECCIONES: {secciones}")
        
        if 'BD_BRUTA' in xl.sheet_names:
            df_bruta = xl.parse('BD_BRUTA')
            print(f"BD_BRUTA Columns: {df_bruta.columns.tolist()}")
            print(f"BD_BRUTA Head:\n{df_bruta.head(5).to_string()}")
except Exception as e:
    print(f"Error: {e}")
