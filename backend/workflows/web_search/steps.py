from tools.llm import get_llm
from .states import Research, Section, Sections, Researcher
from pydantic import BaseModel, Field
from .vector_store import vector_store
from dotenv import load_dotenv
import os

load_dotenv()

SERPER_API_KEY = os.getenv("SERPER_API_KEY")

# Initialize the language model placeholders
model = None
llm = None
research_planner = None
planner = None
writer = None
refiner = None


class RefinedReport(BaseModel):
    """Structured output for refining and evaluating the report."""
    report: str = Field("", description="The polished report as markdown text")
    evaluation: str = Field("", description="Brief evaluation of the report")

def set_llms(provider: str, api_key: str, **kwargs):
    max_tokens = kwargs.get("max_tokens", None)
    temperature = kwargs.get("temperature", 0.7)
    """Configure global LLM instances based on provider and API key."""
    global model, llm, research_planner, planner, writer, refiner
    default = "gpt-4o" if (provider or "openai").lower() == "openai" else "claude-3-5-sonnet-latest"
    model = get_llm(provider, api_key, default, temperature=temperature, max_tokens=max_tokens)
    llm = get_llm(provider, api_key, default, temperature=temperature, max_tokens=max_tokens)
    research_planner = llm.with_structured_output(Research)
    planner = llm.with_structured_output(Sections)
    writer = llm.with_structured_output(Section)
    refiner = llm.with_structured_output(RefinedReport)

import requests
from bs4 import BeautifulSoup
import time
import random
from typing import List, Dict, Any
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
import uuid

def perform_search(query: str, num_results: int = 5) -> List[str]:
    """
    Perform a web search using Serper.dev API.
    
    Args:
        query: The search query
        num_results: Number of results to return
        
    Returns:
        List of URLs
    """
    try:
        url = "https://google.serper.dev/search"
        headers = {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "q": query
        }
        
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        data = response.json()
        organic_results = data.get("organic", [])
        
        urls = [item.get("link") for item in organic_results[:num_results] if item.get("link")]
        
        return urls
    except Exception as e:
        print(f"Error with Serper.dev search: {e}")
        return []

