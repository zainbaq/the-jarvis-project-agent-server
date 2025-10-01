
# Import necessary components from langchain and langgraph
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

from langchain_core.output_parsers import JsonOutputParser
from langgraph.graph import StateGraph, END, START

from states import AgentState, Expenses, ExpenseItem
from typing_extensions import List, Optional, Dict
import base64
import io
import os
import pdfplumber
import pytesseract
from PIL import Image
import pandas as pd

# Initialize the LLM
llm = ChatOpenAI(model="gpt-4-vision-preview", temperature=0)
text_llm = ChatOpenAI(model="gpt-4o", temperature=0)

# Structured output extractors
expense_extractor = text_llm.with_structured_output(Expenses)


# Function to list files in the directory
def list_files(directory_path: str) -> List[str]:
    """List all image and PDF files in the specified directory."""
    valid_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif']
    file_paths = []
    
    for file in os.listdir(directory_path):
        file_extension = os.path.splitext(file)[1].lower()
        if file_extension in valid_extensions:
            file_paths.append(os.path.join(directory_path, file))
    
    return file_paths


# Function to extract text from a PDF using pdfplumber
def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file using pdfplumber."""
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                
                # If minimal text was extracted, try getting an image for OCR
                if len(page_text.strip()) < 50:  # Assuming a receipt should have more than 50 chars
                    # Get page as image
                    img = page.to_image(resolution=300)
                    # Convert to PIL Image
                    pil_img = img.original
                    # Use OCR
                    page_text = pytesseract.image_to_string(pil_img)
                
                text += page_text + "\n"
        
        return text
    except Exception as e:
        return f"Error extracting text from PDF {file_path}: {str(e)}"


# Function to extract text from an image using OCR
def extract_text_from_image(file_path: str) -> str:
    """Extract text from an image file using pytesseract OCR."""
    try:
        img = Image.open(file_path)
        text = pytesseract.image_to_string(img)
        return text
    except Exception as e:
        return f"Error extracting text from image {file_path}: {str(e)}"


# Function to extract text from a file based on its type
def extract_text_from_file(file_path: str) -> str:
    """Extract text content from a PDF or image file."""
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension == '.pdf':
        return extract_text_from_pdf(file_path)
    else:  # Image files
        return extract_text_from_image(file_path)
    

# Function to get image data for vision model from PDF
def get_image_from_pdf(file_path: str) -> Optional[Dict]:
    """Get image data from a PDF for vision model."""
    try:
        with pdfplumber.open(file_path) as pdf:
            if len(pdf.pages) > 0:
                # Get the first page
                page = pdf.pages[0]
                # Convert to image
                img = page.to_image(resolution=300)
                # Save to bytes
                img_bytes = io.BytesIO()
                img.original.save(img_bytes, format="PNG")
                img_bytes = img_bytes.getvalue()
                # Encode to base64
                b64_img = base64.b64encode(img_bytes).decode('utf-8')
                return {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_img}"}}
        return None
    except Exception as e:
        print(f"Error getting image from PDF: {str(e)}")
        return None


# Function to get image data from an image file
def get_image_from_file(file_path: str) -> Optional[Dict]:
    """Get image data from an image file for vision model."""
    try:
        with open(file_path, "rb") as image_file:
            image_bytes = image_file.read()
            # Get file extension
            file_extension = os.path.splitext(file_path)[1].lower()[1:]  # Remove the dot
            # Encode to base64
            b64_img = base64.b64encode(image_bytes).decode('utf-8')
            return {"type": "image_url", "image_url": {"url": f"data:image/{file_extension};base64,{b64_img}"}}
    except Exception as e:
        print(f"Error getting image data: {str(e)}")
        return None


# Function to get image data for vision model
def get_image_data(file_path: str) -> Optional[Dict]:
    """Get the image data for the vision model."""
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension == '.pdf':
        return get_image_from_pdf(file_path)
    else:
        return get_image_from_file(file_path)


# Function to extract multiple expense items from text
def extract_expenses_from_text(file_text: str, receipt_id: str) -> Expenses:
    """Extract multiple expense items from receipt text."""
    # Directly use structured output with just the file text
    try:
        expenses = expense_extractor.invoke(file_text)
        
        # Ensure receipt_id is present
        if not expenses.receipt_id:
            expenses.receipt_id = receipt_id
            
        return expenses
    except Exception as e:
        print(f"Error in structured extraction: {str(e)}")
        
        # Fallback to manual extraction
        # Extract the common receipt information
        merchant = "Unknown"
        date = "2023-01-01"
        total = 0.0
        
        lines = file_text.split('\n')
        for line in lines:
            if "total" in line.lower() and "$" in line:
                try:
                    # Try to extract total amount
                    amount_part = line.split("$")[1].strip().split(" ")[0].replace(",", "")
                    total = float(amount_part)
                except:
                    pass
            
            if any(m in line.lower() for m in ["store", "restaurant", "shop", "market"]):
                merchant = line.strip()
                
            # Simple date extraction
            if "/" in line and len(line) < 20:  # Likely a date
                date = line.strip()
        
        # Create a basic single-item expense
        return Expenses(
            receipt_id=receipt_id,
            receipt_date=date,
            merchant=merchant,
            total_amount=total,
            items=[
                ExpenseItem(
                    date=date,
                    merchant=merchant,
                    amount=total,
                    currency="USD",
                    category="Miscellaneous",
                    description="General expense"
                )
            ]
        )


# Function to extract multiple expense items from image
def extract_expenses_from_image(image_data: Dict, receipt_id: str) -> Expenses:
    """Extract multiple expense items from receipt image."""
    # For vision models, we need to use a different approach since they don't support structured output directly
    system_prompt = """You are an expert expense receipt processor specializing in identifying multiple line items. 
    Extract ALL expense items from the receipt image provided.
    
    IMPORTANT: Many receipts contain multiple items/purchases. You must identify each item separately.
    
    Be precise and thorough in extracting dates, amounts, merchants, categories, and other details.
    """
    
    # Create the message with the image
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", [
            {"type": "text", "text": "Extract all expense items from this receipt. Format your response as JSON with this structure exactly:\n\n```json\n{\n  \"receipt_id\": \"string\",\n  \"receipt_date\": \"YYYY-MM-DD\",\n  \"merchant\": \"string\",\n  \"total_amount\": number,\n  \"items\": [\n    {\n      \"description\": \"string\",\n      \"amount\": number,\n      \"category\": \"string\",\n      \"date\": \"YYYY-MM-DD\",\n      \"merchant\": \"string\",\n      \"currency\": \"string\"\n    },\n    {...}\n  ]\n}\n```"},
            image_data
        ])
    ])
    
    # Extract expense data using vision model
    response = llm.invoke(prompt)
    expense_data_text = response.content
    
    # Try to extract JSON from the response
    try:
        # Look for JSON content between triple backticks
        import re
        import json
        
        # Find JSON pattern
        json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', expense_data_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find JSON without backticks
            json_match = re.search(r'(\{.*\})', expense_data_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = expense_data_text
        
        # Parse the JSON
        expenses_data = json.loads(json_str)
        
        # Ensure receipt_id is present
        if "receipt_id" not in expenses_data or not expenses_data["receipt_id"]:
            expenses_data["receipt_id"] = receipt_id
        
        # Convert to Expenses object
        return Expenses(**expenses_data)
        
    except Exception as e:
        print(f"Error parsing JSON from vision model: {str(e)}. Trying clean-up approach...")
        
        try:
            # Use text_llm to clean up and structure the response
            cleanup_prompt = ChatPromptTemplate.from_template(
                "Convert this receipt data extraction into valid JSON following this exact schema:\n\n"
                "```json\n"
                "{\n"
                '  "receipt_id": "string",\n'
                '  "receipt_date": "YYYY-MM-DD",\n'
                '  "merchant": "string",\n'
                '  "total_amount": number,\n'
                '  "items": [\n'
                '    {\n'
                '      "description": "string",\n'
                '      "amount": number,\n'
                '      "category": "string",\n'
                '      "date": "YYYY-MM-DD",\n'
                '      "merchant": "string",\n'
                '      "currency": "string"\n'
                '    }\n'
                '  ]\n'
                "}\n"
                "```\n\n"
                "Here's the data to convert:\n\n{text}"
            )
            
            parser = JsonOutputParser()
            cleanup_chain = cleanup_prompt | text_llm | parser
            
            # Clean up the response
            expenses_data = cleanup_chain.invoke({"text": expense_data_text})
            
            # Ensure receipt_id is present
            if "receipt_id" not in expenses_data or not expenses_data["receipt_id"]:
                expenses_data["receipt_id"] = receipt_id
            
            # Convert to Expenses object
            return Expenses(**expenses_data)
        except Exception as e:
            print(f"Error in cleanup approach: {str(e)}. Falling back to basic extraction.")
            
            # Create a basic receipt with minimal information
            total_amount = 0.0
            merchant = "Unknown"
            date = "2023-01-01"
            
            # Try to extract basic information from the text
            if "total" in expense_data_text.lower():
                total_parts = re.findall(r'total[:\s]+[$]?(\d+(?:\.\d+)?)', expense_data_text.lower())
                if total_parts:
                    try:
                        total_amount = float(total_parts[0])
                    except ValueError:
                        pass
            
            # Try to extract merchant
            merchant_match = re.search(r'merchant[:\s]+([^\n]+)', expense_data_text, re.IGNORECASE)
            if merchant_match:
                merchant = merchant_match.group(1).strip()
            
            # Try to extract date
            date_match = re.search(r'date[:\s]+([^\n]+)', expense_data_text, re.IGNORECASE)
            if date_match:
                date = date_match.group(1).strip()
            
            # Create basic Expenses object
            return Expenses(
                receipt_id=receipt_id,
                receipt_date=date,
                merchant=merchant,
                total_amount=total_amount,
                items=[
                    ExpenseItem(
                        date=date,
                        merchant=merchant,
                        amount=total_amount,
                        currency="USD",
                        category="Miscellaneous",
                        description="General expense"
                    )
                ]
            )

def fallback_single_item_extraction(text_data: str, receipt_id: str) -> Expenses:
    """Extract a single expense item when multi-item extraction fails."""
    # Try to extract basic information
    lines = text_data.strip().split('\n')
    
    # Initialize with defaults
    date = "2023-01-01"  # Default date
    merchant = "Unknown"
    amount = 0.0
    currency = "USD"
    description = "Unspecified expense"
    
    # Try to extract information from the text
    for line in lines:
        if "date:" in line.lower():
            date_part = line.split(":", 1)[1].strip()
            # Try to parse date
            date = date_part
        elif "merchant:" in line.lower() or "vendor:" in line.lower():
            merchant = line.split(":", 1)[1].strip()
        elif "amount:" in line.lower() or "total:" in line.lower():
            amount_str = line.split(":", 1)[1].strip().replace("$", "").replace(",", "")
            try:
                amount = float(amount_str)
            except ValueError:
                pass
        elif "currency:" in line.lower():
            currency = line.split(":", 1)[1].strip()
        elif "description:" in line.lower():
            description = line.split(":", 1)[1].strip()
    
    # Create a single item expense
    return Expenses(
        receipt_id=receipt_id,
        receipt_date=date,
        merchant=merchant,
        total_amount=amount,
        items=[
            ExpenseItem(
                date=date,
                merchant=merchant,
                amount=amount,
                currency=currency,
                category="Miscellaneous",
                description=description
            )
        ]
    )


# Define the langgraph workflow nodes
def process_next_file(state: AgentState) -> AgentState:
    """Process the next file or complete processing."""
    # Check if there are files to process
    files_to_process = [f for f in state["files"] if f not in state["processed_files"]]
    
    # If no files to process, mark processing as complete
    if not files_to_process:
        return {
            **state,
            "processing_complete": True
        }
    
    # Select the next file
    current_file = files_to_process[0]
    receipt_id = os.path.basename(current_file)
    print(f"Processing file: {current_file}")
    
    try:
        # Extract text using OCR
        file_text = extract_text_from_file(current_file)
        
        # Get the image data for the vision model if needed
        image_data = None
        if len(file_text.strip()) < 100:  # If OCR didn't get much text, use vision model
            image_data = get_image_data(current_file)
        
        # Extract expenses - either from image or text
        if image_data:
            expenses = extract_expenses_from_image(image_data, receipt_id)
        else:
            expenses = extract_expenses_from_text(file_text, receipt_id)
        
        # Update the state
        return {
            **state,
            "current_file": current_file,
            "extracted_expenses": state["extracted_expenses"] + [expenses],
            "processed_files": state["processed_files"] + [current_file]
        }
    except Exception as e:
        error_message = f"Error processing {current_file}: {str(e)}"
        print(error_message)
        return {
            **state,
            "current_file": current_file,
            "errors": state["errors"] + [error_message],
            "processed_files": state["processed_files"] + [current_file]
        }

def generate_report(state: AgentState) -> AgentState:
    """Generate a final report of all processed expenses."""
    all_expenses = state["extracted_expenses"]
    
    if not all_expenses:
        return {**state, "final_report": {"message": "No expense data was extracted."}}
    
    # Flatten all items into a single list for analysis
    all_items = []
    for expenses in all_expenses:
        for item in expenses.items:
            all_items.append({
                "date": item.date,
                "merchant": item.merchant,
                "amount": item.amount,
                "currency": item.currency,
                "category": item.category,
                "description": item.description,
                "receipt_id": expenses.receipt_id
            })
    
    # Convert to DataFrame for better analysis
    df = pd.DataFrame(all_items)
    
    # Basic statistics
    total_expenses = df["amount"].sum()
    avg_expense = df["amount"].mean()
    
    # Group by category
    category_totals = df.groupby("category")["amount"].sum().to_dict()
    
    # Group by merchant
    merchant_totals = df.groupby("merchant")["amount"].sum().to_dict()
    
    # Group by receipt
    receipt_totals = df.groupby("receipt_id")["amount"].sum().to_dict()
    
    # Create the final report
    final_report = {
        "total_expenses": total_expenses,
        "average_expense": avg_expense,
        "expenses_by_category": category_totals,
        "expenses_by_merchant": merchant_totals,
        "expenses_by_receipt": receipt_totals,
        "all_receipts": [exp.dict() for exp in all_expenses],  # Convert Pydantic models to dict
        "all_items": all_items,
        "processed_files": state["processed_files"],
        "errors": state["errors"]
    }
    
    return {**state, "final_report": final_report}


def router(state: AgentState):
    """Route to the next node based on the processing status."""
    if state["processing_complete"]:
        return "generate_report"
    else:
        return "process_next_file"

def create_expense_table(data):
    # Assuming your data is in a variable called 'data'
    # If it's in a string format, you'd need to parse it first:
    # data = json.loads(json_string)

    # Initialize an empty list to store flattened records
    flattened_data = []

    # Iterate through each receipt
    for receipt in data:
        receipt_id = receipt['receipt_id']
        receipt_date = receipt['receipt_date']
        merchant = receipt['merchant']
        total_amount = receipt['total_amount']
        
        # Iterate through each item in this receipt
        for item in receipt['items']:
            # Create a flattened record combining receipt and item data
            flat_record = {
                'receipt_id': receipt_id,
                'receipt_date': receipt_date,
                'merchant': merchant,
                'total_amount': total_amount,
                'item_date': item['date'],
                'item_merchant': item['merchant'],
                'item_amount': item['amount'],
                'currency': item['currency'],
                'category': item['category'],
                'description': item['description']
            }
            flattened_data.append(flat_record)

    # Create a DataFrame from the flattened data
    df = pd.DataFrame(flattened_data)

    return df