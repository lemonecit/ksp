import { useEffect, useState } from "react"
import { Table, Card, Tag, Typography, Button, Space, Input, Select, Modal, Form, message } from "antd"
import { EditOutlined, TranslationOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons"
import axios from "axios"

const { Title, Text } = Typography
const { TextArea } = Input
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

export const ContentList = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<any>(null)
  const [form] = Form.useForm()
  const [langFilter, setLangFilter] = useState<string | undefined>()
  const [search, setSearch] = useState("")

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/products?limit=100`)
      setProducts(res.data.products || [])
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleEdit = (product: any, lang: string) => {
    const content = product.content?.find((c: any) => c.lang === lang) || {}
    form.setFieldsValue({
      productId: product.id,
      lang,
      title: content.title || "",
      description: content.description || "",
      slug: content.slug || "",
    })
    setEditModal({ product, lang, isNew: !content.id })
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await axios.post(`${API_URL}/content`, values)
      message.success("Content saved!")
      setEditModal(null)
      fetchProducts()
    } catch (error) {
      message.error("Failed to save content")
    }
  }

  const runTranslator = async () => {
    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/scraper/translate`)
      message.success(`Translated ${res.data.translated || 0} products to English`)
      fetchProducts()
    } catch (error) {
      message.error("Translation failed")
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((p) => {
    if (search) {
      const searchLower = search.toLowerCase()
      const hasMatch = p.content?.some(
        (c: any) => c.title?.toLowerCase().includes(searchLower)
      ) || p.sku?.toLowerCase().includes(searchLower)
      if (!hasMatch) return false
    }
    return true
  })

  const columns = [
    {
      title: "SKU",
      dataIndex: "sku",
      width: 100,
      render: (sku: string) => <code>{sku}</code>,
    },
    {
      title: "Hebrew Content",
      key: "he",
      render: (_: any, record: any) => {
        const heContent = record.content?.find((c: any) => c.lang === "he")
        return heContent ? (
          <Space direction="vertical" size={0}>
            <Text strong>{heContent.title?.substring(0, 40)}...</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              /{heContent.slug}
            </Text>
          </Space>
        ) : (
          <Tag color="red">Missing</Tag>
        )
      },
    },
    {
      title: "English Content",
      key: "en",
      render: (_: any, record: any) => {
        const enContent = record.content?.find((c: any) => c.lang === "en")
        return enContent ? (
          <Space direction="vertical" size={0}>
            <Text strong>{enContent.title?.substring(0, 40)}...</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              /{enContent.slug}
            </Text>
          </Space>
        ) : (
          <Tag color="orange">Needs Translation</Tag>
        )
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record, "he")}
          >
            HE
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record, "en")}
          >
            EN
          </Button>
        </Space>
      ),
    },
  ]

  const stats = {
    total: products.length,
    withHebrew: products.filter((p) => p.content?.some((c: any) => c.lang === "he")).length,
    withEnglish: products.filter((p) => p.content?.some((c: any) => c.lang === "en")).length,
    needsTranslation: products.filter(
      (p) => p.content?.some((c: any) => c.lang === "he") && !p.content?.some((c: any) => c.lang === "en")
    ).length,
  }

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
        <Title level={4} style={{ margin: 0 }}>
          📝 Content Management
        </Title>
        <Space>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
          <Button icon={<TranslationOutlined />} onClick={runTranslator} loading={loading}>
            Auto-Translate Missing
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchProducts}>
            Refresh
          </Button>
        </Space>
      </Space>

      {/* Stats */}
      <Space style={{ marginBottom: 16 }}>
        <Tag color="blue">Total: {stats.total}</Tag>
        <Tag color="green">Hebrew: {stats.withHebrew}</Tag>
        <Tag color="purple">English: {stats.withEnglish}</Tag>
        <Tag color="orange">Needs Translation: {stats.needsTranslation}</Tag>
      </Space>

      <Card>
        <Table
          dataSource={filteredProducts}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        title={`Edit ${editModal?.lang === "he" ? "Hebrew" : "English"} Content`}
        open={!!editModal}
        onOk={handleSave}
        onCancel={() => setEditModal(null)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="productId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="lang" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="URL Slug" rules={[{ required: true }]}>
            <Input addonBefore="/" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <TextArea rows={6} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
