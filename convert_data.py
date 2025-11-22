import pandas as pd
import os

# Define paths
base_dir = 'backend/data'
excel_file = os.path.join(base_dir, 'Einspeisekapazität_Hackathon-Challenge (1).xlsx')
stations_csv = os.path.join(base_dir, 'Kapa Stationen.csv')
substations_csv = os.path.join(base_dir, 'Kapa Umspannwerke.csv')

try:
    # Read Excel
    xls = pd.ExcelFile(excel_file)
    
    # Convert 'Kapa Stationen'
    if 'Kapa Stationen' in xls.sheet_names:
        df_stations = pd.read_excel(xls, 'Kapa Stationen')
        df_stations.to_csv(stations_csv, index=False)
        print(f"Created {stations_csv}")
    else:
        print("Sheet 'Kapa Stationen' not found!")

    # Convert 'Kapa Umspannwerke'
    if 'Kapa Umspannwerke' in xls.sheet_names:
        df_substations = pd.read_excel(xls, 'Kapa Umspannwerke')
        df_substations.to_csv(substations_csv, index=False)
        print(f"Created {substations_csv}")
    else:
        print("Sheet 'Kapa Umspannwerke' not found!")

except Exception as e:
    print(f"Error converting files: {e}")
