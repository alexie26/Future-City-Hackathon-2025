# Electrify Heilbronn - Grid Connection Feasibility Tool

A web application to check grid connection feasibility for electrical installations (Solar PV, EV Chargers, Heat Pumps) in Heilbronn, Germany.

## Features

- 🗺️ Interactive map with grid stations
- ⚡ Real-time capacity checking
- 📊 Voltage level information (NS/MS/HS)
- 💰 Cost estimation
- 📋 Comparison tool for multiple locations
- 📄 PDF export of results
- 🤖 AI-powered chatbot assistant
- 📝 Application submission form

## Prerequisites

- **Python 3.12+** (for backend)
- **Node.js 18+** (for frontend)
- **Git**

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/alexie26/Future-City-Hackathon-2025.git
cd Future-City-Hackathon-2025
```

### 2. Backend Setup

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Linux/Mac
# OR
venv\Scripts\activate     # On Windows

# Install dependencies
cd backend
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install
```

### 4. Running the Application

You need to run both backend and frontend simultaneously.

#### Terminal 1 - Backend Server

```bash
cd backend
source ../venv/bin/activate  # On Linux/Mac
uvicorn main:app --reload
```

The backend API will run on **http://localhost:8000**

#### Terminal 2 - Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will run on **http://localhost:5173**

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Project Structure

```
electrify_heilbronn/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── grid_data.py         # Grid data management
│   ├── requirements.txt     # Python dependencies
│   └── data/                # Grid capacity CSV files
│       ├── Kapa Stationen.csv
│       ├── Kapa Umspannwerke.csv
│       ├── tabelle1.csv
│       └── tabelle3.csv
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main application
│   │   ├── components/      # React components
│   │   │   ├── MapView.jsx
│   │   │   ├── InputCard.jsx
│   │   │   ├── ResultCard.jsx
│   │   │   ├── ChatBot.jsx
│   │   │   └── ...
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Usage Guide

### 1. Check Grid Capacity

1. Enter an address or click on the map
2. Select technology type (EV Charger, Heat Pump, Solar PV)
3. Enter required power (kW)
4. Choose Load or Feed-in
5. Click "Check Feasibility"

### 2. View Results

- **Green**: Capacity available, fast approval
- **Yellow**: Limited capacity, detailed review needed
- **Red**: Insufficient capacity, grid expansion required

### 3. Use AI Chatbot

- Click the chat icon in the bottom right
- Ask questions about:
  - Grid connection process
  - Required documents
  - Timeline estimates
  - Cost information
  - Technical requirements

### 4. Compare Locations

- Click "Compare Locations" in the result card
- Add multiple addresses to compare
- See which location has better grid capacity

### 5. Export Report

- Click "Export PDF" to download a detailed feasibility report

### 6. Submit Application

- Click "Apply Now" to submit an official application
- Fill in contact details and project information

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Pandas** - Data processing
- **Google Gemini AI** - Chatbot intelligence
- **Uvicorn** - ASGI server

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Leaflet** - Interactive maps
- **Axios** - HTTP client

## API Endpoints

- `GET /` - Health check
- `POST /check-feasibility` - Check grid capacity
- `GET /stations` - Get all grid stations
- `POST /chat` - AI chatbot endpoint
- `POST /submit-application` - Submit application
- `GET /health` - Detailed health status

## Development

### Backend Development

```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --reload --log-level debug
```

### Frontend Development

```bash
cd frontend
npm run dev
```

### View API Documentation

When the backend is running, visit:
```
http://localhost:8000/docs
```

## Troubleshooting

### Backend won't start
- Check Python version: `python3 --version` (should be 3.12+)
- Activate virtual environment
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend won't start
- Check Node version: `node --version` (should be 18+)
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Map not loading
- Check backend is running on port 8000
- Check console for CORS errors
- Verify data files exist in `backend/data/`

### Chatbot not responding
- Check API key is configured in `backend/main.py`
- Check backend logs for errors
- Verify `google-generativeai` package is installed

## Contributing

This project was developed for the Future City Hackathon 2025 in Heilbronn.

## License

MIT License

## Contact

For questions or issues, please open an issue on GitHub.
