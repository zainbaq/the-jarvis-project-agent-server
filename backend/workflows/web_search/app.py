from flask import Flask, request, jsonify
from tasks import perform_task, get_description
import argparse

def parse_args():
    parser = argparse.ArgumentParser(description="Chat API")
    parser.add_argument('--port', type=int, default=5003, help='Port to run the Flask app on')
    return parser.parse_args()

app = Flask(__name__)

@app.route('/execute', methods=['POST'])
def execute():
    """Execute the workflow with the provided input data."""
    input_data = request.json
    print(input_data)
    result = perform_task(input_data['user_request'])
    return jsonify(result)

@app.route('/description', methods=['GET'])
def description():
    """Get the workflow description."""
    return jsonify({
        "description": get_description()
    })

if __name__ == '__main__':
    args = parse_args()
    app.run(host='0.0.0.0', port=args.port)