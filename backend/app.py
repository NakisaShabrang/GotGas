from flask import Flask, jsonify, request, session
from flask_cors import CORS
from pymongo import MongoClient
import bcrypt
import os
from dotenv import load_dotenv
from datetime import timedelta

# Load environment variables
load_dotenv()  
app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

app.secret_key = os.getenv('SECRET_KEY', 'secret')
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True
app.permanent_session_lifetime = timedelta(days=7)

# MongoDB connection - IMPORTANT: Remove the default fallback
MONGODB_URI = os.getenv('MONGODB_URI')
print(f"Connecting to: {MONGODB_URI}")  # Debug
client = MongoClient(MONGODB_URI)
db = client['gotgas']
users_collection = db['users']

# Create index on username for faster lookups, not necessary but I like it
users_collection.create_index('username', unique=True)

@app.route("/")
def home():
    return jsonify({"message": "Backend is running!"})

@app.route("/register", methods=["POST", "OPTIONS"])
def register():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400
    
    if users_collection.find_one({"username": username}):
        return jsonify({"error": "Username already exists"}), 400
    
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    user_doc = {
        "username": username,
        "password": hashed_password,
        "created_at": None
    }
    
    try: 
        users_collection.insert_one(user_doc)
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        return jsonify({"error": "An error occurred while registering the user"}), 500

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    
    user = users_collection.find_one({"username": username})

    if not user:
        return jsonify({"error": "Invalid username or password"}), 401
    
    if bcrypt.checkpw(password.encode('utf-8'), user["password"]):
        session.permanent = True
        session["user"] = username
        return jsonify({"message": "Login successful", "username": username}), 200
    
    return jsonify({"error": "Invalid username or password"}), 401

@app.route("/logout", methods=["POST"])
def logout():
    session.pop("user", None)
    return jsonify({"message": "Logged out"}), 200

@app.route("/button-action", methods=["POST"])
def button_action():
    if 'user' not in session:
        return jsonify({"error": "Please Log-in"}), 401
    
    print(f"Button clicked by {session['user']}!")
    return jsonify({"message": "Button action executed successfully", "user": session['user']}), 200

@app.route("/check-auth", methods=["GET"])
def check_auth():
    if 'user' in session:
        return jsonify({"authenticated": True, "username": session['user']}), 200
    return jsonify({"authenticated": False}), 200

@app.route("/user-info", methods=["GET"])
def user_info():
    if 'user' not in session:
        return jsonify({"error": "Please log in first"}), 401
    
    user = users_collection.find_one(
        {"username": session['user']}, 
        {"password": 0}  # Fixed: I needed quotes around "password"
    )

    if user:
        user['_id'] = str(user['_id'])
        return jsonify(user), 200
    
    return jsonify({"error": "User not found"}), 404

if __name__ == "__main__":
    app.run(debug=True, port=5000)
