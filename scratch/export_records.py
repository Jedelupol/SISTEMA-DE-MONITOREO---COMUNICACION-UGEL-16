import pandas as pd
import json

file_path = r"e:\ANTIGRAVITY PROJECTS\PRUEBA SKILLS\INFORMACION BASE\SISTEMA_EVALUACION_DIAGNOSTICA_LIMA_PROVINCIAS.xlsx"

def clean_data(val):
    if pd.isna(val): return None
    return val

try:
    # Read Reading data
    df_eval = pd.read_excel(file_path, sheet_name='BD_EVALUADA')
    # Read Writing data
    df_esc = pd.read_excel(file_path, sheet_name='BD_ESCRITURA')
    
    # Merge on ID_Registro
    df_merged = pd.merge(df_eval, df_esc[['ID_Registro', 'C1_Adecua', 'C2_Organiza', 'C3_Utiliza']], on='ID_Registro', how='left')
    
    records = []
    for _, row in df_merged.iterrows():
        record = {
            'studentName': f"Estudiante {row['ID_Registro']}", # Name is not in Excel, using ID as placeholder or DNI if available
            'dni': str(row['DNI_Estudiante']) if pd.notna(row['DNI_Estudiante']) else '',
            'grado': str(int(row['Grado'])) if pd.notna(row['Grado']) else '1',
            'section': str(row['Seccion']) if pd.notna(row['Seccion']) else 'A',
            'ugel': str(row['UGEL']) if pd.notna(row['UGEL']) else '',
            'institution': str(row['IE']) if pd.notna(row['IE']) else '',
            'timestamp': str(row['Fecha_Hora']) if pd.notna(row['Fecha_Hora']) else ''
        }
        
        # Add reading responses (Eval_P1 to Eval_P20)
        # Wait, are they responses or evaluations?
        # The column names are Eval_P1...
        # In the app, it expects 'A', 'B', 'C', 'D' for reading?
        # Wait, evaluator.ts handles both.
        
        for i in range(1, 21):
            col = f'Eval_P1{i}' if i > 9 else f'Eval_P{i}'
            # Wait, the column names I saw were 'Eval_P1', 'Eval_P2'...
            col = f'Eval_P{i}'
            if col in row:
                record[f'R{i}'] = row[col] # R for Reading
        
        # Add writing responses
        record['W1'] = row['C1_Adecua']
        record['W2'] = row['C2_Organiza']
        record['W3'] = row['C3_Utiliza']
        
        records.append(record)
        
    print(json.dumps(records[:10], indent=2))
    print(f"Total records: {len(records)}")
    
    with open('initial_records.json', 'w') as f:
        json.dump(records, f)
        
except Exception as e:
    print(f"Error: {e}")
