import { useEffect, useState } from "react"
import { Card, Row, Col, Statistic, Typography, Table, Spin } from "antd"
import { ArrowUpOutlined, ShoppingCartOutlined, DollarOutlined, UserOutlined } from "@ant-design/icons"
import axios from "axios"

const { Title } = Typography
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

interface DashboardStats {
  totalProducts: number
  totalClicks: number
  pendingRevenue: number
  confirmedRevenue: number
  recentTransactions: any[]
}

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsRes, revenueRes] = await Promise.all([
          axios.get(`${API_URL}/products?limit=1`),
          axios.get(`${API_URL}/revenue/stats`),
        ])

        setStats({
          totalProducts: productsRes.data.pagination?.total || 0,
          totalClicks: revenueRes.data.totalClicks || 0,
          pendingRevenue: revenueRes.data.pendingRevenue || 0,
          confirmedRevenue: revenueRes.data.confirmedRevenue || 0,
          recentTransactions: revenueRes.data.recentTransactions || [],
        })
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error)
        setStats({
          totalProducts: 0,
          totalClicks: 0,
          pendingRevenue: 0,
          confirmedRevenue: 0,
          recentTransactions: [],
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>📊 KSP Admin Dashboard</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Products"
              value={stats?.totalProducts}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Clicks"
              value={stats?.totalClicks}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Revenue"
              value={stats?.pendingRevenue}
              prefix="₪"
              precision={2}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Confirmed Revenue"
              value={stats?.confirmedRevenue}
              prefix="₪"
              precision={2}
              suffix={<ArrowUpOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="💰 Recent Transactions">
        <Table
          dataSource={stats?.recentTransactions || []}
          rowKey="id"
          pagination={false}
          columns={[
            {
              title: "Product",
              dataIndex: ["product", "content", 0, "title"],
              render: (title: string) => title?.substring(0, 30) + "..." || "N/A",
            },
            {
              title: "Platform",
              dataIndex: "platform",
            },
            {
              title: "Status",
              dataIndex: "status",
            },
            {
              title: "Date",
              dataIndex: "clickedAt",
              render: (date: string) => new Date(date).toLocaleDateString(),
            },
          ]}
        />
      </Card>
    </div>
  )
}
