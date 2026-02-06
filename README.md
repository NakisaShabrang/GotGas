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
npm install
npm run dev