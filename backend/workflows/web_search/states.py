from pydantic import Field, BaseModel, field_validator
from typing import List, TypedDict, Dict, Any, Optional

class SearchQuery(BaseModel):
    query: str = Field(None, description="The search query to be executed optimized for web search, when the user asks for something current, do include the date in the search query")
    justification: str = Field(None, description="The justification for the search query")

class Research(BaseModel):
    topics: str = Field(None, description="The main topic to research")
    subtopics: List[str] = Field(None, description="The subtopics to research about the main topic")
    search_queries: List[SearchQuery] = Field(None, description="The search queries to be executed optimized for web search")

class Section(BaseModel):
    title: str = Field(None, description="The section title")
    context: List[str] = Field(
        default_factory=list,
        description="The retrieved web search results of the section to be used as context",
    )
    text: str = Field("", description="The generated text of the section")

    @field_validator("context", mode="before")
    @classmethod
    def ensure_list(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                v = v[1:-1]
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("text", mode="before")
    @classmethod
    def ensure_text(cls, v):
        return v or ""

class Sections(BaseModel):
    sections: List[Section] = Field(
        default_factory=list,
        description="The sections of the generated text",
    )

    @field_validator("sections", mode="before")
    @classmethod
    def ensure_sections(cls, v):
        return v or []

class SourceMetadata(BaseModel):
    url: str = Field(None, description="The URL source of the text")
    subtopic: str = Field(None, description="The subtopic this text is related to")

class Researcher(TypedDict):
    input: str
    final_output: str
    evaluation: Optional[str]
    research_plan: Research = None
    context_data: dict = None
    sections: Sections = None
    section_idx: int = 0
    generated_sections: dict = None  # Store your generated sections
    sources: List[Dict[str, Any]] = None  # Store metadata about sources for citation
