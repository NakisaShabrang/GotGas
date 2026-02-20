from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Simple users database
USERS = {
    "user": "pass",
    "user2": "pass2"
}

# Keep track of who's logged in
logged_in_user = None

@app.route("/")
def home():
    return jsonify({"message": "Backend is running!"})

@app.route("/login", methods=["POST"])
def login():
    global logged_in_user
    
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    if username in USERS and USERS[username] == password:
        logged_in_user = username
        return jsonify({"message": "Login successful", "username": username}), 200
    
    return jsonify({"error": "Invalid username or password"}), 401

@app.route("/logout", methods=["POST"])
def logout():
    global logged_in_user
    logged_in_user = None
    return jsonify({"message": "Logged out"}), 200

@app.route("/button-action", methods=["POST"])
def button_action():
    if logged_in_user is None:
        return jsonify({"error": "Please login first"}), 401
    
    print(f"Button clicked by {logged_in_user}!")
    return jsonify({"message": "Button action executed successfully"}), 200

if __name__ == "__main__":
    app.run(debug=True)
