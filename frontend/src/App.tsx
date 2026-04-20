import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ProtectedRoute } from "./components/ProtectedRoute"

import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Fields from "./pages/Fields"
import FieldDetail from "./pages/FieldDetail"
import FieldForm from "./pages/FieldForm"
import Agents from "./pages/Agents"

import { AppSidebar } from "./components/layout/app-sidebar"

import { SidebarProvider, SidebarTrigger } from "./components/ui/sidebar"
import { LayoutProvider } from "./context/layout-provider"

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background no-scrollbar overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden h-full w-full">
            <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-background px-4 md:px-8">
              <SidebarTrigger className="-ml-2 hover:bg-muted p-2 rounded-md transition-colors" />
            </header>
            <main className="flex-1 overflow-y-auto w-full p-4 md:p-8">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </LayoutProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          </ProtectedRoute>
        } />

        <Route path="/fields" element={
          <ProtectedRoute>
            <ProtectedLayout>
              <Fields />
            </ProtectedLayout>
          </ProtectedRoute>
        } />

        <Route path="/fields/new" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ProtectedLayout>
              <FieldForm />
            </ProtectedLayout>
          </ProtectedRoute>
        } />

        <Route path="/fields/:id" element={
          <ProtectedRoute>
            <ProtectedLayout>
              <FieldDetail />
            </ProtectedLayout>
          </ProtectedRoute>
        } />

        <Route path="/fields/:id/edit" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ProtectedLayout>
              <FieldForm />
            </ProtectedLayout>
          </ProtectedRoute>
        } />

        <Route path="/agents" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ProtectedLayout>
              <Agents />
            </ProtectedLayout>
          </ProtectedRoute>
        } />

        {/* Default route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
