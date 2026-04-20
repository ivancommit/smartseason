import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import client from "../api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  
  const showForm = location.pathname.includes("/new")
  
  const [formData, setFormData] = useState({ name: "", email: "", password: "" })
  const [submitting, setSubmitting] = useState(false)

  const loadAgents = async () => {
    try {
      const { data } = await client.get("/api/v1/users")
      setAgents(data)
    } catch {
      console.error("Failed to load agents")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgents()
  }, [])

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this agent?")) return
    try {
      await client.delete(`/api/v1/users/${id}`)
      setAgents(agents.filter(a => a.id !== id))
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to delete agent.")
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await client.post("/api/v1/users", { ...formData, role: "agent" })
      setFormData({ name: "", email: "", password: "" })
      loadAgents()
      navigate("/agents")
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to create agent.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>Loading records...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Active Agents</h1>
        <Button onClick={() => navigate(showForm ? "/agents" : "/agents/new")}>
          {showForm ? "Cancel" : "New Agent"}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card p-6 rounded-xl border shadow w-full max-w-md">
          <h3 className="font-bold text-lg mb-4">Register Agent</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <Label>Email</Label>
              <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <Label>Password</Label>
              <Input required type="password" minLength={8} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Registering..." : "Register"}
            </Button>
          </form>
        </div>
      )}

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((ag) => (
              <TableRow key={ag.id}>
                <TableCell className="font-medium">{ag.name}</TableCell>
                <TableCell>{ag.email}</TableCell>
                <TableCell>{new Date(ag.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(ag.id)}>
                    Del
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {agents.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  No agents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
