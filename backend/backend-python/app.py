from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os 
from apify_client import ApifyClient
from agents import SkillsAgent

load_dotenv()

GEMINI_API_KEY= os.getenv("GEMINI_API_KEY")
APIFY_KEY = os.getenv("APIFY_TOKEN")
client = ApifyClient(APIFY_KEY)

app = Flask(__name__)
CORS(app)

@app.route('/job-details', methods=['POST'])
def receive_job_details():
    try:
        data = request.json
        # 1. FIX: Handle the input list correctly
        # Incoming JSON: { "job_id": ["4011051212"] }
        job_id = data.get("jobId")
        
        if not job_id:
             return jsonify({'status': 'error', 'message': 'No ID provided'}), 400

        # 2. FIX: Convert ID to a URL (Scrapers prefer URLs)
        # Taking the first ID from the list
    
        print(f"Processing Job ID: {job_id}")

        run_input = {
            "job_id": [job_id], # Pass the full URL string
        }
        
        # Run the actor
        run = client.actor("39xxtfNEwIEQ1hRiM").call(run_input=run_input)
        
        # 3. FIX: Handle the dataset list
        dataset_id = run["defaultDatasetId"]
        items = client.dataset(dataset_id).list_items().items
        
        if len(items) > 0:
            job = items[0] # Get the first item from the list
            
            # 4. FIX: Safe access (Try nested 'job_info' OR flat 'description')
            # Some scrapers use job['job_info']['description'], others use job['description']
            description = job.get("description") or job.get("job_info", {}).get("description")
            print(description)
            agent = SkillsAgent(api_key=GEMINI_API_KEY)
            skills=agent.extract_skills(description)

            print(skills)

            return jsonify({'status': 'received', 'data': job})
        else:
            print("Scraper finished but returned no items.")
            return jsonify({'status': 'empty'}), 404

        
    except Exception as e:
        print('Error:', str(e))
        return jsonify({'status': 'error', 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)