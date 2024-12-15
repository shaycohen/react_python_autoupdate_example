from flask import Flask, jsonify, make_response
import random

app = Flask(__name__)

# Global variables to store data and track requests
DATA = []
REQUEST_COUNTER = 0

def generate_data():
    """
    Generate a list of 10 to 20 records (random range).
    Each record contains id, name, and a status field.
    """
    record_count = random.randint(10, 20)
    new_data = []
    for i in range(record_count):
        record = {
            "id": i + 1,
            "name": f"Node_{i + 1}",
            "status": random.choice(["OK", "NOT OK", "MAINTENANCE"])
        }
        new_data.append(record)
    return new_data

@app.route('/data', methods=['GET'])
def get_data():
    global DATA, REQUEST_COUNTER
    REQUEST_COUNTER += 1
    
    # Every 2nd request, regenerate the data
    if REQUEST_COUNTER % 2 == 0:
        DATA = generate_data()
    # If DATA is empty on the very first request, generate once
    if not DATA:
        DATA = generate_data()
    
    response = make_response(jsonify(DATA))
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

if __name__ == '__main__':
    # Run on localhost:5000 by default. Access /data endpoint to see JSON response.
    app.run(debug=True)

