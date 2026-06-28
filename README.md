# JATIVA — Dashboard Inovasi Daerah Provinsi Jawa Timur

## Struktur Folder
```
brida/
├── backend/          # FastAPI
│   ├── core/         # config, database, security, middleware
│   ├── routers/      # auth, data, ai, admin
│   ├── schemas/      # pydantic models
│   ├── services/     # logika bisnis
│   ├── main.py
│   └── requirements.txt
└── frontend/         # React + Vite
    └── src/
        ├── components/
        ├── pages/
        ├── hooks/
        └── services/
```

## Setup Backend

```bash
cd backend

# 1. Buat virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy dan isi .env
cp .env.example .env
# Edit .env sesuai kredensial kamu

# 4. Jalankan
uvicorn main:app --reload --port 8000
```

API docs tersedia di: http://localhost:8000/docs

## Setup Frontend

```bash
cd frontend

# 1. Install dependencies
npm install react-router-dom axios recharts leaflet react-leaflet
npm install -D tailwindcss @tailwindcss/vite

# 2. Copy .env
cp .env.example .env

# 3. Jalankan
npm run dev
```

Frontend tersedia di: http://localhost:5173

## Deploy

### Backend → Railway
1. Push folder `backend/` ke GitHub
2. Buat project baru di railway.app
3. Connect repo, set environment variables dari `.env`
4. Railway otomatis detect FastAPI dan deploy

### Frontend → Vercel
1. Push folder `frontend/` ke GitHub  
2. Import project di vercel.com
3. Set `VITE_API_URL` ke URL Railway backend kamu
4. Deploy otomatis
