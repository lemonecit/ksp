import { useEffect, useState } from "react"
import { Card, Typography, Alert } from "antd"
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
            setError(null)
            const credential = resp?.credential
            const res = await axios.post(`${API_URL}/auth/google`, { credential })
            localStorage.setItem("admin_token", res.data.token)
            window.location.href = "/"
          } catch (e: any) {
            setError(e?.response?.data?.error || e.message || "Login failed")
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

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Card style={{ width: 420 }}>
        <Title level={3} style={{ marginTop: 0 }}>
          Admin Login
        </Title>
        <Paragraph>Sign in with Google to access the dashboard.</Paragraph>

        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

        <div id="g_id_signin" />
      </Card>
    </div>
  )
}
