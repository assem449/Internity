from google import genai
from google.genai import types
import json

class SkillsAgent:
    def __init__(self, api_key):
        # 1. NEW: Instantiate a Client instead of using global 'configure'
        self.client = genai.Client(api_key=api_key)
        
        # We store the model name string to use in calls later
        self.model_name = "gemini-2.0-flash"
        # gemini-2.0-flash

    def extract_skills(self, description):
        """
        Input: Raw Job Description (String)
        Output: Python Dictionary (Ready for Database)
        """
        
        prompt = f"""


        You are a parser. Extract skills from the job description below.

        JOB DESCRIPTION:
        {description}

        YOU MUST NOT infer skills. 
        Return a JSON object with this exact schema:

        {{
            "skills": ["skill1", "skill2","skill3", ...],
        }}


        ## EXAMPLE SCENARIO:

        Description = 
        
        Company Name: Nebula Interfaces Mission is to simplify the complex web of digital 
        interactions, creating intuitive, accessible, and visually stunning digital 
        experiences that empower users worldwide.
       
        Responsibilities: Design high-fidelity mockups and interactive prototypes for web and mobile applications.
        Collaborate closely with engineering teams to ensure design feasibility and faithful implementation.
        Maintain and expand the company's internal design system to ensure consistency across products.
        Conduct user research and usability testing to iterate on interface designs.

        Skills

        Technical: Proficiency in Figma, Adobe XD, and Adobe Creative Cloud,
        ,Basic understanding of HTML5, CSS3, and JavaScript constraints.

        GENERATED OUTPUT:
        {{
            "skills": [" Figma", "Adobe XD", "Adobe Creative Cloud", "HTML5", "CSS3", "Javascript"]
        }}

        """

        try:
            # 2. NEW: Call client.models.generate_content
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                # 3. NEW: Config is passed inside the call, using 'types'
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json" 
                )
            )
            
            # 4. NEW: Access text directly (the new SDK handles it cleanly)
            data_dict = json.loads(response.text)
            
            return data_dict

        except json.JSONDecodeError:
            print("Error: AI returned invalid JSON.")
            return {"technical_skills": [], "error": "Parsing Failed"}
        except Exception as e:
            print(f"Agent Error: {e}")
            return None