# GotGas
**Mac:**

**Setup Backend:**
Install deps and freeze:
    cd backend
    source venv/bin/activate
    pip install flask mysql-connector-python
    pip freeze > requirements.txt
Run server:
python app.py

**Windows:**

**Setup Backend:**
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py

**Setup Frontend:**
Make a new file named .env in frontend directory, and paste this inside:

NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoia2FybG1hayIsImEiOiJjbWx2bDZ5NnEwOThhM25wb2d3MWpheHBmIn0.xTpEVDfvxodzZ-_bBuSoSQ


npm install
npm run dev