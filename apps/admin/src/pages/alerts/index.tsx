import { useEffect, useState } from "react"
import { Table, Card, Tag, Typography, Button, Space, Popconfirm, message, Statistic, Row, Col } from "antd"
import { DeleteOutlined, ReloadOutlined, BellOutlined, SendOutlined } from "@ant-design/icons"
import axios from "axios"

const { Title } = Typography
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

export const AlertList = () => {
  const [alerts, setAlerts] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/alerts`)
      setAlerts(res.data.alerts || res.data || [])
      setStats(res.data.stats || {})
    } catch (error) {
      console.error("Failed to fetch alerts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/alerts/${id}`)
      message.success("Alert deleted")
      fetchAlerts()
    } catch (error) {
      message.error("Failed to delete alert")
    }
  }

  const handleMarkSent = async (id: string) => {
    try {
      await axios.post(`${API_URL}/alerts/${id}/mark-sent`)
      message.success("Alert marked as sent")
      fetchAlerts()
    } catch (error) {
      message.error("Failed to update alert")
    }
  }

  const columns = [
    {
      title: "Product",
      dataIndex: "productTitle",
      render: (title: string, record: any) => title || record.product?.content?.[0]?.title?.substring(0, 40) || "N/A",
    },
    {
      title: "Type",
      dataIndex: "type",
      render: (type: string) => {
        const icons: Record<string, string> = {
          price_drop: "📉",
          price_increase: "📈",
          back_in_stock: "📦",
        }
        return <span>{icons[type] || "🔔"} {type}</span>
      },
    },
    {
      title: "Price Change",
      key: "priceChange",
      render: (_: any, record: any) => {
        if (!record.oldPrice || !record.newPrice) return "-"
        const change = record.percentChange || Math.round((1 - record.newPrice / record.oldPrice) * 100)
        return (
          <Space direction="vertical" size={0}>
            <span>₪{record.oldPrice} → ₪{record.newPrice}</span>
            <Tag color={change > 0 ? "green" : "red"}>{change > 0 ? "-" : "+"}{Math.abs(change)}%</Tag>
          </Space>
        )
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const colors: Record<string, string> = {
          pending: "orange",
          sent: "green",
          expired: "gray",
        }
        return <Tag color={colors[status] || "default"}>{status?.toUpperCase()}</Tag>
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      render: (_: any, record: any) => (
        <Space>
          {record.status === "pending" && (
            <Button 
              icon={<SendOutlined />} 
              size="small"
              onClick={() => handleMarkSent(record.id)}
            >
              Mark Sent
            </Button>
          )}
          <Popconfirm title="Delete this alert?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} danger size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Pending Alerts" 
              value={stats.pending || 0} 
              prefix={<BellOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Sent Alerts" 
              value={stats.sent || 0} 
              prefix={<SendOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Total Price Drops" 
              value={stats.totalDrops || 0} 
              prefix="📉"
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>
            🔔 Price Alerts ({alerts.length})
          </Title>
          <Button icon={<ReloadOutlined />} onClick={fetchAlerts}>
            Refresh
          </Button>
        </Space>

        <Table dataSource={alerts} columns={columns} rowKey="id" loading={loading} />
      </Card>
    </div>
  )
}
