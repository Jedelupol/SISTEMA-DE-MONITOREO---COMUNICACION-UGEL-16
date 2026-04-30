import pandas as pd
import json

excel_file = r"e:/ANTIGRAVITY PROJECTS/PRUEBA SKILLS/INFORMACION BASE/SISTEMA_EVALUACION_DIAGNOSTICA_LIMA_PROVINCIAS.xlsx"
df = pd.read_excel(excel_file, sheet_name='PARAMETROS')

ugels = df['Lista_UGEL'].dropna().unique().tolist()
institutions = df['Lista_IE'].dropna().unique().tolist()
# sections from the excel might be useful too
sections = df['Lista_Secciones'].dropna().unique().tolist()

# Ensure A-Q are present as requested
requested_sections = [chr(i) for i in range(ord('A'), ord('Q') + 1)]
for s in requested_sections:
    if s not in sections:
        sections.append(s)
if 'UNICA' not in sections:
    sections.append('UNICA')

data = {
    "UGELS": ugels,
    "INSTITUTIONS": sorted(institutions),
    "SECTIONS": sorted(list(set(sections)))
}

print(json.dumps(data, indent=2))
