from flask import Flask, jsonify, request, session, make_response
from pymongo import MongoClient
import bcrypt
import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv() #environment variables 

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", 'SECRET')
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.permanent_session_lifetime = timedelta(days=3)

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.status_code = 200
        return response

@app.after_request
def apply_cors(response):
    origin = request.headers.get("Origin")
    if origin == "http://localhost:3000":
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


# mongoDB setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["gotgas"]
users_collection = db["users"]

users_collection.create_index("username", unique=True)

@app.route("/")
def home():
    return jsonify({"message": "Backend is running!"})

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400  #just to give some criteria
    
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
        logged_in_user = username
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
    return jsonify({"message": "Button action executed successfully", "user": session ['user']}), 200
@app.route("/check-auth", methods=["GET"])
def check_auth():
    if 'user' in session:
        return jsonify({"authenticated": True, "username": session['user']}), 200
    return jsonify({"authenticated": False}), 200

@app.route("/user-info", methods=["GET"])
def user_info():
    if 'user' not in session:
        return jsonify({"error": "Please log in first"}), 401
    user = users_collection.find_one({"username": session['user']}, {password: 0})

    if user:
        user['_id'] = str(user['_id'])
        return jsonify(user), 200
    
    return jsonify({"error": "User not found"}), 404

@app.route("/profile/email", methods=["OPTIONS"])
def profile_email_options():
    return "", 200

@app.route("/profile/email", methods=["PATCH"])
def update_email():
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    new_email = data.get("email", "").strip()

    if not new_email:
        return jsonify({"message": "Email cannot be empty"}), 400

    # Check it's not already taken by another user
    existing = users_collection.find_one({"email": new_email})
    if existing and existing["username"] != session["user"]:
        return jsonify({"message": "Email already in use"}), 409

    users_collection.update_one(
        {"username": session["user"]},
        {"$set": {"email": new_email}}
    )
    return jsonify({"message": "Email updated successfully"}), 200

@app.route("/profile", methods=["GET"])
def profile():
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user = users_collection.find_one({"username": session["user"]})
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "username": user.get("username"),
        "email": user.get("email"),
        "fullName": user.get("full_name"),
        "phone": user.get("phone"),
        "memberSince": str(user.get("created_at")) if user.get("created_at") else None,
    }), 200
if __name__ == "__main__":
    app.run(debug=True)
