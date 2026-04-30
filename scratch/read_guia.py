import openpyxl

wb = openpyxl.load_workbook(r'e:/ANTIGRAVITY PROJECTS/PRUEBA SKILLS/INFORMACION BASE/SISTEMA_EVALUACION_DIAGNOSTICA_LIMA_PROVINCIAS.xlsx', read_only=True)
sheet = wb['GUIA']
for row in sheet.iter_rows(max_row=30, values_only=True):
    print(row)
