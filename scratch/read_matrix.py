import openpyxl

wb = openpyxl.load_workbook(r'e:/ANTIGRAVITY PROJECTS/PRUEBA SKILLS/INFORMACION BASE/SISTEMA_EVALUACION_DIAGNOSTICA_LIMA_PROVINCIAS.xlsx', read_only=True)
sheet = wb['MATRIZ_CLAVES']
for row in sheet.iter_rows(max_row=10, values_only=True):
    print(row)
