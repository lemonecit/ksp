import { useEffect, useState } from "react"
import { Table, Tag, Card, Select, Space, Typography } from "antd"
import axios from "axios"

const { Title } = Typography
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

const STATUS_COLORS: Record<string, string> = {
  pending: "orange",
  confirmed: "green",
  rejected: "red",
}

const PLATFORM_ICONS: Record<string, string> = {
  telegram: "📱",
  site: "🌐",
  whatsapp: "💬",
  instagram: "📷",
  facebook: "👤",
}

export const TransactionList = () => {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()

  useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter) params.append("status", statusFilter)

    axios
      .get(`${API_URL}/revenue/transactions?${params}`)
      .then((res) => setTransactions(res.data))
      .finally(() => setLoading(false))
  }, [statusFilter])

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      render: (id: string) => <code>{id.substring(0, 8)}...</code>,
    },
    {
      title: "Product",
      dataIndex: ["product", "content", 0, "title"],
      render: (title: string) => title?.substring(0, 40) + "...",
    },
    {
      title: "Platform",
      dataIndex: "platform",
      render: (platform: string) => (
        <span>
          {PLATFORM_ICONS[platform]} {platform}
        </span>
      ),
    },
    {
      title: "Language",
      dataIndex: "language",
      render: (lang: string) => (lang === "he" ? "🇮🇱 Hebrew" : "🇬🇧 English"),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => <Tag color={STATUS_COLORS[status]}>{status.toUpperCase()}</Tag>,
    },
    {
      title: "Commission",
      dataIndex: "commission",
      render: (val: number | null) => (val ? `₪${val.toFixed(2)}` : "-"),
    },
    {
      title: "Clicked At",
      dataIndex: "clickedAt",
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ]

  return (
    <Card>
      <Space style={{ marginBottom: 16 }} size="large">
        <Title level={4} style={{ margin: 0 }}>
          💰 Revenue Transactions
        </Title>
        <Select
          placeholder="Filter by status"
          allowClear
          style={{ width: 150 }}
          onChange={setStatusFilter}
          options={[
            { value: "pending", label: "Pending" },
            { value: "confirmed", label: "Confirmed" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </Space>
      <Table dataSource={transactions} columns={columns} rowKey="id" loading={loading} />
    </Card>
  )
}