def extract_text_from_url(url: str, timeout: int = 15) -> Dict[str, str]:
    """
    Extract text from a URL with improved reliability and retry logic.
    
    Args:
        url: The URL to extract text from
        timeout: Timeout in seconds
        
    Returns:
        Dict with url, title, and text
    """
    # Define different user agents to rotate through
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0'
    ]
    
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            # Use a random user agent
            headers = {
                'User-Agent': random.choice(user_agents),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
            
            response = requests.get(url, headers=headers, timeout=timeout)
            response.raise_for_status()
            
            # Check content type to ensure it's text/html
            content_type = response.headers.get('Content-Type', '').lower()
            if 'text/html' not in content_type and 'application/xhtml+xml' not in content_type:
                # Skip non-HTML content
                return {"url": url, "title": "Non-HTML Content", "text": ""}
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Get the title
            title = soup.title.string if soup.title else "No title"
            
            # Remove scripts, styles, and hidden elements
            for element in soup(['script', 'style', 'header', 'footer', 'nav']):
                element.decompose()
            
            # Extract text with better spacing
            for br in soup.find_all('br'):
                br.replace_with('\n')
            
            # Replace paragraph and header tags with newlines
            for tag in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li']):
                tag.append(soup.new_string('\n\n'))
            
            text = soup.get_text(separator=' ')
            
            # Clean up the text
            lines = [line.strip() for line in text.split('\n')]
            text = '\n'.join([line for line in lines if line])
            
            # Normalize whitespace
            text = ' '.join(text.split())
                
            return {
                "url": url,
                "title": title,
                "text": text
            }
            
        except requests.exceptions.RequestException as e:
            print(f"Request error extracting text from {url}: {e}")
            retry_count += 1
            time.sleep(random.uniform(2.0, 5.0))
            
        except Exception as e:
            print(f"Error extracting text from {url}: {e}")
            return {"url": url, "title": "Error", "text": ""}
    
    # If all retries failed
    return {"url": url, "title": "Failed after retries", "text": ""}

def extract_text_from_urls(urls: List[str]) -> List[Dict[str, str]]:
    """
    Extract text from multiple URLs in parallel with improved reliability.
    
    Args:
        urls: List of URLs to extract text from
        
    Returns:
        List of dictionaries with url, title, and text
    """
    # urls = urls[:5]
    results = []
    with ThreadPoolExecutor(max_workers=3) as executor:  # Reduced to avoid rate limiting
        future_to_url = {executor.submit(extract_text_from_url, url): url for url in tqdm(urls)}
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                result = future.result()
                if result["text"]:  # Only append non-empty results
                    results.append(result)
            except Exception as e:
                print(f"Error processing {url}: {e}")
    
    return results

def create_research_plan(state: Researcher) -> Dict[str, Any]:
    """Create a research plan based on the input."""
    # Clear the vector store at the beginning of a new research task
    vector_store.clear()
    
    # Create a research plan based on the input
    research_plan = research_planner.invoke(state["input"])
    return {"research_plan": research_plan}

def gather_research(state: Researcher) -> Dict[str, Any]:
    """Gather research by executing search queries and storing results in the vector store."""
    # Extract necessary information from the research plan
    search_queries = state["research_plan"].search_queries
    subtopics = state["research_plan"].subtopics
    
    # Store sources information for citation
    sources = []
    
    # Track sources by subtopic for planning
    subtopic_sources = {subtopic: [] for subtopic in subtopics}
    
    for i, subtopic in enumerate(subtopics):
        # Make sure we have enough search queries
        if i < len(search_queries):
            query = search_queries[i].query
            print(f"Searching for: {query}")
            urls = perform_search(query)
            
            if not urls:
                print(f"Warning: No search results found for query '{query}'")
                continue
                
            print(f"Found {len(urls)} results, extracting text...")
            
            # Extract text from URLs
            results = extract_text_from_urls(urls)
            
            # Store texts in the vector store with metadata
            texts = []
            metadatas = []
            
            for result in results:
                if result["text"]:
                    # Store the text in the vector database
                    texts.append(result["text"])
                    
                    # Create metadata
                    metadata = {
                        "url": result["url"],
                        "title": result["title"],
                        "subtopic": subtopic,
                        "source_id": str(uuid.uuid4())  # Unique ID for citation
                    }
                    metadatas.append(metadata)
                    
                    # Add to sources for citation
                    sources.append(metadata)
                    
                    # Track source by subtopic
                    subtopic_sources[subtopic].append({
                        "url": result["url"],
                        "title": result["title"]
                    })
            
            # Add to vector store
            if texts:
                vector_store.add_texts(texts, metadatas)
                
            # Add delay between subtopic searches to avoid rate limiting
            if i < len(subtopics) - 1:
                sleep_time = random.uniform(5.0, 10.0)
                print(f"Waiting {sleep_time:.1f} seconds before next search...")
                time.sleep(sleep_time)
    
    return {
        "context_data": subtopic_sources,  # Just pass source metadata by subtopic
        "sources": sources
    }

def plan_sections(state: Researcher) -> Dict[str, Any]:
    """Create a plan for the sections based on the research and context."""
    # Create context overview from the gathered sources
    context_overview = ""
    for subtopic, sources in state["context_data"].items():
        context_overview += f"### {subtopic}\n"
        for item in sources:
            context_overview += f"- {item['title']} ({item['url']})\n"
        context_overview += "\n"
    
    # Create a plan for the sections
    planning_prompt = f"""
    Based on the research topic "{state['research_plan'].topics}" and subtopics {state['research_plan'].subtopics},
    create a structured outline with sections for a comprehensive report.
    
    We've gathered information from the following sources:
    
    {context_overview}
    
    Create a sensible structure for the report with appropriate sections that will cover the research topic thoroughly.
    Each section should have a clear focus and purpose within the overall report.
    """
    
    sections_plan = planner.invoke(planning_prompt)
    if not sections_plan or not getattr(sections_plan, "sections", None):
        sections_plan = Sections(sections=[])
    return {"sections": sections_plan, "section_idx": 0}  # Initialize section_idx

def generate_section(state: Researcher) -> Dict[str, Any]:
    """Generate a section of the report using retrieved chunks from the vector store."""
    # Get the section to generate
    section_idx = state["section_idx"]
    sections_list = getattr(state.get("sections"), "sections", []) or []
    if section_idx >= len(sections_list):
        return {"section_idx": section_idx}
    section = sections_list[section_idx]
    
    # Formulate a query based on the section title and research topic
    query = f"{state['research_plan'].topics} {section.title}"
    
    # Retrieve relevant chunks from the vector store
    relevant_chunks = vector_store.search(query, k=10)
    
    # Get the metadata for these chunks directly from the vector store
    sources_used = []
    if vector_store.vector_store:
        # Search again to get documents with metadata
        docs_with_metadata = vector_store.vector_store.similarity_search(query, k=10)
        for doc in docs_with_metadata:
            if doc.metadata and "url" in doc.metadata:
                sources_used.append({
                    "url": doc.metadata.get("url", ""),
                    "title": doc.metadata.get("title", "Unknown"),
                    "subtopic": doc.metadata.get("subtopic", ""),
                    "source_id": doc.metadata.get("source_id", "")
                })
    
    # Deduplicate sources
    unique_sources = []
    seen_urls = set()
    for source in sources_used:
        if source["url"] not in seen_urls:
            seen_urls.add(source["url"])
            unique_sources.append(source)
    
    # Format chunks with source information for better context
    context_with_sources = ""
    for i, chunk in enumerate(relevant_chunks):
        # Try to find the source for this chunk
        source_info = ""
        if i < len(unique_sources):
            source_info = f"Source: {unique_sources[i]['title']} ({unique_sources[i]['url']})"
        
        context_with_sources += f"Chunk {i+1}:\n{chunk}\n{source_info}\n\n"
    
    # Generate content using the retrieved chunks
    section_prompt = f"""
    Write a comprehensive section for the report with title: "{section.title}".
    
    The original user input was: "{state['input']}"
    The main research topic is: "{state['research_plan'].topics}"
    
    Here are relevant chunks of information retrieved from reliable sources:
    
    {context_with_sources}
    
    Your task:
    1. Write a coherent, informative section based on the information in these chunks
    2. Include specific facts, figures, and data points from the sources where relevant
    3. Organize the information logically with clear paragraph breaks
    4. Make sure to be balanced, informative, and engaging
    5. Include only information that is supported by the provided chunks or is common knowledge
    6. Do not fabricate information or statistics
    7. Be thorough and detailed in all of your analysis and explanations
    8. The section you generate should be at least 1000 words long
    
    Your section should be self-contained and flow naturally as part of a larger report.
    """
    
    generated_section = writer.invoke(section_prompt)
    section_text = getattr(generated_section, "text", "") or ""
    print(f"Generated section: '{section.title}' - {len(section_text)} characters")
    
    # Initialize generated_sections dictionary if it doesn't exist
    generated_sections = state.get("generated_sections", {})
    
    # Add this section to the generated_sections dictionary
    generated_sections[str(section_idx)] = {
        "title": section.title,
        "text": section_text,
        "sources": unique_sources
    }
    
    # Return updates
    return {
        "generated_sections": generated_sections,
        "section_idx": section_idx + 1
    }

def should_continue_generating(state: Researcher) -> str:
    """Determine if more sections need to be generated."""
    section_idx = state["section_idx"]
    sections_list = getattr(state.get("sections"), "sections", []) or []
    if section_idx < len(sections_list):
        return "continue_generation"
    else:
        return "done_generation"

def combine_sections(state: Researcher) -> Dict[str, str]:
    """Combine all sections into a final output with citations."""
    # Combine all sections into a final output
    combined_text = f"# {state['research_plan'].topics}\n\n"
    
    # Add a brief introduction
    combined_text += f"## Introduction\n\nThis report explores {state['research_plan'].topics}, examining various aspects and providing insights based on current research and information. The report was generated in response to the query: \"{state['input']}\"\n\n"
    
    generated_sections = state.get("generated_sections", {})
    print(f"Generated sections keys: {list(generated_sections.keys())}")
    
    # Add content sections
    for i in range(len(state["sections"].sections)):
        section_key = str(i)
        if section_key in generated_sections:
            section_data = generated_sections[section_key]
            combined_text += f"## {section_data['title']}\n\n{section_data['text']}\n\n"
        else:
            print(f"WARNING: Section {section_key} not found in generated_sections!")
    
    # Add a conclusion/summary section
    combined_text += f"## Conclusion\n\nThis report has examined {state['research_plan'].topics} from multiple perspectives. The information presented is based on current research and publicly available information as of the time of writing.\n\n"
    
    # Collect all unique sources
    all_sources = []
    for i in range(len(state["sections"].sections)):
        section_key = str(i)
        if section_key in generated_sections:
            section_data = generated_sections[section_key]
            if "sources" in section_data:
                all_sources.extend(section_data["sources"])
    
    # Deduplicate sources
    unique_sources = {}
    for source in all_sources:
        if "url" in source and source["url"] not in unique_sources:
            unique_sources[source["url"]] = source
    
    # Add sources section with references
    combined_text += "## References\n\n"
    
    for i, (url, source) in enumerate(unique_sources.items()):
        title = source.get('title', 'Unknown Title')
        combined_text += f"{i + 1}. [{title}]({url})\n"
    
    return {"final_output": combined_text}

def evaluate_and_refine(state: Researcher) -> Dict[str, str]:
    """Refine the compiled report and return both the polished report and a brief evaluation."""
    original_question = state["input"]
    current_output = state["final_output"]
    research_topic = state["research_plan"].topics

    refinement_prompt = f"""
    You are reviewing a research report on "{research_topic}" that was generated in response to this question:

    "{original_question}"

    Below is the current report with multiple independently-generated sections. Your job is to polish the report so that it flows coherently and fully addresses the user's request. Preserve citations and references.

    Return the improved report in the `report` field and a short assessment of its quality in the `evaluation` field.

    Report to refine:

    {current_output}
    """

    result = refiner.invoke(refinement_prompt)
    refined_output = getattr(result, "report", "") or current_output
    evaluation = getattr(result, "evaluation", "")

    vector_store.clear()

    return {"final_output": refined_output, "evaluation": evaluation}
