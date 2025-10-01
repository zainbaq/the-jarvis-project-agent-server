from flask import Flask, request, jsonify, render_template
from tasks import perform_task, get_description
import argparse
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Verify that the API key is available
api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    print("Warning: ANTHROPIC_API_KEY not found in environment variables")

def parse_args():
    parser = argparse.ArgumentParser(description="Developer Workflow API")
    parser.add_argument('--port', type=int, default=5002, help='Port to run the Flask app on')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to run the Flask app on')
    parser.add_argument('--debug', action='store_true', help='Run the Flask app in debug mode')
    return parser.parse_args()

app = Flask(__name__, static_folder='../../static', template_folder='../../templates')

@app.route('/', methods=['GET'])
def index():
    """Render the frontend application."""
    return render_template('developer_index.html')

@app.route('/execute', methods=['POST'])
def execute():
    """Execute the workflow with the provided input data."""
    input_data = request.json
    print(f"Received request: {input_data}")
    
    # Check for required fields
    if 'user_request' not in input_data:
        return jsonify({
            "error": "Missing required field: user_request"
        }), 400
        
    # Process the request
    try:
        result = perform_task(input_data['user_request'])
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": f"Error executing workflow: {str(e)}"
        }), 500

@app.route('/description', methods=['GET'])
def description():
    """Get the workflow description."""
    return jsonify({
        "description": get_description()
    })

@app.route('/status', methods=['GET'])
def status():
    """Check the status of the workflow."""
    return jsonify({
        "status": "OK",
        "api_key_configured": bool(api_key)
    })

if __name__ == '__main__':
    args = parse_args()
    app.run(host=args.host, port=args.port, debug=args.debug)