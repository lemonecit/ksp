import { Refine } from "@refinedev/core"
import { ThemedLayoutV2, useNotificationProvider, ErrorComponent } from "@refinedev/antd"
import routerBindings, { UnsavedChangesNotifier } from "@refinedev/react-router-v6"
import dataProvider from "@refinedev/simple-rest"
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom"
import { ConfigProvider, App as AntdApp } from "antd"
import "@refinedev/antd/dist/reset.css"
import axios from "axios"

import { DashboardPage } from "./pages/dashboard"
import { ProductList } from "./pages/products"
import { TransactionList } from "./pages/transactions"
import { ReportImport } from "./pages/reports"
import { AlertList } from "./pages/alerts"
import { ScraperControl } from "./pages/scraper"
import { ContentList } from "./pages/content"
import { TelegramPage } from "./pages/telegram"
import { LoginPage } from "./pages/login"
import { SecurityPage } from "./pages/security"

const API_URL = import.meta.env.VITE_API_URL || "/api"

const token = () => localStorage.getItem('admin_token')

const RequireAuth = () => {
  if (!token()) return <Navigate to="/login" replace />
  return <Outlet />
}

axios.interceptors.request.use((config) => {
  const t = token()
  if (t) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${t}`
  }
  return config
})

function App() {
  return (
    <BrowserRouter>
      <ConfigProvider>
        <AntdApp>
          <Refine
            dataProvider={dataProvider(API_URL)}
            routerProvider={routerBindings}
            notificationProvider={useNotificationProvider}
            resources={[
              {
                name: "dashboard",
                list: "/",
                meta: { label: "📊 Dashboard" },
              },
              {
                name: "products",
                list: "/products",
                meta: { label: "📦 Products" },
              },
              {
                name: "content",
                list: "/content",
                meta: { label: "📝 Content" },
              },
              {
                name: "transactions",
                list: "/transactions",
                meta: { label: "💰 Transactions" },
              },
              {
                name: "reports",
                list: "/reports",
                meta: { label: "📤 Import Reports" },
              },
              {
                name: "alerts",
                list: "/alerts",
                meta: { label: "🔔 Price Alerts" },
              },
              {
                name: "scraper",
                list: "/scraper",
                meta: { label: "🕷️ Scraper" },
              },              {
                name: "telegram",
                list: "/telegram",
                meta: { label: "📱 Telegram" },
              },
              {
                name: "security",
                list: "/security",
                meta: { label: "🔐 Security" },
              },            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={<RequireAuth />}
              >
                <Route
                  element={
                    <ThemedLayoutV2>
                      <Outlet />
                    </ThemedLayoutV2>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="/products" element={<ProductList />} />
                  <Route path="/content" element={<ContentList />} />
                  <Route path="/transactions" element={<TransactionList />} />
                  <Route path="/reports" element={<ReportImport />} />
                  <Route path="/alerts" element={<AlertList />} />
                  <Route path="/scraper" element={<ScraperControl />} />
                  <Route path="/telegram" element={<TelegramPage />} />
                  <Route path="/security" element={<SecurityPage />} />
                  <Route path="*" element={<ErrorComponent />} />
                </Route>
              </Route>
            </Routes>
            <UnsavedChangesNotifier />
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  )
}

export default App
