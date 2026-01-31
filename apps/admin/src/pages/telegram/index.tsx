import { useEffect, useState } from "react"
import { Card, Table, Tag, Typography, Button, Space, Statistic, Row, Col, Switch, TimePicker, InputNumber, Input, message, Divider, Alert } from "antd"
import { SendOutlined, ReloadOutlined, SettingOutlined, RobotOutlined, ClockCircleOutlined } from "@ant-design/icons"
import axios from "axios"
import dayjs from "dayjs"

const { Title, Text } = Typography
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

export const TelegramPage = () => {
  const [posts, setPosts] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({
    scheduleEnabled: true,
    scheduleTimes: ["10:00", "20:00"],
    minDiscountPercent: 40,
    maxPostsPerDay: 10,
    postsToday: 0,
    channelId: "@KSPmivtzei"
  })
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [pendingAlerts, setPendingAlerts] = useState<any[]>([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [postsRes, settingsRes, alertsRes] = await Promise.all([
        axios.get(`${API_URL}/telegram/posts`).catch(() => ({ data: { posts: [] } })),
        axios.get(`${API_URL}/telegram/settings`).catch(() => ({ data: settings })),
        axios.get(`${API_URL}/alerts/pending`).catch(() => ({ data: [] }))
      ])
      
      setPosts(postsRes.data.posts || postsRes.data || [])
      setSettings(settingsRes.data || settings)
      setStats(postsRes.data.stats || {})
      setPendingAlerts(alertsRes.data || [])
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSaveSettings = async () => {
    try {
      await axios.post(`${API_URL}/telegram/settings`, settings)
      message.success("Settings saved!")
    } catch (error) {
      message.error("Failed to save settings")
    }
  }

  const handlePostNow = async (alert: any) => {
    try {
      await axios.post(`${API_URL}/telegram/post`, { alertId: alert.id })
      message.success("Posted to Telegram!")
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to post")
    }
  }

  const handlePostAllPending = async () => {
    try {
      await axios.post(`${API_URL}/telegram/post-pending`)
      message.success("Posting pending alerts...")
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to post")
    }
  }

  const postsColumns = [
    {
      title: "Product",
      dataIndex: "title",
      render: (title: string) => title?.substring(0, 40) + "...",
    },
    {
      title: "Price",
      key: "price",
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          {record.oldPrice && <Text delete type="secondary">₪{record.oldPrice}</Text>}
          <Text strong style={{ color: "#52c41a" }}>₪{record.newPrice}</Text>
        </Space>
      ),
    },
    {
      title: "Discount",
      dataIndex: "percentOff",
      render: (pct: number) => pct ? <Tag color="green">-{Math.round(pct)}%</Tag> : "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const colors: Record<string, string> = { sent: "green", failed: "red", scheduled: "blue" }
        return <Tag color={colors[status] || "default"}>{status?.toUpperCase()}</Tag>
      },
    },
    {
      title: "Posted",
      dataIndex: "createdAt",
      render: (date: string) => dayjs(date).format("DD/MM HH:mm"),
    },
  ]

  const pendingColumns = [
    {
      title: "Product",
      dataIndex: "productTitle",
      render: (title: string) => title?.substring(0, 30) + "...",
    },
    {
      title: "Price Drop",
      key: "price",
      render: (_: any, record: any) => (
        <span>₪{record.oldPrice} → ₪{record.newPrice}</span>
      ),
    },
    {
      title: "Discount",
      dataIndex: "percentChange",
      render: (pct: number) => {
        const meetsMin = pct >= settings.minDiscountPercent
        return (
          <Tag color={meetsMin ? "green" : "orange"}>
            -{Math.round(pct)}% {meetsMin ? "✓" : `(min ${settings.minDiscountPercent}%)`}
          </Tag>
        )
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          size="small"
          onClick={() => handlePostNow(record)}
          disabled={record.percentChange < settings.minDiscountPercent}
        >
          Post Now
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>📱 Telegram Bot</Title>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Posts Today"
              value={settings.postsToday || 0}
              suffix={`/ ${settings.maxPostsPerDay}`}
              prefix={<SendOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Posts"
              value={stats.totalPosts || posts.length}
              prefix={<RobotOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Alerts"
              value={pendingAlerts.filter(a => a.percentChange >= settings.minDiscountPercent).length}
              suffix={`(${pendingAlerts.length} total)`}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Min Discount"
              value={settings.minDiscountPercent}
              suffix="%"
              prefix="≥"
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Settings */}
      <Card title={<><SettingOutlined /> Bot Settings</>} style={{ marginBottom: 24 }}>
        <Row gutter={24}>
          <Col span={8}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Text strong>Channel</Text>
              <Input 
                value={settings.channelId} 
                onChange={(e) => setSettings({ ...settings, channelId: e.target.value })}
                placeholder="@YourChannel"
              />
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical">
              <Text strong>Minimum Discount to Post</Text>
              <InputNumber
                value={settings.minDiscountPercent}
                onChange={(val) => setSettings({ ...settings, minDiscountPercent: val })}
                min={0}
                max={90}
                formatter={(value) => `${value}%`}
                parser={(value) => value?.replace('%', '') as any}
              />
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical">
              <Text strong>Max Posts Per Day</Text>
              <InputNumber
                value={settings.maxPostsPerDay}
                onChange={(val) => setSettings({ ...settings, maxPostsPerDay: val })}
                min={1}
                max={50}
              />
            </Space>
          </Col>
        </Row>

        <Divider />

        <Row gutter={24} align="middle">
          <Col span={8}>
            <Space>
              <Switch 
                checked={settings.scheduleEnabled} 
                onChange={(val) => setSettings({ ...settings, scheduleEnabled: val })}
              />
              <Text strong>Scheduled Posting</Text>
            </Space>
          </Col>
          <Col span={16}>
            <Space>
              <ClockCircleOutlined />
              <Text>Post at:</Text>
              <Tag color="blue">10:00</Tag>
              <Tag color="blue">20:00</Tag>
              <Text type="secondary">(Israeli time)</Text>
            </Space>
          </Col>
        </Row>

        <Divider />

        <Button type="primary" onClick={handleSaveSettings}>
          Save Settings
        </Button>
      </Card>

      {/* Pending Alerts */}
      <Card 
        title="🔔 Pending Price Drops" 
        style={{ marginBottom: 24 }}
        extra={
          <Button 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={handlePostAllPending}
            disabled={pendingAlerts.filter(a => a.percentChange >= settings.minDiscountPercent).length === 0}
          >
            Post All Eligible
          </Button>
        }
      >
        {pendingAlerts.length === 0 ? (
          <Alert message="No pending alerts. Run the scraper to detect price drops!" type="info" />
        ) : (
          <Table 
            dataSource={pendingAlerts} 
            columns={pendingColumns} 
            rowKey="id" 
            pagination={false}
            size="small"
          />
        )}
      </Card>

      {/* Post Log */}
      <Card 
        title="📜 Post History" 
        extra={<Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>}
      >
        <Table 
          dataSource={posts} 
          columns={postsColumns} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}
