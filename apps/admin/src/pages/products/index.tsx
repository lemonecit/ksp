import { useEffect, useState } from "react"
import { Table, Card, Input, Select, Space, Typography, Tag, Image, Button, Tooltip, message } from "antd"
import { SearchOutlined, ReloadOutlined, LinkOutlined, CopyOutlined } from "@ant-design/icons"
import axios from "axios"

const { Title, Text } = Typography
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"
const API_BASE = API_URL.replace('/api', '')
const KSP_AFFILIATE_ID = "14887"

// Generate affiliate links
const generateAffiliateLink = (sku: string) => `https://ksp.co.il/web/item/${sku}?appkey=${KSP_AFFILIATE_ID}`
const generateTrackedLink = (productId: string, platform = "site", lang = "he") => 
  `${API_BASE}/go/${productId}?channel=${platform}&lang=${lang}`

export const ProductList = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string | undefined>()
  const [categories, setCategories] = useState<string[]>([])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (category) params.append("category", category)

      const res = await axios.get(`${API_URL}/products?${params}`)
      setProducts(res.data.products || [])
      setPagination((prev) => ({ ...prev, total: res.data.pagination?.total || 0 }))
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [pagination.page, category])

  useEffect(() => {
    // Fetch unique categories
    axios.get(`${API_URL}/products?limit=100`).then((res) => {
      const cats = [...new Set(res.data.products?.map((p: any) => p.category).filter(Boolean))]
      setCategories(cats as string[])
    })
  }, [])

  const columns = [
    {
      title: "Image",
      dataIndex: "imageUrl",
      width: 80,
      render: (url: string) => <Image src={url} width={60} fallback="/placeholder.png" />,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      width: 80,
      render: (sku: string) => <code>{sku}</code>,
    },
    {
      title: "Title",
      dataIndex: ["content", 0, "title"],
      render: (title: string) => title?.substring(0, 40) || "No content",
    },
    {
      title: "Category",
      dataIndex: "category",
      width: 120,
      render: (cat: string) => <Tag color="blue">{cat || "?"}</Tag>,
    },
    {
      title: "Price",
      dataIndex: "priceCurrent",
      width: 100,
      render: (price: number) => (price ? <Text strong>₪{price.toLocaleString()}</Text> : "-"),
      sorter: (a: any, b: any) => (a.priceCurrent || 0) - (b.priceCurrent || 0),
    },
    {
      title: "Affiliate Links",
      key: "affiliate",
      width: 200,
      render: (_: any, record: any) => {
        const directLink = generateAffiliateLink(record.sku)
        const trackedLink = generateTrackedLink(record.id)
        
        const copyToClipboard = (text: string, type: string) => {
          navigator.clipboard.writeText(text)
          message.success(`${type} link copied!`)
        }
        
        return (
          <Space direction="vertical" size={2}>
            <Tooltip title={directLink}>
              <Button 
                size="small" 
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(directLink, "Direct")}
              >
                Direct Link
              </Button>
            </Tooltip>
            <Tooltip title={trackedLink}>
              <Button 
                size="small" 
                type="primary"
                icon={<LinkOutlined />}
                onClick={() => copyToClipboard(trackedLink, "Tracked")}
              >
                Tracked Link
              </Button>
            </Tooltip>
          </Space>
        )
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: any, record: any) => (
        <Button
          size="small"
          icon={<LinkOutlined />}
          onClick={() => window.open(record.kspUrl, "_blank")}
        >
          KSP
        </Button>
      ),
    },
  ]

  return (
    <Card>
      <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
        <Title level={4} style={{ margin: 0 }}>
          📦 Products ({pagination.total})
        </Title>
        <Space>
          <Select
            placeholder="Category"
            allowClear
            style={{ width: 200 }}
            onChange={setCategory}
            options={categories.map((c) => ({ value: c, label: c }))}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchProducts}>
            Refresh
          </Button>
        </Space>
      </Space>

      <Table
        dataSource={products}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          onChange: (page) => setPagination((prev) => ({ ...prev, page })),
          showSizeChanger: false,
        }}
      />
    </Card>
  )
}
