import openpyxl

wb = openpyxl.load_workbook(r'e:/ANTIGRAVITY PROJECTS/PRUEBA SKILLS/INFORMACION BASE/SISTEMA_EVALUACION_DIAGNOSTICA_LIMA_PROVINCIAS.xlsx', read_only=True)
print(wb.sheetnames)
