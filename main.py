from fastapi import FastAPI, File, HTTPException, UploadFile
from langchain_community.document_loaders import PyPDFLoader
from typing import Annotated
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from openai import OpenAIError, RateLimitError
import os
import tempfile

load_dotenv()

app= FastAPI()
app.openapi_version = "3.0.3"
llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0)

@app.get("/")
def home():
    return {"message": "PDF Summary Lab"}

@app.post("/summarize-pdfs")
async def summarize_pdfs(
     files: Annotated[list[UploadFile], File(description="Upload one or more PDF files")],
) :
    summaries = []

    for file in files:
        suffix = os.path.splitext(file.filename or "")[1] or ".pdf"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        try:
            loader = PyPDFLoader(temp_path)
            pages = loader.load()
            text = "\n\n".join(page.page_content for page in pages)

            prompt = f"""
            다음 PDF 내용을 한국어로 요약해줘.
            JSON 형식으로만 답해.

            형식:
            {{
            "title": "문서 제목 또는 추정 제목",
            "summary": "핵심 요약",
            "key_points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]
            }}

            PDF 내용:
            {text[:12000]}
            """

            try:
                response = llm.invoke(prompt)
            except RateLimitError as exc:
                raise HTTPException(
                    status_code=429,
                    detail=(
                        "OpenAI API quota exceeded. Check your OpenAI billing, "
                        "credits, or usage limits."
                    ),
                ) from exc
            except OpenAIError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"OpenAI API request failed: {exc}",
                ) from exc

            summaries.append(
                {
                    "filename": file.filename,
                    "summary_result": response.content,
                }
            )

        finally:
            os.remove(temp_path)

    result = {
        "total_files": len(files),
        "summaries": summaries,
    }

    return result
