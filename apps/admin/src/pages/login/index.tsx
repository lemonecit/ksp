import { useEffect, useState } from "react"
import { Card, Typography, Alert, Input, Button, Space } from "antd"
import axios from "axios"

const { Title, Paragraph } = Typography

const API_URL = import.meta.env.VITE_API_URL || "/api"
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ""

declare global {
  interface Window {
    google?: any
  }
}

export const LoginPage = () => {
  const [error, setError] = useState<string | null>(null)
  const [pre2faToken, setPre2faToken] = useState<string | null>(null)
  const [twofaCode, setTwofaCode] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("admin_token")
    if (token) {
      window.location.href = "/"
      return
    }

    if (!GOOGLE_CLIENT_ID) {
      setError("Missing VITE_GOOGLE_CLIENT_ID")
      return
    }

    const init = () => {
      if (!window.google?.accounts?.id) {
        setError("Google Identity script not loaded")
        return
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp: any) => {
          try {
            setLoading(true)
            setError(null)
            const credential = resp?.credential
            const res = await axios.post(`${API_URL}/auth/google`, { credential })

            if (res.data?.requires2fa) {
              setPre2faToken(res.data.pre2faToken)
              return
            }

            localStorage.setItem("admin_token", res.data.token)
            window.location.href = "/"
          } catch (e: any) {
            setError(e?.response?.data?.error || e.message || "Login failed")
          } finally {
            setLoading(false)
          }
        },
      })

      window.google.accounts.id.renderButton(document.getElementById("g_id_signin"), {
        theme: "outline",
        size: "large",
        width: 320,
      })
    }

    init()
  }, [])

  const verify2fa = async () => {
    if (!pre2faToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API_URL}/auth/2fa/login`, {
        pre2faToken,
        code: twofaCode,
      })
      localStorage.setItem("admin_token", res.data.token)
      window.location.href = "/"
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || "2FA failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Card style={{ width: 420 }}>
        <Title level={3} style={{ marginTop: 0 }}>
          Admin Login
        </Title>
        <Paragraph>Sign in with Google to access the dashboard.</Paragraph>

        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

        {pre2faToken ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Alert
              type="info"
              message="2FA required"
              description="Enter the 6-digit code from Google Authenticator."
            />
            <Input
              value={twofaCode}
              onChange={(e) => setTwofaCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
            />
            <Button type="primary" onClick={verify2fa} loading={loading} disabled={!twofaCode}>
              Verify
            </Button>
          </Space>
        ) : (
          <div id="g_id_signin" />
        )}
      </Card>
    </div>
  )
}
