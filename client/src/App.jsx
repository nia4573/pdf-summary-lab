import { useMemo, useRef, useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:8000/summarize-pdfs'

function parseSummary(summaryResult) {
  if (typeof summaryResult !== 'string') {
    return summaryResult
  }

  try {
    return JSON.parse(summaryResult)
  } catch {
    return { summary: summaryResult }
  }
}

function App() {
  const fileInputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  )

  function handleFileChange(event) {
    setFiles(Array.from(event.target.files))
    setResult(null)
    setError('')
  }

  function handleReset() {
    setFiles([])
    setResult(null)
    setError('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (files.length === 0) {
      setError('요약할 PDF 파일을 선택해 주세요.')
      return
    }

    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })

    setIsLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'PDF 요약 요청에 실패했습니다.')
      }

      setResult(data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="upload-panel">
        <div className="section-header">
          <p className="eyebrow">PDF Summary Lab</p>
          <h1>PDF 요약</h1>
        </div>

        <form className="upload-form" onSubmit={handleSubmit}>
          <label className="file-drop">
            <span className="file-drop-title">PDF 파일 선택</span>
            <span className="file-drop-subtitle">
              여러 개의 PDF를 한 번에 업로드할 수 있습니다.
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={handleFileChange}
            />
          </label>

          {files.length > 0 && (
            <div className="file-list">
              <div className="file-list-header">
                <strong>{files.length}개 파일</strong>
                <span>{(totalSize / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <ul>
                {files.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`}>
                    <span>{file.name}</span>
                    <small>{(file.size / 1024).toFixed(1)} KB</small>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="error-message">{error}</p>}

          <div className="form-actions">
            <button
              className="submit-button"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? '요약 중...' : '요약하기'}
            </button>

            {(files.length > 0 || result || error) && (
              <button
                className="reset-button"
                type="button"
                onClick={handleReset}
                disabled={isLoading}
              >
                다른 파일 요약하기
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="result-panel">
        <div className="section-header">
          <p className="eyebrow">Result</p>
          <h2>요약 결과</h2>
        </div>

        {!result && (
          <p className="empty-state">
            PDF를 업로드하면 파일별 요약 결과가 여기에 표시됩니다.
          </p>
        )}

        {result?.summaries?.map((item) => {
          const summary = parseSummary(item.summary_result)

          return (
            <article className="summary-card" key={item.filename}>
              <h3>{summary.title || item.filename}</h3>
              <p>{summary.summary}</p>
              {Array.isArray(summary.key_points) && (
                <ul>
                  {summary.key_points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
            </article>
          )
        })}
      </section>
    </main>
  )
}

export default App
