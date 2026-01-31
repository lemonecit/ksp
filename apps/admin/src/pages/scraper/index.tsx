import { useState } from "react"
import { Card, Button, Typography, Space, Alert, Spin, message, Input, Divider } from "antd"
import { PlayCircleOutlined, SyncOutlined, TranslationOutlined } from "@ant-design/icons"
import axios from "axios"

const { Title, Paragraph } = Typography
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

export const ScraperControl = () => {
  const [scraping, setScraping] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [url, setUrl] = useState("")

  const runScraper = async () => {
    setScraping(true)
    setResult(null)
    try {
      const res = await axios.post(`${API_URL}/scraper/run`)
      setResult(res.data)
      message.success("Scraper completed successfully!")
    } catch (error: any) {
      message.error(error.response?.data?.message || "Scraper failed")
    } finally {
      setScraping(false)
    }
  }

  const runTranslator = async () => {
    setTranslating(true)
    try {
      const res = await axios.post(`${API_URL}/scraper/translate`)
      message.success(`Translated ${res.data.translated} products`)
    } catch (error: any) {
      message.error(error.response?.data?.message || "Translation failed")
    } finally {
      setTranslating(false)
    }
  }

  const scrapeSingleUrl = async () => {
    if (!url.trim()) {
      message.warning("Please enter a URL")
      return
    }
    setScraping(true)
    try {
      const res = await axios.post(`${API_URL}/scraper/single`, { url })
      setResult(res.data)
      message.success("Product scraped successfully!")
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to scrape URL")
    } finally {
      setScraping(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>🕷️ Scraper Control</Title>

      <Alert
        message="Scraper Information"
        description={
          <ul>
            <li>The scraper runs automatically every 6 hours via cron job</li>
            <li>It fetches deals from KSP's hot deals page</li>
            <li>New products are added, existing ones are updated with new prices</li>
            <li>Price history is tracked for each product</li>
          </ul>
        }
        type="info"
        style={{ marginBottom: 24 }}
      />

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card title="🔄 Full Scrape">
          <Paragraph>Run a full scrape of all KSP hot deals. This may take a few minutes.</Paragraph>
          <Button
            type="primary"
            icon={scraping ? <SyncOutlined spin /> : <PlayCircleOutlined />}
            onClick={runScraper}
            disabled={scraping}
            size="large"
          >
            {scraping ? "Scraping..." : "Run Full Scraper"}
          </Button>
        </Card>

        <Card title="🔗 Scrape Single URL">
          <Paragraph>Scrape a specific KSP product page by URL.</Paragraph>
          <Space.Compact style={{ width: "100%", maxWidth: 600 }}>
            <Input
              placeholder="https://ksp.co.il/web/item/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={scraping}
            />
            <Button type="primary" onClick={scrapeSingleUrl} disabled={scraping}>
              Scrape
            </Button>
          </Space.Compact>
        </Card>

        <Card title="🌐 Translation">
          <Paragraph>
            Translate Hebrew product content to English using AI. Only products without English content will be
            translated.
          </Paragraph>
          <Button
            icon={translating ? <SyncOutlined spin /> : <TranslationOutlined />}
            onClick={runTranslator}
            disabled={translating}
            size="large"
          >
            {translating ? "Translating..." : "Run Translator"}
          </Button>
        </Card>

        {result && (
          <Card title="📊 Last Result">
            <pre style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, overflow: "auto" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </Card>
        )}
      </Space>
    </div>
  )
}
