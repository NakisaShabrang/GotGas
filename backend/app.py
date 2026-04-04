from flask import Flask, jsonify, request, session
from flask_cors import CORS
from pymongo import MongoClient
import bcrypt
import os
from dotenv import load_dotenv
from datetime import timedelta, datetime

# Load environment variables
load_dotenv()  
app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

app.secret_key = os.getenv('SECRET_KEY', 'secret')
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
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
        "created_at": datetime.utcnow()
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

@app.route("/profile", methods=["GET"])
def profile():
    if 'user' not in session:
        return jsonify({"error": "Please log in to view your profile."}), 401

    user = users_collection.find_one(
        {"username": session['user']},
        {"password": 0}
    )

    if not user:
        return jsonify({"error": "User not found"}), 404

    created_at = user.get("created_at")
    if created_at:
        try:
            created_at = created_at.strftime("%B %Y")
        except Exception:
            created_at = str(created_at)

    return jsonify({
        "username": user.get("username", ""),
        "email": user.get("email"),
        "fullName": user.get("full_name"),
        "phone": user.get("phone"),
        "memberSince": created_at,
    }), 200

# --------------- Favorites API ---------------

favorites_collection = db['favorites']
favorite_groups_collection = db['favorite_groups']

@app.route("/favorites", methods=["GET"])
def get_favorites():
    if 'user' not in session:
        return jsonify({"error": "Please log in first"}), 401
    docs = list(favorites_collection.find({"username": session['user']}, {"_id": 0, "username": 0}).sort("createdAt", -1))
    return jsonify(docs), 200

@app.route("/favorites", methods=["POST"])
def add_favorite():
    if 'user' not in session:
        return jsonify({"error": "Please log in first"}), 401
    data = request.get_json()
    station_id = data.get("id")
    name = data.get("name", "").strip()
    address = data.get("address", "")
    if not station_id or not name:
        return jsonify({"error": "id and name are required"}), 400
    if favorites_collection.find_one({"username": session['user'], "id": station_id}):
        return jsonify({"message": "Already a favorite"}), 200
    favorites_collection.insert_one({
        "username": session['user'],
        "id": station_id,
        "name": name,
        "address": address,
        "createdAt": datetime.utcnow().timestamp() * 1000,
    })
    return jsonify({"message": "Favorite added"}), 201

@app.route("/favorites/<station_id>", methods=["DELETE"])
def delete_favorite(station_id):
    if 'user' not in session:
        return jsonify({"error": "Please log in first"}), 401
    favorites_collection.delete_one({"username": session['user'], "id": station_id})
    # Also remove from all groups
    favorite_groups_collection.update_many(
        {"username": session['user']},
        {"$pull": {"stationIds": station_id}}
    )
    return jsonify({"message": "Favorite removed"}), 200

@app.route("/favorites/<station_id>/name", methods=["PUT"])
def update_favorite_name(station_id):
    if 'user' not in session:
        return jsonify({"error": "Please log in first"}), 401
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name or len(name) > 40:
        return jsonify({"error": "Invalid name"}), 400
    favorites_collection.update_one(
        {"username": session['user'], "id": station_id},
        {"$set": {"name": name}}
    )
    return jsonify({"message": "Name updated"}), 200

# --------------- Favorite Groups API ---------------

@app.route("/favorite-groups", methods=["GET"])
def get_favorite_groups():
    if 'user' not in session:
        return jsonify({"error": "Please log in first"}), 401
    docs = list(favorite_groups_collection.find({"username": session['user']}, {"_id": 0, "username": 0}).sort("createdAt", -1))
    return jsonify(docs), 200

@app.route("/favorite-groups", methods=["POST"])
def create_favorite_group():
    if 'user' not in session:
        return jsonify({"error": "Please log in first"}), 401
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name or len(name) > 40:
        return jsonify({"error": "Invalid group name"}), 400
    existing = favorite_groups_collection.find_one({"username": session['user'], "name": {"$regex": f"^{name}$", "$options": "i"}})
    if existing:
        return jsonify({"error": "A list with that name already exists"}), 400
    group_id = f"group-{int(datetime.utcnow().timestamp() * 1000)}"
    favorite_groups_collection.insert_one({
        "username": session['user'],
        "id": group_id,
        "name": name,
        "stationIds": [],
        "createdAt": datetime.utcnow().timestamp() * 1000,
    })
    return jsonify({"message": "Group created", "id": group_id}), 201

@app.route("/favorite-groups/<group_id>", methods=["DELETE"])
def delete_favorite_group(group_id):
    if 'user' not in session:
        return jsonify({"error": "Please log in first"}), 401
    favorite_groups_collection.delete_one({"username": session['user'], "id": group_id})
    return jsonify({"message": "Group deleted"}), 200

@app.route("/favorite-groups/<group_id>/name", methods=["PUT"])
def rename_favorite_group(group_id):
    if 'user' not in session:
        return jsonify({"error": "Please log in first"}), 401
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name or len(name) > 40:
        return jsonify({"error": "Invalid group name"}), 400
    existing = favorite_groups_collection.find_one({
        "username": session['user'],
        "id": {"$ne": group_id},
        "name": {"$regex": f"^{name}$", "$options": "i"}
    })
    if existing:
        return jsonify({"error": "A list with that name already exists"}), 400
    favorite_groups_collection.update_one(
        {"username": session['user'], "id": group_id},
        {"$set": {"name": name}}
    )
    return jsonify({"message": "Group renamed"}), 200

@app.route("/favorite-groups/<group_id>/stations/<station_id>", methods=["POST"])
def add_station_to_group(group_id, station_id):
    if 'user' not in session:
        return jsonify({"error": "Please log in first"}), 401
    favorite_groups_collection.update_one(
        {"username": session['user'], "id": group_id},
        {"$addToSet": {"stationIds": station_id}}
    )
    return jsonify({"message": "Station added to group"}), 200

@app.route("/favorite-groups/<group_id>/stations/<station_id>", methods=["DELETE"])
def remove_station_from_group(group_id, station_id):
    if 'user' not in session:
        return jsonify({"error": "Please log in first"}), 401
    favorite_groups_collection.update_one(
        {"username": session['user'], "id": group_id},
        {"$pull": {"stationIds": station_id}}
    )
    return jsonify({"message": "Station removed from group"}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)
