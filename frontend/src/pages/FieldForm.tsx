import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import client from "../api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function FieldForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [agents, setAgents] = useState<any[]>([])

  const [formData, setFormData] = useState({
    name: "",
    crop_type: "",
    planting_date: "",
    stage: "planted",
    location: "",
    assigned_agent_id: ""
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const agRes = await client.get("/api/v1/users")
        setAgents(agRes.data)

        if (isEdit) {
          const fieldRes = await client.get(`/api/v1/fields/${id}`)
          setFormData({
            name: fieldRes.data.name,
            crop_type: fieldRes.data.crop_type,
            planting_date: fieldRes.data.planting_date,
            stage: fieldRes.data.stage,
            location: fieldRes.data.location || "",
            assigned_agent_id: fieldRes.data.assigned_agent?.id || ""
          })
        }
      } catch (e) {
        console.error("Failed to load form dependencies.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload: any = { ...formData }
      if (!payload.assigned_agent_id) payload.assigned_agent_id = null

      if (isEdit) {
        await client.put(`/api/v1/fields/${id}`, payload)
        navigate(`/fields/${id}`)
      } else {
        await client.post("/api/v1/fields", payload)
        navigate(`/fields`)
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save field.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">{isEdit ? "Edit Field" : "Register New Field"}</h1>
      
      <div className="bg-card p-6 rounded-xl border shadow">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Crop Type</Label>
              <Input required value={formData.crop_type} onChange={e => setFormData({...formData, crop_type: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Planting Date</Label>
              <Input required type="date" value={formData.planting_date} onChange={e => setFormData({...formData, planting_date: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select 
                disabled={!isEdit} // locked on create to planted anyway, but API enforces it. UI lock is friendlier.
                value={formData.stage} 
                onValueChange={(val) => setFormData({...formData, stage: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planted">Planted</SelectItem>
                  <SelectItem value="growing">Growing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="harvested">Harvested</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned Agent</Label>
              <Select 
                value={formData.assigned_agent_id} 
                onValueChange={(val) => setFormData({...formData, assigned_agent_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {agents.map(ag => (
                    <SelectItem key={ag.id} value={ag.id}>{ag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
          </div>

          <div className="pt-4 flex gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : (isEdit ? "Update Field" : "Create Field")}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
