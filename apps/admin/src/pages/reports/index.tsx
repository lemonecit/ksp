import { useState } from "react"
import { Card, Upload, Typography, message, Table, Alert, Statistic, Row, Col } from "antd"
import { InboxOutlined } from "@ant-design/icons"
import axios from "axios"

const { Dragger } = Upload
const { Title } = Typography
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

interface ImportResult {
  success: boolean
  summary: {
    totalRows: number
    matchedRows: number
    unmatchedRows: number
    totalRevenue: number
  }
}

export const ReportImport = () => {
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async (file: File) => {
    setLoading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await axios.post(`${API_URL}/reports/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setResult(response.data)
      message.success("Report imported successfully!")
    } catch (error) {
      message.error("Failed to import report")
    } finally {
      setLoading(false)
    }

    return false // Prevent default upload behavior
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>📤 Import KSP Reports</Title>

      <Alert
        message="How it works"
        description={
          <ul>
            <li>Download your monthly affiliate report from KSP</li>
            <li>Upload the Excel/CSV file here</li>
            <li>We'll match the UIN/Sub-ID column with our tracking IDs</li>
            <li>Confirmed sales will be updated with commission amounts</li>
          </ul>
        }
        type="info"
        style={{ marginBottom: 24 }}
      />

      <Card style={{ marginBottom: 24 }}>
        <Dragger
          name="file"
          accept=".xlsx,.xls,.csv"
          showUploadList={false}
          beforeUpload={handleUpload}
          disabled={loading}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag KSP report file to upload</p>
          <p className="ant-upload-hint">Supports: Excel (.xlsx, .xls) and CSV files</p>
        </Dragger>
      </Card>

      {result && (
        <Card title="📊 Import Results">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="Total Rows" value={result.summary.totalRows} />
            </Col>
            <Col span={6}>
              <Statistic
                title="Matched"
                value={result.summary.matchedRows}
                valueStyle={{ color: "#3f8600" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Unmatched"
                value={result.summary.unmatchedRows}
                valueStyle={{ color: "#cf1322" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Revenue Imported"
                value={result.summary.totalRevenue}
                prefix="₪"
                precision={2}
                valueStyle={{ color: "#1890ff" }}
              />
            </Col>
          </Row>
        </Card>
      )}
    </div>
  )
}
