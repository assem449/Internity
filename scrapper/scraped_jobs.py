#!/usr/bin/env python3
"""
Quick LinkedIn Job Scraper Script
Run this to fetch real LinkedIn jobs and save them to scraped_jobs.json
"""

from apify_client import ApifyClient
import json
import os
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()


def extract_skills(description: str) -> list:
    """Extract skills from job description using keyword matching"""
    skill_keywords = [
        "Python", "JavaScript", "Java", "C++", "C#", "Ruby", "Go", "Rust", "PHP", "Swift", "Kotlin",
        "React", "Angular", "Vue", "Node.js", "Django", "Flask", "FastAPI", "Express", "Spring",
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "SQL", "NoSQL",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Jenkins", "CI/CD", "DevOps",
        "Machine Learning", "Deep Learning", "AI", "NLP", "Computer Vision", "Data Science",
        "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy",
        "Git", "Agile", "Scrum", "REST API", "GraphQL", "Microservices",
        "HTML", "CSS", "TypeScript", "Sass", "Webpack", "Babel",
        "Linux", "Bash", "Shell", "Terraform", "Ansible"
    ]
    
    description_lower = description.lower() if description else ""
    found_skills = []
    
    for skill in skill_keywords:
        if skill.lower() in description_lower:
            found_skills.append(skill)
    
    return found_skills

def scrape_linkedin_jobs(apify_token: str, search_queries: list, max_results: int = 20):
    """Scrape LinkedIn jobs using Apify"""
    
    client = ApifyClient(apify_token)
    all_jobs = []
    
    print(f"🔍 Starting LinkedIn job scraper...")
    print(f"📋 Search queries: {search_queries}")
    
    for query in search_queries:
        print(f"\n🔎 Scraping jobs for: '{query}'")
        
        try:
            # Configure the scraper
            # Using the official LinkedIn Jobs Scraper actor
            run_input = {
                "search": query,
                "maxResults": max_results,
                "scrapeJobDetails": True,
            }
            
            # Run the actor
            print(f"   ⏳ Running Apify actor...")
            run = client.actor("hMvNSpz3JnHgl5jkh").call(run_input=run_input)
            
            # Fetch results
            job_count = 0
            for item in client.dataset(run["defaultDatasetId"]).iterate_items():
                # Extract and clean job data
                job = {
                    "job_id": item.get("id") or item.get("url", "").split("/")[-1] or f"job_{len(all_jobs)}",
                    "title": item.get("title", "No Title"),
                    "company": item.get("company", "Unknown Company"),
                    "description": item.get("description", "No description available"),
                    "location": item.get("location", "Not specified"),
                    "salary_range": item.get("salary"),
                    "employment_type": item.get("employmentType", ""),
                    "seniority_level": item.get("seniorityLevel", ""),
                    "industry": item.get("industry", ""),
                    "url": item.get("url", ""),
                    "posted_date": item.get("listedAt"),
                    "scraped_at": datetime.utcnow().isoformat(),
                }
                
                # Extract skills
                job["required_skills"] = extract_skills(job["description"])
                
                all_jobs.append(job)
                job_count += 1
            
            print(f"   ✅ Found {job_count} jobs for '{query}'")
            
        except Exception as e:
            print(f"   ❌ Error scraping '{query}': {str(e)}")
            continue
    
    # Remove duplicates based on job_id
    unique_jobs = {}
    for job in all_jobs:
        if job["job_id"] not in unique_jobs:
            unique_jobs[job["job_id"]] = job
    
    final_jobs = list(unique_jobs.values())
    
    print(f"\n📊 Total unique jobs scraped: {len(final_jobs)}")
    final_jobs = final_jobs[:max_results]
    return final_jobs

def save_jobs(jobs: list):
    """Save jobs to JSON file (same folder as this script)"""
    output_file = os.path.join(os.path.dirname(__file__), "scraped_jobs.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(jobs, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved jobs to: {output_file}")

def main():
    """Main function to run the scraper"""
    
    # Get Apify token from environment variable
    apify_token = os.getenv("APIFY_TOKEN")
    
    if not apify_token:
        print("❌ Error: APIFY_TOKEN environment variable not set")
        print("💡 Get your token from: https://console.apify.com/account/integrations")
        print("💡 Set it with: export APIFY_TOKEN='your-token-here'")
        return
    
    # Define search queries - customize these based on your needs
    # search_queries = [
    #     "Python Developer Remote",
    #     "Machine Learning Engineer",
    #     "Full Stack Developer",
    #     "Software Engineer Python",
    #     "Data Scientist",
    #     "Backend Developer",
    # ]
    
    # Number of results per query (Apify may have limits)
    search_queries = ["Software Engineer Intern"]
    max_results_per_query = 20      
    
    print("=" * 60)
    print("🚀 LinkedIn Job Scraper")
    print("=" * 60)
    
    # Scrape jobs
    jobs = scrape_linkedin_jobs(apify_token, search_queries, max_results_per_query)
    
    if jobs:
        # Save to file
        save_jobs(jobs)
        
        # Print summary
        print("\n" + "=" * 60)
        print("📈 Summary")
        print("=" * 60)
        print(f"✅ Total jobs scraped: {len(jobs)}")
        print(f"🏢 Unique companies: {len(set(job['company'] for job in jobs))}")
        print(f"📍 Unique locations: {len(set(job['location'] for job in jobs))}")
        
        # Print sample jobs
        print("\n📋 Sample Jobs:")
        for i, job in enumerate(jobs[:5], 1):
            print(f"\n{i}. {job['title']} at {job['company']}")
            print(f"   📍 {job['location']}")
            print(f"   🔗 {job['url'][:60]}...")
            if job['required_skills']:
                print(f"   💡 Skills: {', '.join(job['required_skills'][:5])}")
        
        print("\n" + "=" * 60)
        print("✅ Done! Jobs are ready to use in the application.")
        print("=" * 60)
    else:
        print("\n❌ No jobs were scraped. Please check your Apify token and try again.")

if __name__ == "__main__":
    main()