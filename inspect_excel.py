import pandas as pd
import os
import sys

file_path = 'backend/data/Einspeisekapazität_Hackathon-Challenge (1).xlsx'

def validate_file_path(path):
    """Validate that the file exists and is readable"""
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")
    
    if not os.access(path, os.R_OK):
        raise PermissionError(f"File is not readable: {path}")
    
    file_size = os.path.getsize(path)
    if file_size == 0:
        raise ValueError(f"File is empty: {path}")
    
    print(f"✓ File found: {path} ({file_size:,} bytes)")

def inspect_excel_safe(file_path):
    """Safely inspect Excel file with comprehensive error handling"""
    try:
        # Validate file
        validate_file_path(file_path)
        
        # Load the Excel file
        print("\nLoading Excel file...")
        xls = pd.ExcelFile(file_path)
        
        if not xls.sheet_names:
            raise ValueError("Excel file contains no sheets")
        
        print(f"✓ Found {len(xls.sheet_names)} sheet(s)")
        print(f"Sheet names: {xls.sheet_names}")
        
        # Inspect each sheet
        for sheet_name in xls.sheet_names:
            print(f"\n{'='*60}")
            print(f"Sheet: {sheet_name}")
            print(f"{'='*60}")
            
            try:
                # Read first few rows
                df = pd.read_excel(xls, sheet_name=sheet_name, nrows=10)
                
                print(f"\nRows in preview: {len(df)}")
                print(f"Columns ({len(df.columns)}): {df.columns.tolist()}")
                
                # Check for empty dataframe
                if df.empty:
                    print("⚠️ WARNING: Sheet is empty")
                    continue
                
                # Display data types
                print("\nData types:")
                print(df.dtypes)
                
                # Display sample data
                print("\nSample data:")
                print(df.head())
                
                # Check for missing values
                missing = df.isnull().sum()
                if missing.any():
                    print("\n⚠️ Missing values detected:")
                    print(missing[missing > 0])
                
                # Check for duplicate columns
                duplicate_cols = df.columns[df.columns.duplicated()].tolist()
                if duplicate_cols:
                    print(f"\n⚠️ WARNING: Duplicate column names found: {duplicate_cols}")
                
            except pd.errors.EmptyDataError:
                print(f"⚠️ WARNING: Sheet '{sheet_name}' is empty")
            except Exception as sheet_error:
                print(f"❌ ERROR reading sheet '{sheet_name}': {sheet_error}")
                continue
        
        print(f"\n{'='*60}")
        print("✓ Inspection complete")
        
    except FileNotFoundError as e:
        print(f"❌ FILE ERROR: {e}")
        print("Please check:")
        print("  1. The file path is correct")
        print("  2. The file exists in the specified location")
        sys.exit(1)
        
    except PermissionError as e:
        print(f"❌ PERMISSION ERROR: {e}")
        print("Please check:")
        print("  1. You have read permissions for the file")
        print("  2. The file is not locked by another application")
        sys.exit(1)
        
    except pd.errors.ParserError as e:
        print(f"❌ PARSING ERROR: {e}")
        print("The Excel file may be corrupted or in an unsupported format")
        sys.exit(1)
        
    except ValueError as e:
        print(f"❌ VALUE ERROR: {e}")
        sys.exit(1)
        
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    print("Starting Excel file inspection...")
    print(f"Target file: {file_path}\n")
    inspect_excel_safe(file_path)
