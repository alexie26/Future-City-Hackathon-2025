import pandas as pd
import os

file_path = 'backend/data/Einspeisekapazität_Hackathon-Challenge (1).xlsx'

try:
    # Load the Excel file
    xls = pd.ExcelFile(file_path)
    
    print("Sheet names:", xls.sheet_names)
    
    for sheet_name in xls.sheet_names:
        print(f"\n--- Sheet: {sheet_name} ---")
        df = pd.read_excel(xls, sheet_name=sheet_name, nrows=5)
        print(df.columns.tolist())
        print(df.head())

except Exception as e:
    print(f"Error: {e}")
