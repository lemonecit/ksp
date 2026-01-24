import { useEffect, useState } from "react"
import { Card, Typography, Alert, Button, Input, Space, Image, message } from "antd"
import axios from "axios"

const { Title, Paragraph, Text } = Typography

const API_URL = import.meta.env.VITE_API_URL || "/api"

export const SecurityPage = () => {
  const [loading, setLoading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSetup = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API_URL}/auth/2fa/setup`)
      if (res.data?.enabled) {
        setEnabled(true)
        setQrDataUrl(null)
        setOtpauthUrl(null)
      } else {
        setEnabled(false)
        setQrDataUrl(res.data?.qrDataUrl || null)
        setOtpauthUrl(res.data?.otpauthUrl || null)
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || "Failed to load 2FA setup")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSetup()
  }, [])

  const enable = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API_URL}/auth/2fa/enable`, { code })
      if (res.data?.enabled) {
        message.success("2FA enabled")
        setEnabled(true)
        setQrDataUrl(null)
        setOtpauthUrl(null)
      } else {
        message.success("Updated")
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || "Failed to enable 2FA")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <Title level={2}>Security</Title>
      <Card>
        <Title level={4} style={{ marginTop: 0 }}>
          Google Authenticator (2FA)
        </Title>
        <Paragraph>
          Enable 2FA to require a 6-digit code from Google Authenticator after signing in with Google.
        </Paragraph>

        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

        {enabled ? (
          <Alert type="success" message="2FA is enabled for your account." />
        ) : (
          <Space direction="vertical" style={{ width: "100%" }}>
            {qrDataUrl ? (
              <div>
                <Text strong>Step 1</Text>
                <Paragraph style={{ marginTop: 4 }}>
                  Scan this QR code with Google Authenticator.
                </Paragraph>
                <Image src={qrDataUrl} width={240} preview={false} />
                {otpauthUrl && (
                  <Paragraph style={{ marginTop: 8 }}>
                    <Text type="secondary">If you cant scan, use this URL:</Text>
                    <br />
                    <Text code style={{ wordBreak: "break-all" }}>{otpauthUrl}</Text>
                  </Paragraph>
                )}
              </div>
            ) : (
              <Alert type="info" message="Generating a new QR code..." />
            )}

            <div>
              <Text strong>Step 2</Text>
              <Paragraph style={{ marginTop: 4 }}>
                Enter the 6-digit code to confirm.
              </Paragraph>
              <Space.Compact style={{ width: 320 }}>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                />
                <Button type="primary" onClick={enable} loading={loading} disabled={!code}>
                  Enable
                </Button>
              </Space.Compact>
            </div>

            <Button onClick={fetchSetup} loading={loading}>
              Refresh
            </Button>
          </Space>
        )}
      </Card>
    </div>
  )
}
