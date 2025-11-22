from grid_data import GridDataManager

# Initialize the grid manager
gm = GridDataManager()

# Test with a location in Heilbronn
# Heilbronn center approximately: 49.142, 9.219
lat, lon = 49.142, 9.219
kw_requested = 10

print("Testing grid capacity calculation...")
print(f"Location: {lat}, {lon}")
print(f"Requested: {kw_requested} kW")
print("-" * 50)

result = gm.get_station_data(lat, lon, kw_requested)

if result:
    print(f"\nNearest Station: {result['nearest_station_id']}")
    print(f"Distance: {result['distance_meters']} meters")
    print(f"Grid Level: {result['grid_level']}")
    print(f"Max Capacity: {result.get('max_capacity', 'N/A')} kW")
    print(f"Current Load: {result.get('current_load_pv', 'N/A')} kW")
    print(f"Remaining Safe: {result.get('remaining_safe', 'N/A')} kW")
    print(f"\nTraffic Light: {result['traffic_light']}")
    print(f"Status: {result['status']}")
    print(f"Message: {result['message']}")
else:
    print("No station found!")
